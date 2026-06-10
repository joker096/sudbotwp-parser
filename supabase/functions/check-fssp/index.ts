/**
 * Edge Function: check-fssp
 * Проверка исполнительных производств через ФССП
 * API: api-ip.fssprus.ru
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FsspRequest {
  inn: string;
}

interface FsspResult {
  status: 'found' | 'not_found' | 'error';
  count: number;
  productions: Array<{
    number: string;
    date: string;
    debtor: string;
    type: string;
    subject: string;
    department: string;
    bailiff: string;
    endDate?: string;
    sum?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inn } = (await req.json()) as FsspRequest;

    if (!inn || (inn.length !== 10 && inn.length !== 12)) {
      return new Response(
        JSON.stringify({ error: 'ИНН должен содержать 10 или 12 цифр' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ФССП API v1
    const searchUrl = `https://api-ip.fssprus.ru/api/v1.0/search/physical`;
    
    // Для юрлиц: /search/legal
    const isCompany = inn.length === 10;
    const endpoint = isCompany ? 'legal' : 'physical';
    
    const apiUrl = `https://api-ip.fssprus.ru/api/v1.0/search/${endpoint}`;
    
    let searchResponse: Response;
    try {
      searchResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: '', // API ФССП может работать без токена для базового поиска
          inn: inn,
        }),
      });
    } catch (networkError) {
      console.error('FSSP search network error:', networkError);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          error: 'Сервис ФССП недоступен из текущей сети. Используйте сервер в РФ.',
          count: 0,
          productions: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!searchResponse.ok) {
      console.error('FSSP search error:', searchResponse.status);
      // Fallback: возвращаем мок-ответ или ошибку
      return new Response(
        JSON.stringify({ 
          status: 'error',
          error: 'Сервис ФССП временно недоступен',
          count: 0,
          productions: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchText = await searchResponse.text();
    let searchData: any;
    try {
      searchData = JSON.parse(searchText);
    } catch (e) {
      console.error('FSSP search non-JSON response:', searchText.slice(0, 200));
      return new Response(
        JSON.stringify({ 
          status: 'error',
          error: 'Сервис ФССП вернул неожиданный формат ответа',
          count: 0,
          productions: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ФССП возвращает task ID, затем нужно получить результаты
    const task = searchData.response?.result?.[0];
    
    if (!task) {
      return new Response(
        JSON.stringify({
          status: 'not_found',
          count: 0,
          productions: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получаем детали по task
    const statusUrl = `https://api-ip.fssprus.ru/api/v1.0/status/${task}`;
    const statusResponse = await fetch(statusUrl);
    
    let productions: FsspResult['productions'] = [];
    
    if (statusResponse.ok) {
      const statusText = await statusResponse.text();
      let statusData: any;
      try {
        statusData = JSON.parse(statusText);
      } catch (e) {
        console.error('FSSP status non-JSON response:', statusText.slice(0, 200));
        statusData = {};
      }
      const results = statusData.response?.result;
      const resultsArray = Array.isArray(results) ? results : [];
      
      productions = resultsArray.map((item: any) => ({
        number: item.number || '',
        date: item.date || '',
        debtor: item.debtor?.name || '',
        type: item.exe_production_type || '',
        subject: item.subject_type || '',
        department: item.department || '',
        bailiff: item.bailiff || '',
        endDate: item.end_date || undefined,
        sum: item.exe_amount || undefined,
      }));
    }

    const result: FsspResult = {
      status: productions.length > 0 ? 'found' : 'not_found',
      count: productions.length,
      productions,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('check-fssp error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: 'Внутренняя ошибка сервера',
        count: 0,
        productions: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
