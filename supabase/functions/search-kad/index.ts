/**
 * Edge Function: search-kad
 * Поиск по Картотеке арбитражных дел (КАД)
 * Источник: kad.arbitr.ru
 * Метод: парсинг HTML (AJAX)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KadSearchRequest {
  query: string; // Номер дела, ИНН, название компании, ФИО
  type?: 'case_number' | 'party' | 'judge' | 'court';
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
    const { query, type = 'case_number', page = 1 } = (await req.json()) as KadSearchRequest;

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Введите минимум 3 символа для поиска' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // КАД использует AJAX для поиска
    // Endpoint: https://kad.arbitr.ru/Kad/SearchInstances
    const searchUrl = 'https://kad.arbitr.ru/Kad/SearchInstances';

    // Формируем payload в зависимости от типа поиска
    let searchPayload: any = {
      Page: page,
      Count: 25,
      IsKad: true,
    };

    if (type === 'case_number') {
      searchPayload.CaseNumber = query;
    } else if (type === 'party') {
      searchPayload.Participants = [{ Name: query, Type: -1 }];
    } else if (type === 'judge') {
      searchPayload.Judges = [query];
    }

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
      console.error('KAD search error:', response.status);
      return new Response(
        JSON.stringify({ 
          error: 'КАД временно недоступен или изменил API. Попробуйте позже.',
          cases: [],
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

    return new Response(
      JSON.stringify({
        cases,
        total: data.TotalCount || cases.length,
        page,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('search-kad error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Ошибка при поиске в КАД',
        cases: [],
        total: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
