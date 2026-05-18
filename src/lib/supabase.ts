import { createClient } from '@supabase/supabase-js';
import { Profile, Court, CourtRegion, CaseCalendarEvent, CaseEvent, CaseAppeal, ParsedCase } from '../types';
import { parseCaseClient, parseCaseHtml, ParsedCaseData } from './clientParser';
import { parseWithFullFallback } from './browserlessParser';
import { apiConfig } from './apiConfig';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase credentials are missing. Please check your .env file.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const auth = {
  signInWithGoogle: async () => {
    return withRetry(() =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
    );
  },

  signOut: async () => {
    return withRetry(() => supabase.auth.signOut());
  },

  getSession: async () => {
    return withRetry(() => supabase.auth.getSession());
  },

  getCurrentUser: async () => {
    return withRetry(() => supabase.auth.getUser());
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export const profile = {
  getProfile: async (userId: string) => {
    return withRetry(() =>
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    );
  },

  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    return withRetry(() =>
      supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
    );
  },

  createProfile: async (userId: string, email: string, name: string) => {
    return withRetry(() =>
      supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email,
            full_name: name,
            avatar_url: null,
            phone: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()
    );
  },
};

// Type guard для проверки структуры события
const isValidCaseEvent = (event: any): event is CaseEvent => {
  return (
    event &&
    typeof event === 'object' &&
    typeof event.date === 'string' &&
    typeof event.name === 'string'
  );
};

// Type guard для проверки структуры апелляции
const isValidCaseAppeal = (appeal: any): appeal is CaseAppeal => {
  return (
    appeal &&
    typeof appeal === 'object' &&
    typeof appeal.type === 'string' &&
    typeof appeal.applicant === 'string'
  );
};

// Безопасный парсинг JSON с обработкой двойного экранирования
const safeJsonParse = (value: any, fieldName: string): any[] => {
  if (value === null || value === undefined) {
    return [];
  }

  // Если уже массив - проверяем элементы
  if (Array.isArray(value)) {
    return value;
  }

  // Если строка - пробуем распарсить
  if (typeof value === 'string') {
    try {
      // Пробуем распарсить как есть
      let parsed = JSON.parse(value);
      
      // Если результат строка - парсим ещё раз (двойное экранирование)
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      
      // Убедимся что это массив
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      // Если это объект - оборачиваем в массив
      if (parsed && typeof parsed === 'object') {
        return [parsed];
      }
      
      return [];
    } catch (e) {
      console.warn(`Failed to parse ${fieldName}:`, e);
      return [];
    }
  }

  // Если это объект - оборачиваем в массив
  if (typeof value === 'object') {
    return [value];
  }

  return [];
};

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

/**
 * Generic exponential backoff retry wrapper for Supabase calls.
 * Works with any function that returns { data, error }.
 * Retries up to `attempts` times with exponential delay.
 * Returns the last error if all attempts fail.
 */
async function withRetry<T>(fn: () => Promise<{ data: T; error: any }>, attempts = RETRY_ATTEMPTS, delayMs = RETRY_DELAY_MS): Promise<{ data: T | null; error: any }> {
  let lastError: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      if (!result.error) {
        return result;
      }
      lastError = result.error;
    } catch (e) {
      lastError = e;
    }
    // Wait before next attempt (skip delay on last attempt)
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  return { data: null, error: lastError };
}

// Cases - actual case management
export const cases = {
  // Получить дела пользователя
  getByUser: async (userId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
    );
  },

  // Получить дело по ID
  getById: async (caseId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()
    );
  },

  // Создать дело
  create: async (caseData: {
    user_id: string;
    number: string;
    court: string;
    status: string;
    date: string;
    category: string;
    link: string;
    plaintiff?: string;
    defendant?: string;
    judge?: string;
  }) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .insert([{
          ...caseData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single()
    );
  },

  // Алиас для обратной совместимости (pages вызывают createCase)
  createCase: async (caseData: Record<string, any>) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .insert([{
          ...caseData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single()
    );
  },

  // Обновить дело
  update: async (caseId: string, updates: any) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', caseId)
        .select()
        .single()
    );
  },

  updateCase: async (caseId: string, updates: any) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', caseId)
        .select()
        .single()
    );
  },

  // Удалить дело (мягкое) — sets status to 'deleted'
  archive: async (caseId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', caseId)
    );
  },

  // Алиас для обратной совместимости
  archiveCase: async (caseId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', caseId)
    );
  },

  deleteCase: async (caseId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', caseId)
    );
  },

  unarchiveCase: async (caseId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ status: '', updated_at: new Date().toISOString() })
        .eq('id', caseId)
    );
  },

  restoreCase: async (caseId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', caseId)
    );
  },

  restoreMultipleCases: async (caseIds: string[]) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .in('id', caseIds)
    );
  },

  deleteMultipleCases: async (caseIds: string[]) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .in('id', caseIds)
    );
  },

  updateCaseComment: async (caseId: string, comment: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .update({ comment, updated_at: new Date().toISOString() })
        .eq('id', caseId)
    );
  },

  // Получить дела пользователя (алиас для обратной совместимости)
  getCasesByUser: async (userId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
    );
  },
};

