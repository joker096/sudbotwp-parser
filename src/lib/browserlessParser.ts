/**
 * Парсинг через ScrapingBee и серверный fallback
 * Fallback между клиентским парсингом и сервером
 *
 * Требует: VITE_SCRAPINGBEE_API_KEY в .env
 */

import type { ParsedCaseData } from './clientParser';
import { parseCaseHtml, parseCaseClient } from './clientParser';
import { apiConfig } from './apiConfig';

const SCRAPINGBEE_API_KEY = import.meta.env.VITE_SCRAPINGBEE_API_KEY;

export function isScrapingBeeConfigured(): boolean {
  return !!SCRAPINGBEE_API_KEY && SCRAPINGBEE_API_KEY !== 'your_key_here';
}

export async function parseWithScrapingBee(url: string): Promise<ParsedCaseData> {
  if (!isScrapingBeeConfigured()) {
    throw new Error('ScrapingBee not configured');
  }

  console.log('Parsing via ScrapingBee:', url);

  const apiUrl = new URL('https://app.scrapingbee.com/api/v1/');
  apiUrl.searchParams.set('api_key', SCRAPINGBEE_API_KEY);
  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('render_js', 'true');
  apiUrl.searchParams.set('wait', '5000'); // Ждём 5 секунд для загрузки JS
  apiUrl.searchParams.set('premium_proxy', 'true'); // Резидентные прокси

  const response = await fetch(apiUrl.toString());

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ScrapingBee error:', response.status, errorText);
    throw new Error(`ScrapingBee error: ${response.status}`);
  }

  const html = await response.text();
  return parseCaseHtml(html, url);
}

/**
 * Проверяет, является ли URL сайтом российского суда
 * Сайты судов не поддерживают CORS, поэтому клиентский парсинг будет всегда падать
 */
function isCourtSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // Проверяем домены судов
    return hostname.includes('sudrf.ru') ||
           hostname.includes('mos-sud.ru') ||
           hostname.includes('arbitr.ru') ||
           hostname.includes('msudrf.ru') ||
           hostname.endsWith('.sudrf.ru');
  } catch {
    return false;
  }
}

/**
 * Универсальная функция парсинга с полной цепочкой fallback
 *
 * Priority:
 * 1. Клиентский парсинг (только для НЕ-судебных сайтов)
 * 2. Серверный парсинг (свой сервер sud.cvr.name)
 * 3. Ошибка с инструкцией
 */
export async function parseWithFullFallback(url: string): Promise<{
  data: ParsedCaseData | null;
  error: { message: string } | null;
  source?: 'client' | 'server';
}> {
  // Check what's configured
  const isCourt = isCourtSite(url);

  console.log('[Parse] Configuration check:', { isCourtSite: isCourt });

  // 1. Client-side parsing (только для не-судебных сайтов)
  // Судебные сайты (sudrf.ru) не поддерживают CORS, поэтому пропускаем клиентский парсинг
  if (!isCourt) {
    try {
      console.log('[Parse] Trying client-side...');
      const data = await parseCaseClient(url);
      console.log('[Parse] Client-side success');
      return { data, error: null, source: 'client' };
    } catch (clientError: any) {
      console.log('[Parse] Client-side failed:', clientError.message);
    }
  } else {
    console.log('[Parse] Skipping client-side parsing for court site (CORS restriction)');
  }

  // 2. Server-side parsing (свой сервер)
  try {
    console.log('[Parse] Trying server-side...');
    const parseUrl = apiConfig.parseCaseUrl;

    // Use AbortController with longer timeout for court sites
    const controller = new AbortController();
    const timeoutMs = 180000; // 180 секунд (3 минуты) для медленных судебных сайтов
    const timeoutId = setTimeout(() => {
      console.log('[Parse] Server-side timeout, aborting...');
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(parseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Parse] Server-side success');
      return { data, error: null, source: 'server' };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Check if it was aborted
      if (fetchError.name === 'AbortError') {
        console.log('[Parse] Server-side request aborted (timeout)');
        throw new Error('Превышен таймаут ожидания. Сайт суда работает медленно.');
      }
      throw fetchError;
    }
  } catch (serverError: any) {
    console.log('[Parse] Server-side failed:', serverError.message);
  }

  // 3. Everything failed - provide detailed error message
  return {
    data: null,
    error: {
      message: 'Не удалось загрузить данные дела. Проверьте ссылку и попробуйте снова.\n\nВозможно, сайт суда временно недоступен. Попробуйте позже.'
    }
};
}
