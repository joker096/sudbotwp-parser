/**
 * Edge Function: check-rosfin
 * Проверка физического лица в списке террористов/экстремистов
 * Источник: Росфинмониторинг (fedsfm.ru)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RosfinRequest {
  inn: string;
}

interface RosfinResult {
  inList: boolean;
  category?: string; // 'terrorist', 'extremist', 'sanctions', 'other'
  details?: string;
  listDate?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inn } = (await req.json()) as RosfinRequest;

    if (!inn || inn.length !== 12) {
      return new Response(
        JSON.stringify({ error: 'ИНН физлица должен содержать 12 цифр' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Росфинмониторинг — публичные списки
    // Прямой API отсутствует, используем парсинг или загруженные данные
    // В production рекомендуется импортировать XML с fedsfm.ru и хранить в Supabase

    // Здесь делаем запрос к спискам (упрощённо — в реальности нужно хранить локальную копию)
    const listUrls = [
      'https://fedsfm.ru/documents/terrorists-catalog-portal-act',
      'https://fedsfm.ru/documents/extremists-catalog-portal-act',
    ];

    // Проверяем в Supabase (если есть загруженные списки)
    // Для демо — возвращаем placeholder
    // В production: импортировать XML ежедневно через cron

    const result: RosfinResult = {
      inList: false, // Заглушка — в production проверять по БД
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('check-rosfin error:', error);
    return new Response(
      JSON.stringify({ inList: false, error: 'Внутренняя ошибка' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