// Case Comments
export const caseComments = {
  // Получить комментарии дела
  getByCase: async (caseId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('case_comments')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })
    );
  },

  // Добавить комментарий
  create: async (caseId: string, userId: string, content: string) => {
    return withRetry<any>(() =>
      supabase
        .from('case_comments')
        .insert([{
          case_id: caseId,
          author_id: userId,
          content: content.trim(),
        }])
        .select()
        .single()
    );
  },

  // Обновить комментарий
  update: async (id: string, content: string) => {
    return withRetry<any>(() =>
      supabase
        .from('case_comments')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Удалить комментарий
  delete: async (id: string) => {
    return withRetry<any>(() =>
      supabase
        .from('case_comments')
        .delete()
        .eq('id', id)
    );
  },
};

// Проверка доступности сайта суда по URL
export const checkCourtSiteAvailability = async (url?: string): Promise<{ available: boolean; message: string; url?: string }> => {
  // Если передан конкретный URL дела - проверяем его домен
  if (url) {
    try {
      const urlObj = new URL(url);
      const domainUrl = `${urlObj.protocol}//${urlObj.host}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(domainUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      // Если no-cors, то response будет opaque, но это означает что сайт доступен
      return { available: true, message: 'Сайт суда доступен', url: domainUrl };
    } catch (error: any) {
      // Игнорируем AbortError - это нормальный таймаут
      if (error.name === 'AbortError') {
        console.log(`Court site ${url} timed out after 5 seconds, allowing request to proceed`);
        return { available: true, message: 'Проверка доступности сайта пропущена (таймаут)', url };
      }
      console.log(`Court site ${url} not accessible:`, error.message);
    }
  }
  
  // Если не удалось проверить конкретный сайт или URL не передан - пропускаем проверку
  return { available: true, message: 'Проверка доступности сайта пропущена', url };
};

// Парсинг через сервер (Render.com или локальный)
async function parseCaseServer(url: string): Promise<{ data: any; error: any }> {
  try {
    console.log('Server-side parsing:', url);

    // Используем свой сервер (без ограничений по таймауту)
    const parseUrl = apiConfig.parseCaseUrl;
    console.log('Parsing from server URL:', parseUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 секунд для медленных судебных сайтов

    const response = await fetch(parseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('Server response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: errorData.error || `Server request failed: ${response.status}`
        }
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    console.error('Server parsing error:', error);

    if (error.name === 'AbortError') {
      return {
        data: null,
        error: {
          message: 'Превышен таймаут ожидания. Судный сайт работает очень медленно.'
        }
      };
    }

    return {
      data: null,
      error: {
        message: error.message || 'Server parsing failed'
      }
    };
  }
}

/**
 * Проверяет, является ли URL сайтом российского суда
 * Сайты судов не поддерживают CORS, поэтому клиентский парсинг будет всегда падать
 */
function isCourtSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('sudrf.ru') ||
           hostname.includes('mos-sud.ru') ||
           hostname.includes('arbitr.ru') ||
           hostname.includes('msudrf.ru') ||
           hostname.endsWith('.sudrf.ru');
  } catch {
    return false;
  }
}

export const parseCase = async (url: string, options?: {
  preferClient?: boolean;
  useFullFallback?: boolean;
}) => {
  // Сначала проверяем доступность сайта суда
  const availability = await checkCourtSiteAvailability(url);
  if (!availability.available) {
    return {
      data: null,
      error: {
        message: availability.message
      }
    };
  }

  // Проверяем, является ли URL сайтом суда
  const isCourt = isCourtSite(url);

  // Если запрошен полный fallback (с Browserless/ScrapingBee) и это production
  // или если это сайт суда (чтобы избежать CORS ошибок)
  if (options?.useFullFallback !== false && (!import.meta.env.DEV || isCourt)) {
    console.log('Using full fallback chain with external services...');
    return await parseWithFullFallback(url);
  }

  // Стратегия для DEV или когда useFullFallback = false:
  // Клиентский → Серверный (local/Edge Function)
  // Но пропускаем клиентский парсинг для судебных сайтов из-за CORS
  if (options?.preferClient !== false && !isCourt) {
    try {
      console.log('Trying client-side parsing first...');
      const clientData = await parseCaseClient(url);
      console.log('Client-side parsing successful');
      return { data: clientData, error: null, source: 'client' };
    } catch (clientError: any) {
      console.log('Client-side parsing failed:', clientError.message);
    }
  } else if (isCourt) {
    console.log('Skipping client-side parsing for court site (CORS restriction)');
  }

  // Fallback на сервер
  console.log('Using server-side parsing...');
  const result = await parseCaseServer(url);
  
  if (result.error) {
    return {
      data: null,
      error: {
        message: 'Не удалось загрузить данные дела. Возможные причины:\n' +
                 '• Сайт суда временно недоступен\n' +
                 '• Сайт суда блокирует автоматические запросы\n' +
                 '• Превышено время ожидания\n\n' +
                 'Рекомендации:\n' +
                 '1. Добавьте дело вручную\n' +
                 '2. Повторите попытку позже\n' +
                 '3. Настройте Browserless.io для надёжного парсинга (см. PARSING_OPTIONS.md)'
      }
    };
  }
  
  return { ...result, source: 'server' };
};

// =====================================================
// CASE REFRESH LIMITS - Ограничения на обновление дел
// =====================================================

export interface RefreshLimitInfo {
  canRefresh: boolean;
  reason: string;
  nextRefreshAt: string | null;
  subscriptionTier: string;
  lastRefreshToday: string | null;
}

// Проверить, может ли пользователь обновить дело вручную
export const checkRefreshLimits = async (userId: string): Promise<RefreshLimitInfo> => {
  try {
    // Получаем информацию о подписке пользователя
    const { data: profileData, error: profileError } = await withRetry<any>(() =>
      supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single()
    );

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return {
        canRefresh: false,
        reason: 'Ошибка при проверке подписки',
        nextRefreshAt: null,
        subscriptionTier: 'free',
        lastRefreshToday: null,
      };
    }

    const subscriptionTier = profileData?.subscription_tier || 'free';

    // Бесплатный пользователь не может обновлять вручную
    if (subscriptionTier === 'free') {
      return {
        canRefresh: false,
        reason: 'Ручное обновление доступно только для подписчиков. Оформите подписку для ручного обновления или дождитесь автоматического обновления (1 раз в день).',
        nextRefreshAt: null,
        subscriptionTier,
        lastRefreshToday: null,
      };
    }

    // Получаем время последнего ручного обновления любого дела пользователем сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data: lastRefreshData, error: lastRefreshError } = await withRetry<any>(() =>
      supabase
        .from('cases')
        .select('last_manual_refresh_at')
        .eq('user_id', userId)
        .gte('last_manual_refresh_at', todayIso)
        .order('last_manual_refresh_at', { ascending: false })
        .limit(1)
        .single()
    );

    if (lastRefreshData?.last_manual_refresh_at) {
      // Если сегодня уже было ручное обновление - запрещаем
      const lastRefreshTime = new Date(lastRefreshData.last_manual_refresh_at);
      const timeString = lastRefreshTime.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Вычисляем время следующего обновления (полночь следующего дня)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        canRefresh: false,
        reason: `Вы уже обновляли дело сегодня (${timeString}). Следующее ручное обновление будет доступно завтра.`,
        nextRefreshAt: tomorrow.toISOString(),
        subscriptionTier,
        lastRefreshToday: lastRefreshData.last_manual_refresh_at,
      };
    }

    // Подписчик может обновить (еще не обновлял сегодня)
    return {
      canRefresh: true,
      reason: 'Ручное обновление доступно.',
      nextRefreshAt: null,
      subscriptionTier,
      lastRefreshToday: null,
    };
  } catch (error) {
    console.error('Error checking refresh limits:', error);
    return {
      canRefresh: false,
      reason: 'Ошибка при проверке ограничений',
      nextRefreshAt: null,
      subscriptionTier: 'free',
      lastRefreshToday: null,
    };
  }
};

// Обновить дело через повторный парсинг (с проверкой ограничений для ручного обновления)
export const refreshCase = async (
  caseId: string, 
  link: string, 
  options?: { 
    isAutoRefresh?: boolean;
    userId?: string;
  }
): Promise<{
  data: any;
  error?: {
    message: string;
    code?: string;
    nextRefreshAt?: string;
    subscriptionTier?: string;
  };
  limitInfo?: RefreshLimitInfo;
}> => {
  console.log('=== REFRESH CASE FUNCTION ===');
  console.log('caseId:', caseId);
  console.log('link:', link);
  console.log('options:', options);

  const isAutoRefresh = options?.isAutoRefresh || false;
  const userId = options?.userId;

  // Если это ручное обновление (не авто) - проверяем ограничения
  if (!isAutoRefresh && userId) {
    console.log('Checking refresh limits for manual refresh...');
    const limitInfo = await checkRefreshLimits(userId);

    if (!limitInfo.canRefresh) {
      console.log('Refresh blocked:', limitInfo.reason);
      return {
        data: null,
        error: {
          message: limitInfo.reason,
          code: 'REFRESH_LIMIT_EXCEEDED',
          nextRefreshAt: limitInfo.nextRefreshAt,
          subscriptionTier: limitInfo.subscriptionTier,
        },
        limitInfo,
      };
    }

    console.log('Refresh allowed:', limitInfo.reason);
  }

  // Сначала проверяем доступность сайта суда
  const availability = await checkCourtSiteAvailability(link);
  console.log('Court site availability:', availability);
  if (!availability.available) {
    return {
      data: null,
      error: {
        message: availability.message
      }
    };
  }

  // Используем ту же стратегию парсинга, что и в parseCase
  const result = await parseCase(link);

  if (result.error) {
    console.error('Error refreshing case:', result.error);
    return result;
  }

  const parsedData = result.data;
  console.log('Refreshed case data:', parsedData);

  // Подготавливаем данные для обновления
  const updates: any = {
    number: parsedData.number || '',
    court: parsedData.court || '',
    status: parsedData.status || '',
    date: parsedData.date || '',
    category: parsedData.category || '',
    judge: parsedData.judge || '',
    plaintiff: parsedData.plaintiff || '',
    defendant: parsedData.defendant || '',
    link: link,
    events: parsedData.events || [],
    appeals: parsedData.appeals || [],
  };

  // Если это ручное обновление - записываем время
  if (!isAutoRefresh) {
    updates.last_manual_refresh_at = new Date().toISOString();
  }

  // Обновляем дело в базе данных
  const { data, error } = await withRetry<any>(() =>
    supabase
      .from('cases')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .select()
      .single()
  );

  if (error) {
    console.error('Error updating case:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

// Функция для автоматического обновления (без ограничений)
export const autoRefreshCase = async (caseId: string, link: string) => {
  // Получаем user_id из дела для передачи в refreshCase
  const { data: caseData, error: caseError } = await withRetry<any>(() =>
    supabase
      .from('cases')
      .select('user_id')
      .eq('id', caseId)
      .single()
  );

  if (caseError || !caseData) {
    console.error('Error fetching case for auto refresh:', caseError);
    return { data: null, error: caseError };
  }

  return refreshCase(caseId, link, { 
    isAutoRefresh: true, 
    userId: caseData.user_id 
  });
};

// Получить статистику обновлений пользователя
export const getUserRefreshStats = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // Количество дел пользователя
    const { count: totalCases, error: countError } = await withRetry<any>(() =>
      supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'deleted')
    );

    if (countError) throw countError;

    // Последнее ручное обновление сегодня
    const { data: lastRefresh, error: lastRefreshError } = await withRetry<any>(() =>
      supabase
        .from('cases')
        .select('last_manual_refresh_at')
        .eq('user_id', userId)
        .gte('last_manual_refresh_at', todayIso)
        .order('last_manual_refresh_at', { ascending: false })
        .limit(1)
        .single()
    );

    // Получаем подписку
    const { data: profile, error: profileError } = await withRetry<any>(() =>
      supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single()
    );

    return {
      data: {
        totalCases: totalCases || 0,
        hasRefreshedToday: !!lastRefresh?.last_manual_refresh_at,
        lastRefreshAt: lastRefresh?.last_manual_refresh_at || null,
        subscriptionTier: profile?.subscription_tier || 'free',
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting user refresh stats:', error);
    return { data: null, error };
  }
};

// =====================================================
// LEAD SYSTEM - Система лидогенерации
// =====================================================

export interface Lead {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  region: string | null;
  case_type: string;
  case_description: string | null;
  budget: string | null;
  urgency: 'low' | 'medium' | 'high';
  status: 'new' | 'contacted' | 'closed' | 'spam';
  price: number;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  lawyer_id: string | null; // lawyer_id = null → платный лид, lawyer_id = uuid → заявка конкретному юристу
}

export interface Lawyer {
   id: string;
   user_id: string | null;
   name: string;
   spec: string | null;
   specialization: string | null;
   city: string | null;
   region: string | null;
   rating: number;
   reviews: number;
   reviews_count: number;
   verified: boolean;
   avatar_url: string | null;
   img: string | null;
   website: string | null;
   phone: string | null;
   email: string | null;
   experience: string | null;
   experience_years: number | null;
   description: string | null;
   is_active: boolean;
   is_featured: boolean;
   status: 'pending' | 'approved' | 'rejected' | 'blocked';
   subscription_tier: 'free' | 'basic' | 'premium' | 'featured';
   subscription_expires_at: string | null;
   subscription_expires: string | null;
   leads_purchased: number;
   leads_converted: number;
   total_spent: number;
   can_buy_leads: boolean;
   max_leads_per_month: number;
   notify_new_leads: boolean;
   notify_telegram: string | null;
    created_at: string;
    updated_at: string;
    telegram: string | null;
    license_number: string | null;
    practice_areas: string[] | null;
    languages: string[] | null;
}

export interface LeadPurchase {
  id: string;
  lead_id: string;
  lawyer_id: string;
  price: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_method: string | null;
  contact_revealed: boolean;
  revealed_at: string | null;
  status: 'new' | 'contacted' | 'in_progress' | 'converted' | 'lost' | 'closed';
  client_feedback: string | null;
  is_useful: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface LeadBid {
  id: string;
  lead_id: string;
  lawyer_id: string;
  bid_amount: number;
  message: string | null;
  status: 'active' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

export interface LeadWithPurchase extends Lead {
  already_purchased: boolean;
  purchase_status: string | null;
}

export const leads = {
  // Получить все доступные лиды
  getAvailable: async () => {
    return withRetry<Lead[]>(() =>
      supabase
        .from('leads')
        .select('*')
        .eq('status', 'new')
        .gt('expires_at', new Date().toISOString())
        .order('price', { ascending: false })
        .order('created_at', { ascending: false })
    );
  },

  // Получить лиды по фильтрам
  getFiltered: async (filters: {
    caseType?: string;
    region?: string;
    urgency?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    let query = supabase
      .from('leads')
      .select('*')
      .eq('status', 'new')
      .gt('expires_at', new Date().toISOString());

    if (filters.caseType) query = query.eq('case_type', filters.caseType);
    if (filters.region) query = query.ilike('region', `%${filters.region}%`);
    if (filters.urgency) query = query.eq('urgency', filters.urgency);
    if (filters.minPrice) query = query.gte('price', filters.minPrice);
    if (filters.maxPrice) query = query.lte('price', filters.maxPrice);

    return withRetry<Lead[]>(() =>
      query
        .order('price', { ascending: false })
        .order('created_at', { ascending: false })
    );
  },

  // Создать новый лид
  create: async (leadData: Partial<Lead>) => {
    return withRetry<Lead>(() =>
      supabase
        .from('leads')
        .insert([{
          client_name: leadData.client_name,
          client_phone: leadData.client_phone,
          client_email: leadData.client_email,
          region: leadData.region,
          case_type: leadData.case_type,
          case_description: leadData.case_description,
          budget: leadData.budget,
          urgency: leadData.urgency || 'medium',
          status: 'new',
          price: leadData.price || 0,
          lawyer_id: leadData.lawyer_id || null,
        }])
        .select()
        .single()
    );
  },

  // Получить заявки конкретного юриста (бесплатные)
  getByLawyer: async (lawyerId: string) => {
    return withRetry<Lead[]>(() =>
      supabase
        .from('leads')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
    );
  },

  // Получить платные лиды (без lawyer_id)
  getPaid: async () => {
    return withRetry<Lead[]>(() =>
      supabase
        .from('leads')
        .select('*')
        .is('lawyer_id', null)
        .eq('status', 'new')
        .gt('expires_at', new Date().toISOString())
        .order('price', { ascending: false })
        .order('created_at', { ascending: false })
    );
  },

  // Получить конкретный лид
  getById: async (id: string) => {
    return withRetry<Lead>(() =>
      supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()
    );
  },

  // Обновить статус лида
  updateStatus: async (id: string, status: Lead['status']) => {
    return withRetry<Lead>(() =>
      supabase
        .from('leads')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Получить лиды пользователя
  getUserLeads: async (userId: string) => {
    return withRetry<Lead[]>(() =>
      supabase
        .from('leads')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
    );
  },
};

export const leadPurchases = {
  // Купить лида
  purchase: async (leadId: string, lawyerId: string, price: number) => {
    return withRetry<LeadPurchase>(() =>
      supabase
        .from('lead_purchases')
        .insert([{
          lead_id: leadId,
          lawyer_id: lawyerId,
          price,
          payment_status: 'pending',
          contact_revealed: false,
          status: 'new',
        }])
        .select()
        .single()
    );
  },

  // Подтвердить оплату
  confirmPayment: async (purchaseId: string) => {
    return withRetry<LeadPurchase>(() =>
      supabase
        .from('lead_purchases')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId)
        .select()
        .single()
    );
  },

  // Раскрыть контакты лида
  revealContact: async (purchaseId: string) => {
    return withRetry<any>(async () => {
      const { data: purchase, error: fetchError } = await supabase
        .from('lead_purchases')
        .select('lead_id, lawyer_id')
        .eq('id', purchaseId)
        .single();

      if (fetchError || !purchase) {
        return { data: null as any, error: fetchError };
      }

      const { data, error } = await supabase
        .from('lead_purchases')
        .update({
          contact_revealed: true,
          revealed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId)
        .select()
        .single();

      if (error) return { data: null as any, error };

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('client_name, client_phone, client_email')
        .eq('id', purchase.lead_id)
        .single();

      return { data: { purchase, contact: lead } as any, error: leadError };
    });
  },

  // Получить купленные лиды юриста
  getLawyerPurchases: async (lawyerId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('lead_purchases')
        .select(`
          *,
          leads (
            id,
            client_name,
            client_phone,
            client_email,
            region,
            case_type,
            case_description,
            budget,
            urgency,
            created_at
          )
        `)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
    );
  },

  // Проверить, куплен ли лид
  checkIfPurchased: async (leadId: string, lawyerId: string) => {
    return withRetry<Pick<LeadPurchase, 'id' | 'contact_revealed' | 'status'>>(() =>
      supabase
        .from('lead_purchases')
        .select('id, contact_revealed, status')
        .eq('lead_id', leadId)
        .eq('lawyer_id', lawyerId)
        .single()
    );
  },

  // Обновить статус работы с лидом
  updateStatus: async (purchaseId: string, status: LeadPurchase['status']) => {
    return withRetry<LeadPurchase>(() =>
      supabase
        .from('lead_purchases')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', purchaseId)
        .select()
        .single()
    );
  },

  // Оставить обратную связь
  addFeedback: async (purchaseId: string, isUseful: boolean, feedback?: string) => {
    return withRetry<LeadPurchase>(() =>
      supabase
        .from('lead_purchases')
        .update({
          is_useful: isUseful,
          client_feedback: feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId)
        .select()
        .single()
    );
  },
};

export const leadBids = {
  // Сделать ставку на лида
  createBid: async (leadId: string, lawyerId: string, amount: number, message?: string) => {
    return withRetry<LeadBid>(() =>
      supabase
        .from('lead_bids')
        .insert([{
          lead_id: leadId,
          lawyer_id: lawyerId,
          bid_amount: amount,
          message,
          status: 'active',
        }])
        .select()
        .single()
    );
  },

  // Получить ставки на лид
  getLeadBids: async (leadId: string) => {
    return withRetry<LeadBid[]>(() =>
      supabase
        .from('lead_bids')
        .select('*')
        .eq('lead_id', leadId)
        .eq('status', 'active')
        .order('bid_amount', { ascending: false })
    );
  },

  // Принять ставку
  acceptBid: async (bidId: string) => {
    return withRetry<any>(async () => {
      const { data: bid, error: fetchError } = await supabase
        .from('lead_bids')
        .select('lead_id, lawyer_id, bid_amount')
        .eq('id', bidId)
        .single();

      if (fetchError || !bid) return { data: null as any, error: fetchError };

      const { error: updateError } = await supabase
        .from('lead_bids')
        .update({ status: 'accepted' })
        .eq('id', bidId);

      if (updateError) return { data: null as any, error: updateError };

      return await leadPurchases.purchase(bid.lead_id, bid.lawyer_id, bid.bid_amount);
    });
  },

  // Отклонить ставку
  rejectBid: async (bidId: string) => {
    return withRetry<LeadBid>(() =>
      supabase
        .from('lead_bids')
        .update({ status: 'rejected' })
        .eq('id', bidId)
        .select()
        .single()
    );
  },
};

export const lawyers = {
  // Получить профиль юриста
  getProfile: async (userId: string) => {
    return withRetry<Lawyer>(() =>
      supabase
        .from('lawyers')
        .select('*')
        .eq('user_id', userId)
        .single()
    );
  },

  // Создать профиль юриста
  createProfile: async (userId: string, name: string, spec?: string, city?: string) => {
    return withRetry<Lawyer>(() =>
      supabase
        .from('lawyers')
        .insert([{
          user_id: userId,
          name,
          spec,
          city,
          rating: 0,
          reviews_count: 0,
          verified: false,
          can_buy_leads: true,
          max_leads_per_month: 50,
        }])
        .select()
        .single()
    );
  },

  // Обновить профиль
  updateProfile: async (userId: string, updates: Partial<Lawyer>) => {
    const { data: lawyer, error: findError } = await withRetry<any>(() =>
      supabase
        .from('lawyers')
        .select('id')
        .eq('user_id', userId)
        .single()
    );

    if (findError || !lawyer) return { data: null, error: findError };

    return withRetry<Lawyer>(() =>
      supabase
        .from('lawyers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', lawyer.id)
        .select()
        .single()
    );
  },

  // Получить статистику юриста
  getStats: async (userId: string) => {
    const { data: lawyer, error } = await withRetry<any>(() =>
      supabase
        .from('lawyers')
        .select('leads_purchased, leads_converted, total_spent, rating')
        .eq('user_id', userId)
        .single()
    );

    if (error || !lawyer) return { data: null, error };

    const conversionRate = lawyer.leads_purchased > 0 
      ? (lawyer.leads_converted / lawyer.leads_purchased) * 100 
      : 0;

    return { 
      data: {
        ...lawyer,
        conversionRate: Math.round(conversionRate),
      }, 
      error 
    };
  },

  // Получить всех юристов (для демо)
  getAll: async () => {
    return withRetry<Lawyer[]>(() =>
      supabase
        .from('lawyers')
        .select('*')
        .order('rating', { ascending: false })
    );
  },

  // Получить всех юристов для админ-панели с пагинацией и фильтрами
  getAllAdmin: async (page: number = 1, pageSize: number = 20, search?: string, status?: string, isActive?: boolean) => {
    let query = supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
      .order('created_at', { ascending: false });

    // Поиск по имени/специальности/городу
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,specialization.ilike.%${search}%,city.ilike.%${search}%,region.ilike.%${search}%`
      );
    }

    // Фильтр по статусу
    if (status) {
      query = query.eq('status', status);
    }

    // Фильтр по активности
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    const result = await withRetry<any>(() => query);
    return { 
      data: result.data as Lawyer[] | null, 
      error: result.error, 
      count: result.data?.length || 0,
      totalPages: Math.ceil((result.data?.length || 0) / pageSize)
    };
  },

  // Переключить активность юриста (админ)
  toggleLawyerActive: async (lawyerId: string, isActive: boolean) => {
    return withRetry<Lawyer>(() =>
      supabase
        .from('lawyers')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', lawyerId)
        .select()
        .single()
    );
  },

  // Обновить статус юриста (админ)
  updateLawyerStatus: async (lawyerId: string, status: 'pending' | 'approved' | 'rejected' | 'blocked') => {
    return withRetry<Lawyer>(() =>
      supabase
        .from('lawyers')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', lawyerId)
        .select()
        .single()
    );
  },

  // Удалить юриста (мягкое удаление)
  deleteLawyer: async (lawyerId: string) => {
    return withRetry<Lawyer>(() =>
      supabase
        .from('lawyers')
        .update({ 
          is_active: false,
          status: 'blocked',
          updated_at: new Date().toISOString()
        })
        .eq('id', lawyerId)
        .select()
        .single()
    );
  },

  // Создать/обновить юриста (админ)
  upsertLawyer: async (lawyerData: Partial<Lawyer>) => {
    return withRetry<Lawyer>(() =>
      supabase
        .from('lawyers')
        .upsert(lawyerData, { onConflict: 'id' })
        .select()
        .single()
    );
  },


  // Получить отзывы о юристе
  getReviews: async (lawyerId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('lawyer_reviews')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
    );
  },

  // Получить активных юристов (публичный endpoint)
  getActive: async () => {
    return withRetry<Lawyer[]>(() =>
      supabase
        .from('lawyers')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('rating', { ascending: false })
    );
  },

  // Получить избранных юристов для главной страницы
  getFeatured: async (limit: number = 4) => {
    return withRetry<Lawyer[]>(() =>
      supabase
        .from('lawyers')
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('rating', { ascending: false })
        .limit(limit)
    );
  },

  // Поиск юристов по параметрам
  searchLawyers: async (filters: {
    query?: string;
    spec?: string;
    city?: string;
    region?: string;
    verified?: boolean;
    minRating?: number;
    limit?: number;
    offset?: number;
  }) => {
    let query = supabase
      .from('lawyers')
      .select('*', { count: 'exact' });

    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,city.ilike.%${filters.query}%`);
    }
    if (filters.spec) {
      query = query.eq('spec', filters.spec);
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.region) {
      query = query.eq('region', filters.region);
    }
    if (filters.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }
    if (filters.minRating) {
      query = query.gte('rating', filters.minRating);
    }

    query = query
      .eq('is_active', true)
      .eq('status', 'approved')
      .order('rating', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    return withRetry<any>(() => query);
  },

  // Получить юристов по городу
  getByCity: async (city: string, limit: number = 10) => {
    return withRetry<Lawyer[]>(() =>
      supabase
        .from('lawyers')
        .select('*')
        .eq('city', city)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('rating', { ascending: false })
        .limit(limit)
    );
  },
};

// Lawyer Applications
export const lawyerApplications = {
  // Подать заявку на становление юристом
  submit: async (applicationData: {
    user_id: string;
    name: string;
    specialization: string;
    city: string;
    region: string;
    phone: string;
    email: string;
    experience_years: number;
    description: string;
    certificate_number?: string;
  }) => {
    return withRetry<any>(() =>
      supabase
        .from('lawyer_applications')
        .insert([{
          user_id: applicationData.user_id,
          name: applicationData.name,
          specialization: applicationData.specialization,
          city: applicationData.city,
          region: applicationData.region,
          phone: applicationData.phone,
          email: applicationData.email,
          experience_years: applicationData.experience_years,
          description: applicationData.description,
          certificate_number: applicationData.certificate_number || null,
          status: 'pending',
        }])
        .select()
        .single()
    );
  },

  // Получить заявку пользователя
  getByUser: async (userId: string) => {
    if (!userId) {
      return { data: null, error: null };
    }
    return withRetry<any>(() =>
      supabase
        .from('lawyer_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  },

  // Получить все заявки (для админа)
  getAll: async (status?: 'pending' | 'approved' | 'rejected') => {
    let query = supabase
      .from('lawyer_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    return withRetry<any>(() => query);
  },

  // Одобрить заявку
  approve: async (applicationId: string, adminNotes?: string) => {
    // Сначала получаем заявку
    const { data: application, error: fetchError } = await withRetry<any>(() =>
      supabase
        .from('lawyer_applications')
        .select('*')
        .eq('id', applicationId)
        .single()
    );

    if (fetchError || !application) {
      return { data: null, error: fetchError };
    }

    // Обновляем статус заявки
    const { data: updatedApp, error: updateError } = await withRetry<any>(() =>
      supabase
        .from('lawyer_applications')
        .update({
          status: 'approved',
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select()
        .single()
    );

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Создаём профиль юриста
    const { data: lawyer, error: lawyerError } = await withRetry<any>(() =>
      supabase
        .from('lawyers')
        .insert([{
          user_id: application.user_id,
          name: application.name,
          spec: application.specialization,
          specialization: application.specialization,
          city: application.city,
          region: application.region,
          phone: application.phone,
          email: application.email,
          experience_years: application.experience_years,
          description: application.description,
          rating: 0,
          reviews_count: 0,
          verified: false,
          is_active: true,
          is_featured: false,
          status: 'approved',
          subscription_tier: 'free',
        }])
        .select()
        .single()
    );

    if (lawyerError) {
      // Откатываем изменение заявки
      await supabase
        .from('lawyer_applications')
        .update({ status: 'pending', processed_at: null })
        .eq('id', applicationId);
      return { data: null, error: lawyerError };
    }

    // Обновляем профиль пользователя
    await supabase
      .from('profiles')
      .update({ role: 'lawyer', lawyer_id: lawyer.id })
      .eq('id', application.user_id);

    return { data: updatedApp, error: null };
  },

  // Отклонить заявку
  reject: async (applicationId: string, adminNotes?: string) => {
    return withRetry<any>(() =>
      supabase
        .from('lawyer_applications')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select()
        .single()
    );
  },
};

// =====================================================
// REWARD & REVIEW SYSTEM - Система поощрений и отзывов
// =====================================================

export interface LawyerReview {
  id: string;
  lawyer_id: string;
  user_id: string;
  case_id: string | null;
  rating: number;
  review_text: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  created_at: string;
}

export interface CaseLawyerLink {
  id: string;
  case_id: string;
  lawyer_id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'denied' | 'cancelled';
  confirmed_by_user: boolean;
  confirmed_by_lawyer: boolean;
  confirmed_at: string | null;
  created_at: string;
}

export interface CaseOutcome {
  id: string;
  case_id: string;
  lawyer_id: string;
  user_id: string;
  outcome: 'won' | 'lost' | 'partial' | 'settled' | 'in_progress' | 'dismissed';
  outcome_description: string | null;
  confirmed_by_lawyer: boolean;
  confirmed_by_lawyer_at: string | null;
  confirmed_by_user: boolean;
  confirmed_by_user_at: string | null;
  both_confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
}

export interface LawyerReward {
  id: string;
  lawyer_id: string;
  reward_type: 'free_lead' | 'bonus_lead' | 'discount' | 'bonus_points' | 'badge';
  reward_value: number;
  case_id: string | null;
  status: 'pending' | 'available' | 'used' | 'expired' | 'cancelled';
  earned_at: string;
  expires_at: string | null;
  used_at: string | null;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_type: 'discount' | 'bonus_lead' | 'free_parsing' | 'promo_code';
  reward_value: string;
  description: string | null;
  review_id: string | null;
  lawyer_id: string | null;
  status: 'pending' | 'available' | 'used' | 'expired' | 'cancelled';
  promo_code: string | null;
  earned_at: string;
  expires_at: string | null;
  used_at: string | null;
}

export const reviews = {
  // Проверить, может ли пользователь оставить отзыв
  canReview: async (userId: string, lawyerId: string) => {
    const { data: link } = await withRetry<any>(() =>
      supabase
        .from('case_lawyer_links')
        .select('id, case_id')
        .eq('user_id', userId)
        .eq('lawyer_id', lawyerId)
        .eq('status', 'confirmed')
        .single()
    );

    if (link) {
      return { canReview: true, caseId: link.case_id, reason: 'Связь с юристом подтверждена' };
    }

    const { data: purchase } = await withRetry<any>(() =>
      supabase
        .from('lead_purchases')
        .select('id')
        .eq('lawyer_id', lawyerId)
        .single()
    );

    const { data: userCase } = await withRetry<any>(() =>
      supabase
        .from('cases')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    );

    if (purchase && userCase) {
      return { canReview: true, caseId: userCase.id, reason: 'Вы приобретали контакты этого юриста' };
    }

    return { canReview: false, caseId: null, reason: 'Вы не работали с данным юристом' };
  },

  // Создать отзыв
  create: async (reviewData: {
    lawyer_id: string;
    user_id: string;
    case_id?: string;
    rating: number;
    review_text?: string;
    captcha_token?: string;
  }) => {
    return withRetry<LawyerReview>(() =>
      supabase
        .from('lawyer_reviews')
        .insert([{
          lawyer_id: reviewData.lawyer_id,
          user_id: reviewData.user_id,
          case_id: reviewData.case_id || null,
          rating: reviewData.rating,
          review_text: reviewData.review_text || null,
          captcha_token: reviewData.captcha_token || null,
          captcha_verified_at: reviewData.captcha_token ? new Date().toISOString() : null,
          status: 'pending',
        }])
        .select()
        .single()
    );
  },

  // Получить одобренные отзывы о юристе
  getApproved: async (lawyerId: string) => {
    return withRetry<LawyerReview[]>(() =>
      supabase
        .from('lawyer_reviews')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
    );
  },

  // Получить все отзывы пользователя
  getUserReviews: async (userId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('lawyer_reviews')
        .select('*, lawyers(name, spec)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );
  },
};

export const caseLinks = {
  // Создать связь между делом и юристом
  create: async (linkData: {
    case_id: string;
    lawyer_id: string;
    user_id: string;
    description?: string;
  }) => {
    return withRetry<CaseLawyerLink>(() =>
      supabase
        .from('case_lawyer_links')
        .insert([{
          case_id: linkData.case_id,
          lawyer_id: linkData.lawyer_id,
          user_id: linkData.user_id,
          description: linkData.description || null,
          status: 'pending',
        }])
        .select()
        .single()
    );
  },

  // Подтвердить связь (юрист подтверждает)
  confirm: async (linkId: string, isLawyer: boolean) => {
    const updateField = isLawyer ? 'confirmed_by_lawyer' : 'confirmed_by_user';
    return withRetry<CaseLawyerLink>(() =>
      supabase
        .from('case_lawyer_links')
        .update({
          [updateField]: true,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkId)
        .select()
        .single()
    );
  },

  // Отклонить связь
  reject: async (linkId: string) => {
    return withRetry<CaseLawyerLink>(() =>
      supabase
        .from('case_lawyer_links')
        .update({ status: 'denied', updated_at: new Date().toISOString() })
        .eq('id', linkId)
        .select()
        .single()
    );
  },

  // Получить связи пользователя
  getUserLinks: async (userId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('case_lawyer_links')
        .select('*, lawyers(name, spec, city), cases(number, court)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );
  },

  // Получить связи юриста
  getLawyerLinks: async (lawyerId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('case_lawyer_links')
        .select('*, cases(number, court), profiles(full_name)')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
    );
  },
};

export const caseOutcomes = {
  // Зарегистрировать исход дела
  create: async (outcomeData: {
    case_id: string;
    lawyer_id: string;
    user_id: string;
    outcome: CaseOutcome['outcome'];
    outcome_description?: string;
  }) => {
    return withRetry<CaseOutcome>(() =>
      supabase
        .from('case_outcomes')
        .insert([{
          case_id: outcomeData.case_id,
          lawyer_id: outcomeData.lawyer_id,
          user_id: outcomeData.user_id,
          outcome: outcomeData.outcome,
          outcome_description: outcomeData.outcome_description || null,
        }])
        .select()
        .single()
    );
  },

  // Подтвердить исход (юрист подтверждает успех)
  confirmByLawyer: async (outcomeId: string, outcome: CaseOutcome['outcome']) => {
    return withRetry<CaseOutcome>(() =>
      supabase
        .from('case_outcomes')
        .update({
          confirmed_by_lawyer: true,
          confirmed_by_lawyer_at: new Date().toISOString(),
          outcome,
          updated_at: new Date().toISOString(),
        })
        .eq('id', outcomeId)
        .select()
        .single()
    );
  },

  // Подтвердить исход (пользователь подтверждает)
  confirmByUser: async (outcomeId: string) => {
    const { data: current } = await withRetry<any>(() =>
      supabase
        .from('case_outcomes')
        .select('*')
        .eq('id', outcomeId)
        .single()
    );

    if (!current) return { data: null, error: 'Outcome not found' };

    const bothConfirmed = current.confirmed_by_lawyer && current.outcome === 'won';

    const { data, error } = await withRetry<CaseOutcome>(() =>
      supabase
        .from('case_outcomes')
        .update({
          confirmed_by_user: true,
          confirmed_by_user_at: new Date().toISOString(),
          both_confirmed: bothConfirmed,
          confirmed_at: bothConfirmed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', outcomeId)
        .select()
        .single()
    );

    if (bothConfirmed && !current.both_confirmed) {
      await lawyerRewards.create({
        lawyer_id: current.lawyer_id,
        reward_type: 'free_lead',
        reward_value: 1,
        case_id: current.case_id,
      });
    }

    return { data, error };
  },

  // Получить исходы пользователя
  getUserOutcomes: async (userId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('case_outcomes')
        .select('*, lawyers(name, spec), cases(number, court)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );
  },

  // Получить исходы юриста
  getLawyerOutcomes: async (lawyerId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('case_outcomes')
        .select('*, cases(number, court), profiles(full_name)')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
    );
  },
};

export const lawyerRewards = {
  // Создать награду для юриста
  create: async (rewardData: {
    lawyer_id: string;
    reward_type: LawyerReward['reward_type'];
    reward_value: number;
    case_id?: string;
  }) => {
    return withRetry<LawyerReward>(() =>
      supabase
        .from('lawyer_rewards')
        .insert([{
          lawyer_id: rewardData.lawyer_id,
          reward_type: rewardData.reward_type,
          reward_value: rewardData.reward_value,
          case_id: rewardData.case_id || null,
          status: 'available',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single()
    );
  },

  // Получить доступные награды юриста
  getAvailable: async (lawyerId: string) => {
    return withRetry<LawyerReward[]>(() =>
      supabase
        .from('lawyer_rewards')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('status', 'available')
        .gt('expires_at', new Date().toISOString())
        .order('earned_at', { ascending: true })
    );
  },

  // Использовать награду (получить бесплатный лид)
  useReward: async (rewardId: string, leadId: string) => {
    return withRetry<LawyerReward>(() =>
      supabase
        .from('lawyer_rewards')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          used_for_lead_id: leadId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rewardId)
        .select()
        .single()
    );
  },

  // Получить историю наград юриста
  getHistory: async (lawyerId: string) => {
    return withRetry<LawyerReward[]>(() =>
      supabase
        .from('lawyer_rewards')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('earned_at', { ascending: false })
    );
  },
};

export const courts = {
  // Получить все суды
  getAll: async () => {
    return withRetry<Court[]>(() =>
      supabase
        .from('courts')
        .select('*')
        .order('name')
    );
  },

  // Получить суд по ID
  getById: async (id: string) => {
    return withRetry<Court>(() =>
      supabase
        .from('courts')
        .select('*')
        .eq('id', id)
        .single()
    );
  },

  // Получить суды по региону
  getByRegion: async (regionId: string) => {
    return withRetry<Court[]>(() =>
      supabase
        .from('courts')
        .select('*')
        .eq('region_id', regionId)
        .order('name')
    );
  },

  // Поиск судов по названию
  searchByName: async (query: string) => {
    return withRetry<Court[]>(() =>
      supabase
        .from('courts')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
    );
  },

  // Найти суд по названию (для привязки к делу)
  findByName: async (courtName: string) => {
    if (!courtName || courtName.trim() === '') {
      return { data: null, error: null };
    }

    try {
      const result = await withRetry<Court>(() =>
        supabase
          .from('courts')
          .select('*')
          .ilike('name', `%${courtName}%`)
          .limit(1)
      );

      if (result.data) {
        return { data: result.data as Court | null, error: null };
      }

      // Если не найдено, пробуем поиск по всем судам и ищем наиболее подходящий
      const searchTerms = courtName.toLowerCase().split(' ').filter(t => t.length > 2);

      if (searchTerms.length > 0) {
        const allResult = await withRetry<Court[]>(() =>
          supabase
            .from('courts')
            .select('*')
            .order('name')
        );

        if (allResult.data && allResult.data.length > 0) {
          const matched = allResult.data.find(court => {
            const courtLower = court.name.toLowerCase();
            return searchTerms.every(term => courtLower.includes(term));
          });

          if (matched) {
            return { data: matched as Court, error: null };
          }
        }
      }

      return { data: null, error: null };
    } catch (err) {
      console.error('Error finding court:', err);
      return { data: null, error: err };
    }
  },
};

export const courtRegions = {
  // Получить все регионы
  getAll: async () => {
    return withRetry<CourtRegion[]>(() =>
      supabase
        .from('court_regions')
        .select('*')
        .order('name')
    );
  },

  // Получить регион по ID
  getById: async (id: string) => {
    return withRetry<CourtRegion>(() =>
      supabase
        .from('court_regions')
        .select('*')
        .eq('id', id)
        .single()
    );
  },

  // Поиск регионов по названию
  searchByName: async (query: string) => {
    return withRetry<CourtRegion[]>(() =>
      supabase
        .from('court_regions')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
    );
  },
};

// =====================================================
// CALENDAR EVENTS - Календарные события
// =====================================================

export const calendarEvents = {
  // Получить все события пользователя
  getByUser: async (userId: string) => {
    return withRetry<CaseCalendarEvent[]>(() =>
      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
    );
  },

  // Получить события на конкретную дату
  getByDate: async (userId: string, date: string) => {
    return withRetry<CaseCalendarEvent[]>(() =>
      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .eq('event_date', date)
        .order('event_time', { ascending: true })
    );
  },

  // Получить события за период
  getByDateRange: async (userId: string, startDate: string, endDate: string) => {
    return withRetry<CaseCalendarEvent[]>(() =>
      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
    );
  },

  // Создать событие
  create: async (eventData: {
    user_id: string;
    title: string;
    event_date: string;
    event_time?: string;
    event_type?: string;
    description?: string;
    case_id?: string;
    is_recurring?: boolean;
    recurrence_rule?: string;
  }) => {
    return withRetry<CaseCalendarEvent>(() =>
      supabase
        .from('calendar_events')
        .insert([{
          user_id: eventData.user_id,
          title: eventData.title,
          event_date: eventData.event_date,
          event_time: eventData.event_time || null,
          event_type: eventData.event_type || 'custom',
          description: eventData.description || null,
          case_id: eventData.case_id || null,
          is_recurring: eventData.is_recurring || false,
          recurrence_rule: eventData.recurrence_rule || null,
        }])
        .select()
        .single()
    );
  },

  // Обновить событие
  update: async (id: string, updates: Partial<{
    title: string;
    event_date: string;
    event_time: string;
    event_type: string;
    description: string;
    case_id: string;
    is_recurring: boolean;
    recurrence_rule: string;
  }>) => {
    return withRetry<CaseCalendarEvent>(() =>
      supabase
        .from('calendar_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Удалить событие
  delete: async (id: string) => {
    return withRetry<any>(() =>
      supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
    );
  },

  // Удалить несколько событий
  deleteMultiple: async (ids: string[]) => {
    return withRetry<any>(() =>
      supabase
        .from('calendar_events')
        .delete()
        .in('id', ids)
    );
  },
};

export const userRewards = {
  // Создать награду для пользователя
  create: async (rewardData: {
    user_id: string;
    reward_type: UserReward['reward_type'];
    reward_value: string;
    description?: string;
    review_id?: string;
    lawyer_id?: string;
    promo_code?: string;
  }) => {
    return withRetry<UserReward>(() =>
      supabase
        .from('user_rewards')
        .insert([{
          user_id: rewardData.user_id,
          reward_type: rewardData.reward_type,
          reward_value: rewardData.reward_value,
          description: rewardData.description || null,
          review_id: rewardData.review_id || null,
          lawyer_id: rewardData.lawyer_id || null,
          promo_code: rewardData.promo_code || null,
          status: 'available',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 дней
        }])
        .select()
        .single()
    );
  },

  // Получить доступные награды пользователя
  getAvailable: async (userId: string) => {
    return withRetry<UserReward[]>(() =>
      supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'available')
        .gt('expires_at', new Date().toISOString())
        .order('earned_at', { ascending: false })
    );
  },

  // Использовать награду
  useReward: async (rewardId: string) => {
    return withRetry<UserReward>(() =>
      supabase
        .from('user_rewards')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rewardId)
        .select()
        .single()
    );
  },

  // Получить историю наград пользователя
  getHistory: async (userId: string) => {
    return withRetry<UserReward[]>(() =>
      supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
    );
  },

  // Применить промокод
  applyPromoCode: async (userId: string, promoCode: string) => {
    const result = await withRetry<any>(() =>
      supabase
        .from('user_rewards')
        .select('*')
        .eq('promo_code', promoCode.toUpperCase())
        .eq('status', 'available')
        .gt('expires_at', new Date().toISOString())
        .single()
    );

    if (result.error || !result.data) {
      return { data: null, error: { message: 'Промокод недействителен или истёк' } };
    }

    if (result.data.user_id !== userId) {
      return { data: null, error: { message: 'Промокод недействителен для этого пользователя' } };
    }

    return { data: result.data as UserReward, error: null };
  },
};

// =====================================================
// BLOG COMMENTS SYSTEM - Система комментариев блога
// =====================================================

export interface BlogPost {
  id?: number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image_url: string;
  author: string;
  read_time: string;
  published: boolean;
  // SEO поля
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  views?: number;
  likes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BlogComment {
  id: string;
  post_id: string;
  user_id: string | null;
  content: string;
  parent_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  rejection_reason: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  is_deleted: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_email?: string;
  user_name?: string;
  user_avatar?: string;
  profile_name?: string;
  profile_avatar?: string;
  replies?: BlogComment[];
}

export interface BlockedUser {
  id: string;
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  fingerprint: string | null;
  reason: string;
  blocked_by: string | null;
  expires_at: string | null;
  blocked_at: string;
  is_active: boolean;
}

export const blogPosts = {
  // Получить все опубликованные статьи
  getPublished: async () => {
    return withRetry<BlogPost[]>(() =>
      supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
    );
  },

  // Получить статью по ID
  getById: async (id: number) => {
    return withRetry<BlogPost>(() =>
      supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single()
    );
  },

  // Получить все статьи (для админа)
  getAll: async () => {
    return withRetry<BlogPost[]>(() =>
      supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
    );
  },

  // Создать статью
  create: async (postData: Partial<BlogPost>) => {
    return withRetry<BlogPost>(() =>
      supabase
        .from('blog_posts')
        .insert([{
          ...postData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single()
    );
  },

  // Обновить статью
  update: async (id: number, updates: Partial<BlogPost>) => {
    return withRetry<BlogPost>(() =>
      supabase
        .from('blog_posts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Увеличить счетчик просмотров
  incrementViews: async (id: number) => {
    return withRetry<any>(() =>
      (async () => {
        const { data: current } = await supabase.from('blog_posts').select('views').eq('id', id).single();
        return supabase
          .from('blog_posts')
          .update({ views: (current?.views || 0) + 1 })
          .eq('id', id)
          .select()
          .single();
      })()
    );
  },

  // Удалить статью
  delete: async (id: number) => {
    return withRetry<any>(() =>
      supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)
    );
  },
};

export const blogComments = {
  // Получить одобренные комментарии для статьи
  getByPostId: async (postId: string) => {
    const result = await withRetry<any>(() =>
      supabase
        .from('blog_comments_with_users')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'approved')
        .eq('is_deleted', false)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
    );

    if (result.error) return { data: null, error: result.error };

    // Получаем ответы для каждого комментария
    const commentsWithReplies = await Promise.all(
      (result.data || []).map(async (comment: BlogComment) => {
        const { data: replies } = await supabase
          .from('blog_comments_with_users')
          .select('*')
          .eq('parent_id', comment.id)
          .eq('status', 'approved')
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });
        return { ...comment, replies: replies || [] };
      })
    );

    return { data: commentsWithReplies, error: null };
  },

  // Получить все комментарии для модерации
  getAllForModeration: async (status?: string) => {
    return withRetry<any>(() => {
      let query = supabase
        .from('blog_comments_with_users')
        .select('*, blog_posts(title, slug)')
        .eq('is_deleted', false);
      
      if (status) {
        query = query.eq('status', status);
      }

      return query.order('created_at', { ascending: false });
    });
  },

  // Получить комментарии пользователя
  getByUserId: async (userId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('blog_comments_with_users')
        .select('*, blog_posts(title, slug)')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
    );
  },

  // Создать комментарий
  create: async (postId: string, content: string, parentId?: string) => {
    return withRetry<BlogComment>(() =>
      supabase
        .from('blog_comments')
        .insert([{
          post_id: postId,
          content: content.trim(),
          parent_id: parentId || null,
          status: 'pending', // По умолчанию на модерации
        }])
        .select()
        .single()
    );
  },

  // Обновить комментарий (в течение 15 минут)
  update: async (id: string, content: string) => {
    return withRetry<BlogComment>(() =>
      supabase
        .from('blog_comments')
        .update({ content: content.trim() })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Удалить комментарий (мягкое удаление)
  delete: async (id: string) => {
    return withRetry<BlogComment>(() =>
      supabase
        .from('blog_comments')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Модерация: одобрить
  approve: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return withRetry<BlogComment>(() =>
      supabase
        .from('blog_comments')
        .update({
          status: 'approved',
          moderated_at: new Date().toISOString(),
          moderated_by: user?.id || null,
        })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Модерация: отклонить
  reject: async (id: string, reason?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return withRetry<BlogComment>(() =>
      supabase
        .from('blog_comments')
        .update({
          status: 'rejected',
          rejection_reason: reason || null,
          moderated_at: new Date().toISOString(),
          moderated_by: user?.id || null,
        })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Модерация: пометить как спам
  markAsSpam: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return withRetry<BlogComment>(() =>
      supabase
        .from('blog_comments')
        .update({
          status: 'spam',
          moderated_at: new Date().toISOString(),
          moderated_by: user?.id || null,
        })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Проверить, лайкнул ли пользователь комментарий
  isLikedByUser: async (commentId: string) => {
    const result = await withRetry<any>(() =>
      supabase
        .from('blog_comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .maybeSingle()
    );
    return { isLiked: !!result.data, error: result.error };
  },

  // Лайкнуть комментарий
  like: async (commentId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('blog_comment_likes')
        .insert([{ comment_id: commentId }])
        .select()
        .single()
    );
  },

  // Убрать лайк
  unlike: async (commentId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('blog_comment_likes')
        .delete()
        .eq('comment_id', commentId)
    );
  },
};

export const documents = {
  // Загрузить документ
  upload: async (userId: string, file: File, folder = 'private') => {
    try {
      // Генерация уникального имени файла
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}-${file.name}`;
      const path = folder === 'shared' ? `shared/${uniqueFileName}` : `${userId}/${uniqueFileName}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Получить публичный URL (если файл в общем бакете)
      let url = null;
      if (folder === 'shared') {
        const { data: publicUrlData } = supabase.storage
          .from('documents')
          .getPublicUrl(path);
        url = publicUrlData.publicUrl;
      }

      return { data, url, error: null };
    } catch (error) {
      console.error('Error uploading document:', error);
      return { data: null, url: null, error };
    }
  },

  // Получить список документов пользователя
  list: async (userId: string, folder = 'private') => {
    try {
      const path = folder === 'shared' ? 'shared' : userId;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .list(path);

      if (error) throw error;

      // Для каждого документа получить URL
      const documentsWithUrls = await Promise.all(
        (data || []).map(async (doc) => {
          const fullPath = folder === 'shared' ? `shared/${doc.name}` : `${userId}/${doc.name}`;
          
          // Получить подписанный URL для доступа
          const { data: urlData } = await supabase.storage
            .from('documents')
            .createSignedUrl(fullPath, 3600); // Срок действия 1 час

          return {
            ...doc,
            url: urlData?.signedUrl || null,
            path: fullPath,
          };
        })
      );

      return { data: documentsWithUrls, error: null };
    } catch (error) {
      console.error('Error listing documents:', error);
      return { data: null, error };
    }
  },

  // Скачать документ
  download: async (userId: string, fileName: string, folder = 'private') => {
    try {
      const path = folder === 'shared' ? `shared/${fileName}` : `${userId}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(path);

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error downloading document:', error);
      return { data: null, error };
    }
  },

  // Удалить документ
  remove: async (userId: string, fileName: string, folder = 'private') => {
    try {
      const path = folder === 'shared' ? `shared/${fileName}` : `${userId}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('documents')
        .remove([path]);

      return { error };
    } catch (error) {
      console.error('Error removing document:', error);
      return { error };
    }
  },
};

export const blockedUsers = {
  // Получить всех заблокированных пользователей
  getAll: async () => {
    return withRetry<BlockedUser[]>(() =>
      supabase
        .from('blocked_users')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false })
    );
  },

  // Заблокировать пользователя
  block: async (params: {
    userId?: string;
    email?: string;
    ipAddress?: string;
    fingerprint?: string;
    reason: string;
    expiresAt?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    return withRetry<BlockedUser>(() =>
      supabase
        .from('blocked_users')
        .insert([{
          user_id: params.userId || null,
          email: params.email || null,
          ip_address: params.ipAddress || null,
          fingerprint: params.fingerprint || null,
          reason: params.reason,
          expires_at: params.expiresAt || null,
          blocked_by: user?.id || null,
        }])
        .select()
        .single()
    );
  },

  // Разблокировать пользователя
  unblock: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return withRetry<BlockedUser>(() =>
      supabase
        .from('blocked_users')
        .update({
          is_active: false,
          unblocked_at: new Date().toISOString(),
          unblocked_by: user?.id || null,
        })
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Проверить, заблокирован ли пользователь
isBlocked: async (userId?: string) => {
    if (!userId) return { isBlocked: false };
    const result = await withRetry<any>(() =>
      supabase.rpc('is_user_blocked', { check_user_id: userId })
    );
    return { isBlocked: result.data === true, error: result.error };
  },
};

// Лимиты просмотров доп. данных юриста
export const lawyerViewLimits = {
  // Проверить, есть ли лимит у пользователя
  checkLimit: async (userId: string, lawyerId: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const profileResult = await withRetry<any>(() =>
      supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .limit(1)
    );
    const profileData = profileResult.data?.[0];
    
    const subscriptionTier = profileData?.subscription_tier || 'free';
    
    // Премиум подписчики - без ограничений
    if (subscriptionTier === 'premium') {
      return { hasLimit: false, remaining: Infinity };
    }
    
    // Бесплатные - 5 показов в месяц
    const limit = 5;
    
    const existingResult = await withRetry<any>(() =>
      supabase
        .from('lawyer_view_limits')
        .select('view_count, current_month')
        .eq('user_id', userId)
        .eq('lawyer_id', lawyerId)
        .eq('current_month', currentMonth)
        .limit(1)
    );
    const existingData = existingResult.data?.[0];
    
    if (existingResult.error) {
      return { hasLimit: false, remaining: limit };
    }
    
    if (!existingData || existingData.current_month !== currentMonth) {
      // Новый месяц - сброс счётчика
      return { hasLimit: false, remaining: limit };
    }
    
    const remaining = limit - existingData.view_count;
    const hasLimit = remaining <= 0;
    
    return { hasLimit, remaining };
  },
  
  // Посчитать просмотр (если лимит не истощён)
  trackView: async (userId: string, lawyerId: string) => {
    const profileResult = await withRetry<any>(() =>
      supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .limit(1)
    );
    const profile = profileResult.data?.[0];
    
    const subscriptionTier = profile?.subscription_tier || 'free';
    
    // Премиум - всегда можно
    if (subscriptionTier === 'premium') {
      return { success: true, remaining: Infinity };
    }
    
    const limit = 5;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const existingResult = await withRetry<any>(() =>
      supabase
        .from('lawyer_view_limits')
        .select('view_count, current_month')
        .eq('user_id', userId)
        .eq('lawyer_id', lawyerId)
        .eq('current_month', currentMonth)
        .limit(1)
    );
    const existing = existingResult.data?.[0];
    
    // Если нет записи - создаём
    if (!existing || existing.current_month !== currentMonth) {
      const insertResult = await withRetry<any>(() =>
        supabase
          .from('lawyer_view_limits')
          .insert([{
            user_id: userId,
            lawyer_id: lawyerId,
            view_count: 1,
            current_month: currentMonth,
          }])
      );
      
      if (insertResult.error) {
        console.error('Error tracking lawyer view:', insertResult.error);
        return { success: false, remaining: limit };
      }
      
      return { success: true, remaining: limit - 1 };
    }
    
    // Увеличиваем счётчик
    const updateResult = await withRetry<any>(() =>
      supabase
        .from('lawyer_view_limits')
        .update({ view_count: existing.view_count + 1, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('lawyer_id', lawyerId)
        .eq('current_month', currentMonth)
    );
    
    if (updateResult.error) {
      console.error('Error updating lawyer view:', updateResult.error);
      return { success: false, remaining: limit - existing.view_count };
    }
    
    const remaining = limit - (existing.view_count + 1);
    const success = remaining >= 0;
    
    return { success, remaining };
  },
};

// =====================================================
// LAWYER FAVORITES - Избранные юристы пользователя
// =====================================================
export const lawyerFavorites = {
  getByUser: async (userId: string) => {
    return withRetry<any[]>(() =>
      supabase
        .from('lawyer_favorites')
        .select('*, lawyers(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );
  },

  getIds: async (userId: string) => {
    const { data, error } = await withRetry<any[]>(() =>
      supabase
        .from('lawyer_favorites')
        .select('lawyer_id')
        .eq('user_id', userId)
    );
    return {
      data: data ? data.map((f: any) => f.lawyer_id) : [],
      error,
    };
  },

  add: async (userId: string, lawyerId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('lawyer_favorites')
        .insert({ user_id: userId, lawyer_id: lawyerId })
        .select()
        .single()
    );
  },

  remove: async (userId: string, lawyerId: string) => {
    return withRetry<any>(() =>
      supabase
        .from('lawyer_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('lawyer_id', lawyerId)
    );
  },
};
