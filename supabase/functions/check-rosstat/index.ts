/**
 * Edge Function: check-rosstat
 * Получает бухгалтерскую отчётность с bo.nalog.ru (ФНС)
 * API: https://bo.nalog.ru — бесплатно, официально
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RosstatRequest {
  inn: string;
}

interface Report {
  year: number;
  period: string;
  assets: number | null;
  liabilities: number | null;
  capital: number | null;
  revenue: number | null;
  profit: number | null;
  expenses: number | null;
  receivables: number | null;
  payables: number | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inn } = (await req.json()) as RosstatRequest;

    if (!inn || (inn.length !== 10 && inn.length !== 12)) {
      return new Response(
        JSON.stringify({ error: 'ИНН должен содержать 10 (ЮЛ) или 12 (физлицо/ИП) цифр' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Шаг 1: Поиск организации по ИНН
    let searchRes: Response;
    try {
      searchRes = await fetch(`https://bo.nalog.ru/nbo/organizations/?inn=${inn}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    } catch (networkError) {
      console.error('bo.nalog.ru search network error:', networkError);
      return new Response(
        JSON.stringify({ error: 'Сервис ФНС недоступен из текущей сети. Используйте сервер в РФ.', success: false }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!searchRes.ok) {
      const errorText = await searchRes.text().catch(() => '');
      console.error('bo.nalog.ru search failed:', searchRes.status, errorText.slice(0, 200));
      throw new Error(`bo.nalog.ru search failed: ${searchRes.status}`);
    }

    const searchText = await searchRes.text();
    let searchData: any;
    try {
      searchData = JSON.parse(searchText);
    } catch (e) {
      console.error('bo.nalog.ru search non-JSON:', searchText.slice(0, 200));
      throw new Error('bo.nalog.ru вернул неожиданный формат ответа');
    }

    if (!searchData.data || searchData.data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Организация не найдена в бухгалтерской базе' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const org = searchData.data[0];
    const orgId = org.id;

    // Шаг 2: Получение бухгалтерских данных (БФО)
    let reportsRes: Response;
    try {
      reportsRes = await fetch(`https://bo.nalog.ru/nbo/organizations/${orgId}/bfo/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    } catch (networkError) {
      console.error('bo.nalog.ru reports network error:', networkError);
      return new Response(
        JSON.stringify({ error: 'Сервис ФНС недоступен из текущей сети. Используйте сервер в РФ.', success: false }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reportsRes.ok) {
      const errorText = await reportsRes.text().catch(() => '');
      console.error('bo.nalog.ru reports failed:', reportsRes.status, errorText.slice(0, 200));
      throw new Error(`bo.nalog.ru reports failed: ${reportsRes.status}`);
    }

    const reportsText = await reportsRes.text();
    let reportsData: any;
    try {
      reportsData = JSON.parse(reportsText);
    } catch (e) {
      console.error('bo.nalog.ru reports non-JSON:', reportsText.slice(0, 200));
      throw new Error('bo.nalog.ru вернул неожиданный формат ответа');
    }

    // Парсим отчёты — извлекаем ключевые показатели
    const rawReports = Array.isArray(reportsData.data) ? reportsData.data : [];
    const reports: Report[] = rawReports.map((report: any) => ({
      year: report.year,
      period: report.period || 'годовой',
      assets: getIndicator(report, '1600'),      // Активы (итого)
      liabilities: getIndicator(report, '1700'), // Обязательства (итого)
      capital: getIndicator(report, '1300'),     // Капитал и резервы
      revenue: getIndicator(report, '2110'),     // Выручка
      profit: getIndicator(report, '2400'),      // Чистая прибыль
      expenses: getIndicator(report, '2120'),    // Себестоимость
      receivables: getIndicator(report, '1230'), // Дебиторская задолженность
      payables: getIndicator(report, '1520'),    // Кредиторская задолженность
    }));

    return new Response(
      JSON.stringify({
        success: true,
        company: {
          name: org.name,
          inn: org.inn,
          ogrn: org.ogrn,
        },
        reports: reports.sort((a, b) => b.year - a.year),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('check-rosstat error:', error);
    return new Response(
      JSON.stringify({ error: String(error), success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getIndicator(report: any, code: string): number | null {
  const indicator = report.indicators?.find((i: any) => i.code === code);
  return indicator ? parseFloat(indicator.value) : null;
}
