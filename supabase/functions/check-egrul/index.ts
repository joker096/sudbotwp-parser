/**
 * Edge Function: check-egrul
 * Проверка компании/ИП по ЕГРЮЛ/ЕГРИП через ФНС
 * API: egrul.nalog.ru
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EgrulRequest {
  inn: string;
}

interface EgrulCompanyData {
  inn: string;
  ogrn: string;
  name: string;
  fullName: string;
  address: string;
  director: string;
  founder: string;
  capital: string;
  okved: string;
  okpo: string;
  oktmo: string;
  status: string;
  regDate: string;
  kpp: string;
  ogrnDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inn } = (await req.json()) as EgrulRequest;

    if (!inn || (inn.length !== 10 && inn.length !== 12)) {
      return new Response(
        JSON.stringify({ error: 'ИНН должен содержать 10 (ЮЛ) или 12 (физлицо/ИП) цифр' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Шаг 1: Получаем токен
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch('https://egrul.nalog.ru/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({ query: inn }),
      });
    } catch (networkError) {
      console.error('Token request network error:', networkError);
      return new Response(
        JSON.stringify({ error: 'Сервис ФНС недоступен из текущей сети. Используйте сервер в РФ.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => '');
      console.error('Token request failed:', tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Сервис ФНС временно недоступен. Попробуйте позже.', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Парсим токен из ответа (обычно в cookies или body)
    const setCookie = tokenResponse.headers.get('set-cookie');
    let token = '';
    
    if (setCookie) {
      const match = setCookie.match(/token=([^;]+)/);
      if (match) token = match[1];
    }

    // Альтернативно: получаем токен из тела ответа
    if (!token) {
      try {
        const tokenText = await tokenResponse.text();
        const tokenData = JSON.parse(tokenText);
        token = tokenData.t || '';
      } catch (e) {
        // Не JSON — парсим текст
        console.error('Token response is not JSON');
      }
    }

    // Шаг 2: Выполняем поиск по ИНН
    const searchUrl = new URL('https://egrul.nalog.ru/');
    searchUrl.searchParams.set('token', token);
    searchUrl.searchParams.set('b', 'true');
    searchUrl.searchParams.set('c', '');
    searchUrl.searchParams.set('k', '');
    searchUrl.searchParams.set('n', '');
    searchUrl.searchParams.set('o', '');
    searchUrl.searchParams.set('r', '');
    searchUrl.searchParams.set('sort', '');
    searchUrl.searchParams.set('type', 'all');
    searchUrl.searchParams.set('ogrn', '');
    searchUrl.searchParams.set('okpo', '');
    searchUrl.searchParams.set('oktmo', '');
    searchUrl.searchParams.set('ogrnip', '');
    searchUrl.searchParams.set('ifns', '');
    searchUrl.searchParams.set('dtfrom', '');
    searchUrl.searchParams.set('dtto', '');
    searchUrl.searchParams.set('q', inn);

    let searchResponse: Response;
    try {
      searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': `token=${token}`,
        },
      });
    } catch (networkError) {
      console.error('Search request network error:', networkError);
      return new Response(
        JSON.stringify({ error: 'Сервис ФНС недоступен из текущей сети. Используйте сервер в РФ.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text().catch(() => '');
      console.error('Search request failed:', searchResponse.status, errorText.slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'Ошибка поиска в ЕГРЮЛ. Попробуйте позже.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchText = await searchResponse.text();
    let searchData: any;
    try {
      searchData = JSON.parse(searchText);
    } catch (e) {
      console.error('Search response is not JSON:', searchText.slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'Сервис ФНС вернул неожиданный формат. Попробуйте позже.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(searchData.items) || searchData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Компания или ИП с указанным ИНН не найдены' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Берём первый результат
    const item = searchData.items[0];

    // Формируем результат
    const result: EgrulCompanyData = {
      inn: item.i || inn,
      ogrn: item.o || '',
      name: item.c || '',
      fullName: item.n || item.c || '',
      address: item.a || '',
      director: item.g || '',
      founder: item.f || '',
      capital: item.capital || '',
      okved: item.k || '',
      okpo: item.p || '',
      oktmo: item.r || '',
      status: item.s || '',
      regDate: item.dt || '',
      kpp: item.kpp || '',
      ogrnDate: item.ogrndt || '',
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        raw: item,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('check-egrul error:', error);
    return new Response(
      JSON.stringify({ error: 'Внутренняя ошибка сервера' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
