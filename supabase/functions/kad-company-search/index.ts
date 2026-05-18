/**
 * Edge Function: kad-company-search
 * Поиск арбитражных дел по ИНН или названию компании
 * Источник: kad.arbitr.ru (расширенный поиск)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KadCompanyRequest {
  inn?: string;
  companyName?: string;
  role?: 'all' | 'plaintiff' | 'defendant' | 'third_party';
  page?: number;
}

interface KadCase {
  number: string;
  court: string;
  judge: string;
  plaintiff: string;
  defendant: string;
  category: string;
  date: string;
  status: string;
  sum: string;
  url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inn, companyName, role = 'all', page = 1 } = (await req.json()) as KadCompanyRequest;

    if (!inn && !companyName) {
      return new Response(
        JSON.stringify({ error: 'Укажите ИНН или название компании' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = inn || companyName || '';

    // Используем тот же endpoint, что и search-kad
    const searchUrl = 'https://kad.arbitr.ru/Kad/SearchInstances';

    const searchPayload = {
      Page: page,
      Count: 25,
      IsKad: true,
      Participants: [{ Name: searchQuery, Type: -1 }],
    };

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://kad.arbitr.ru/',
      },
      body: JSON.stringify(searchPayload),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'КАД временно недоступен',
          cases: [],
          stats: null,
          total: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const items = data.Items || [];

    const cases: KadCase[] = items.map((item: any) => ({
      number: item.CaseNumber || '',
      court: item.Court || '',
      judge: item.Judge || '',
      plaintiff: item.Plaintiff || '',
      defendant: item.Defendant || '',
      category: item.CaseType || '',
      date: item.Date || '',
      status: item.Status || '',
      sum: item.ClaimSum || '',
      url: `https://kad.arbitr.ru/Card/${item.CaseId}`,
    }));

    // Считаем статистику
    const stats = calculateStats(cases, searchQuery);

    return new Response(
      JSON.stringify({
        cases,
        stats,
        total: data.TotalCount || cases.length,
        page,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('kad-company-search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Ошибка при поиске',
        cases: [],
        stats: null,
        total: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateStats(cases: KadCase[], query: string) {
  let asPlaintiff = 0;
  let asDefendant = 0;
  let asThirdParty = 0;
  let totalSum = 0;
  const opponents = new Map<string, { count: number; sum: number }>();
  const judges = new Map<string, { count: number; satisfied: number; denied: number }>();
  const categories = new Map<string, number>();
  const years = new Map<string, number>();

  for (const c of cases) {
    const q = query.toLowerCase();
    const isPlaintiff = c.plaintiff?.toLowerCase().includes(q);
    const isDefendant = c.defendant?.toLowerCase().includes(q);

    if (isPlaintiff) asPlaintiff++;
    if (isDefendant) asDefendant++;
    if (!isPlaintiff && !isDefendant) asThirdParty++;

    // Сумма
    const sumMatch = c.sum?.replace(/\s/g, '').replace(/,/g, '.').match(/[\d.]+/);
    if (sumMatch) {
      totalSum += parseFloat(sumMatch[0]);
    }

    // Оппоненты
    const opponent = isPlaintiff ? c.defendant : c.plaintiff;
    if (opponent) {
      const existing = opponents.get(opponent) || { count: 0, sum: 0 };
      existing.count++;
      if (sumMatch) existing.sum += parseFloat(sumMatch[0]);
      opponents.set(opponent, existing);
    }

    // Судьи (упрощённо)
    if (c.judge) {
      const j = judges.get(c.judge) || { count: 0, satisfied: 0, denied: 0 };
      j.count++;
      // Статус для примера
      if (c.status?.toLowerCase().includes('удовлетвор')) j.satisfied++;
      if (c.status?.toLowerCase().includes('отказ')) j.denied++;
      judges.set(c.judge, j);
    }

    // Категории
    if (c.category) {
      categories.set(c.category, (categories.get(c.category) || 0) + 1);
    }

    // Годы
    if (c.date) {
      const year = c.date.split('.').pop()?.substring(0, 4) || '';
      if (year) years.set(year, (years.get(year) || 0) + 1);
    }
  }

  return {
    totalCases: cases.length,
    asPlaintiff,
    asDefendant,
    asThirdParty,
    totalSum: Math.round(totalSum),
    topOpponents: Array.from(opponents.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data })),
    topJudges: Array.from(judges.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data })),
    categories: Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    years: Array.from(years.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count })),
  };
}
