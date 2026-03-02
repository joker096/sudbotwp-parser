/**
 * Парсинг через Browserless.io (облачный headless Chrome)
 * Fallback между клиентским парсингом и Edge Function
 * 
 * Требует: VITE_BROWSERLESS_TOKEN в .env
 * Стоимость: ~$0.005 за запрос (пакеты от $50/мес)
 * Надёжность: ~95% (ротация IP, полный Chrome)
 */

import { ParsedCaseData } from './clientParser';

const BROWSERLESS_TOKEN = import.meta.env.VITE_BROWSERLESS_TOKEN;
const BROWSERLESS_URL = 'https://chrome.browserless.io/content';

export function isBrowserlessConfigured(): boolean {
  return !!BROWSERLESS_TOKEN && BROWSERLESS_TOKEN !== 'your_token_here';
}

export async function parseWithBrowserless(url: string): Promise<ParsedCaseData> {
  if (!isBrowserlessConfigured()) {
    throw new Error('Browserless not configured');
  }

  console.log('Parsing via Browserless:', url);

  const response = await fetch(`${BROWSERLESS_URL}?token=${BROWSERLESS_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      gotoOptions: {
        waitUntil: 'networkidle2',
        timeout: 60000,
      },
      // Дополнительные опции для сложных сайтов
      addStyleTag: [
        { content: '* { scroll-behavior: auto !important; }' }
      ],
      setJavaScriptEnabled: true,
      viewport: {
        width: 1920,
        height: 1080,
      },
      // Ждём загрузки таблиц с данными
      waitForSelector: '#tablcont, .casenumber, #cont1',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Browserless error:', response.status, errorText);
    throw new Error(`Browserless error: ${response.status}`);
  }

  const html = await response.text();
  
  // Проверяем, что получили реальные данные, а не капчу/ошибку
  if (html.includes('captcha') || html.includes('Доступ ограничен')) {
    throw new Error('Browserless blocked by court site');
  }

  // Используем тот же парсер, что и для клиентского
  const { parseCaseHtml } = await import('./clientParser');
  return parseCaseHtml(html, url);
}

/**
 * Парсинг через ScrapingBee (альтернатива Browserless)
 */
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
  const { parseCaseHtml } = await import('./clientParser');
  return parseCaseHtml(html, url);
}

/**
 * Универсальная функция парсинга с полной цепочкой fallback
 * 
 * Priority:
 * 1. Клиентский парсинг (бесплатно)
 * 2. Browserless.io ($0.005/запрос)
 * 3. ScrapingBee (альтернатива)
 * 4. Edge Function/Local server (бесплатно)
 * 5. Ошибка с инструкцией
 */
export async function parseWithFullFallback(url: string): Promise<{
  data: ParsedCaseData | null;
  error: { message: string } | null;
  source?: 'client' | 'browserless' | 'scrapingbee' | 'server';
}> {
  // Check what's configured
  const browserlessConfigured = isBrowserlessConfigured();
  const scrapingbeeConfigured = isScrapingBeeConfigured();
  
  console.log('[Parse] Configuration check:', { browserlessConfigured, scrapingbeeConfigured });
  
  // 1. Client-side parsing (this might work for some court sites)
  try {
    console.log('[Parse] Trying client-side...');
    const { parseCaseClient } = await import('./clientParser');
    const data = await parseCaseClient(url);
    console.log('[Parse] Client-side success');
    return { data, error: null, source: 'client' };
  } catch (clientError: any) {
    console.log('[Parse] Client-side failed:', clientError.message);
  }

  // 2. Server-side parsing (Edge Function with Browserless/ScrapingBee support)
  // This is the main fallback - it handles all the heavy lifting server-side
  try {
    console.log('[Parse] Trying server-side (with Browserless/ScrapingBee)...');
    const parseUrl = import.meta.env.DEV 
      ? 'http://localhost:3000/parse-case' 
      : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-case`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (!import.meta.env.DEV) {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    }

    // Use AbortController with longer timeout for court sites
    const controller = new AbortController();
    const timeoutMs = 120000; // 120 seconds for slow court sites with Browserless
    const timeoutId = setTimeout(() => {
      console.log('[Parse] Server-side timeout, aborting...');
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(parseUrl, {
        method: 'POST',
        headers,
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
