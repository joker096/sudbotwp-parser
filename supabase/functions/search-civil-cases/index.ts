/**
 * Edge Function: search-civil-cases
 * Поиск по банку данных судебных решений (ГАС Правосудие)
 * API: bsr.sudrf.ru
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CivilCaseRequest {
  query: string;
  type?: 'party' | 'case_number';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, type = 'party' } = (await req.json()) as CivilCaseRequest;

    if (!query || query.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Запрос минимум 3 символа' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // bsr.sudrf.ru — поиск судебных решений
    const searchUrl = `https://bsr.sudrf.ru/bigs/portal.api/search?searchString=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`bsr.sudrf.ru returned ${res.status}`);
    }

    const data = await res.json();

    const cases = (data.items || []).map((item: any) => ({
      number: item.caseNumber || item.number,
      court: item.courtName || item.court,
      date: item.date,
      plaintiff: item.plaintiff || item.applicant,
      defendant: item.defendant || item.respondent,
      judge: item.judge,
      category: item.category,
      url: item.documentUrl || item.url,
      status: item.status,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        cases,
        total: cases.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('search-civil-cases error:', error);
    return new Response(
      JSON.stringify({
        error: 'Сервис временно недоступен. Попробуйте позже.',
        cases: [],
        total: 0,
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
