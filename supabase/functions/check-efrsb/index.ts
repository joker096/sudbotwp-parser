/**
 * Edge Function: check-efrsb
 * Проверка банкротства через Единый федеральный реестр сведений о банкротстве
 * API: bankrot.fedresurs.ru
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EfrsbRequest {
  inn: string;
}

interface EfrsbResult {
  hasBankruptcy: boolean;
  cases: Array<{
    number: string;
    type: string;
    date: string;
    court: string;
    judge: string;
    status: string;
  }>;
  registry: Array<{
    creditor: string;
    amount: string;
    status: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inn } = (await req.json()) as EfrsbRequest;

    if (!inn || (inn.length !== 10 && inn.length !== 12)) {
      return new Response(
        JSON.stringify({ error: 'ИНН должен содержать 10 или 12 цифр' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ЕФРСБ API
    const searchUrl = 'https://bankrot.fedresurs.ru/backend/prsnbankrupts';
    
    let searchResponse: Response;
    try {
      searchResponse = await fetch(`${searchUrl}?searchString=${encodeURIComponent(inn)}&isActive=true`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    } catch (networkError) {
      console.error('EFRSB search network error:', networkError);
      return new Response(
        JSON.stringify({ 
          hasBankruptcy: false,
          cases: [],
          registry: [],
          error: 'Сервис ЕФРСБ недоступен из текущей сети. Используйте сервер в РФ.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!searchResponse.ok) {
      console.error('EFRSB search error:', searchResponse.status);
      return new Response(
        JSON.stringify({ 
          hasBankruptcy: false,
          cases: [],
          registry: [],
          error: 'Сервис ЕФРСБ временно недоступен',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchText = await searchResponse.text();
    let searchData: any;
    try {
      searchData = JSON.parse(searchText);
    } catch (e) {
      console.error('EFRSB search non-JSON:', searchText.slice(0, 200));
      return new Response(
        JSON.stringify({ 
          hasBankruptcy: false,
          cases: [],
          registry: [],
          error: 'Сервис ЕФРСБ вернул неожиданный формат',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const bankrupts = searchData.pageData || [];

    const cases: EfrsbResult['cases'] = [];
    
    for (const bankrupt of bankrupts) {
      // Получаем детали дела
      const caseUrl = `https://bankrot.fedresurs.ru/backend/prsnbankrupts/${bankrupt.guid}`;
      try {
        const caseResponse = await fetch(caseUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        if (caseResponse.ok) {
          const caseText = await caseResponse.text();
          let caseData: any;
          try {
            caseData = JSON.parse(caseText);
          } catch (e) {
            console.warn('EFRSB case details non-JSON:', caseText.slice(0, 200));
            caseData = {};
          }
          cases.push({
            number: caseData.number || '',
            type: caseData.caseType || '',
            date: caseData.startDate || '',
            court: caseData.courtName || '',
            judge: caseData.judgeName || '',
            status: caseData.status || '',
          });
        }
      } catch (e) {
        console.warn('Failed to fetch case details:', e);
      }
    }

    // Получаем реестр требований (упрощённо)
    const registry: EfrsbResult['registry'] = [];

    const result: EfrsbResult = {
      hasBankruptcy: cases.length > 0,
      cases,
      registry,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('check-efrsb error:', error);
    return new Response(
      JSON.stringify({ 
        hasBankruptcy: false,
        cases: [],
        registry: [],
        error: 'Внутренняя ошибка сервера',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
