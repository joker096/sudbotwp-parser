/**
 * Edge Function: check-passport
 * Проверка паспорта на недействительность
 * Источник: API МВД (не публичный) или загруженные списки
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PassportRequest {
  series: string;
  number: string;
}

interface PassportResult {
  valid: boolean;
  invalidReason?: string;
  dateAdded?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { series, number } = (await req.json()) as PassportRequest;

    if (!series || !number) {
      return new Response(
        JSON.stringify({ error: 'Серия и номер паспорта обязательны' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // API МВД закрытое. В production можно:
    // 1. Использовать API провайдера (платно)
    // 2. Парсить данные из открытых источников
    // 3. Хранить список недействительных паспортов в Supabase

    const result: PassportResult = {
      valid: true, // Заглушка
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('check-passport error:', error);
    return new Response(
      JSON.stringify({ valid: true, error: 'Внутренняя ошибка' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
