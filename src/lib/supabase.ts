import { createClient } from '@supabase/supabase-js';
import { Profile, Court, CourtRegion, CaseCalendarEvent, CaseEvent, CaseAppeal } from '../types';
import { parseCaseClient, parseCaseHtml, ParsedCaseData } from './clientParser';
import { parseWithFullFallback } from './browserlessParser';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const PARSE_CASE_URL = import.meta.env.VITE_PARSE_CASE_URL || `${SUPABASE_URL}/functions/v1/parse-case`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase credentials are missing. Please check your .env file.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const auth = {
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { data: { session }, error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export const profile = {
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data: data as Profile | null, error };
  },

  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data: data as Profile | null, error };
  },

  createProfile: async (userId: string, email: string, name: string) => {
    const { data, error } = await supabase
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
      .single();
    return { data: data as Profile | null, error };
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

export const cases = {
  getCasesByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    console.log('getCasesByUser - raw data count:', data?.length || 0);
    
    // Обрабатываем events и appeals - они могут быть строкой (JSON), массивом или JSONB объектом
    if (data) {
      return {
        data: data.map((caseItem: any) => {
          // Безопасно парсим events
          let events = safeJsonParse(caseItem.events, 'events');
          // Фильтруем и валидируем события, добавляем ID если отсутствует
          events = events.filter(isValidCaseEvent).map((e: any, index: number) => ({
            ...e,
            id: e.id || `${caseItem.id}-evt-${index}`, // Гарантируем уникальный ID
          }));

          // Безопасно парсим appeals
          let appeals = safeJsonParse(caseItem.appeals, 'appeals');
          // Фильтруем и валидируем апелляции, добавляем ID если отсутствует
          appeals = appeals.filter(isValidCaseAppeal).map((a: any, index: number) => ({
            ...a,
            id: a.id || `${caseItem.id}-apl-${index}`, // Гарантируем уникальный ID
          }));
          
          return {
            ...caseItem,
            events,
            appeals,
            // Гарантируем наличие статуса
            status: caseItem.status || 'active',
          };
        }),
        error
      };
    }
    return { data, error };
  },

  getCaseById: async (id: string) => {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  createCase: async (caseData: any) => {
    // Сериализуем events и appeals в JSON для сохранения в БД
    // Убедимся, что это массивы перед сериализацией
    let events = caseData.events;
    let appeals = caseData.appeals;
    
    // Если это уже строка - не преобразуем снова
    if (typeof events !== 'string') {
      events = JSON.stringify(events || []);
    }
    if (typeof appeals !== 'string') {
      appeals = JSON.stringify(appeals || []);
    }
    
    console.log('Creating case with events:', events);
    console.log('Creating case with appeals:', appeals);
    
    const dataToSave = {
      ...caseData,
      events: events,
      appeals: appeals,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('cases')
      .insert([dataToSave])
      .select()
      .single();
    return { data, error };
  },

  updateCase: async (id: string, updates: any) => {
    // Фильтруем поля, которые не должны сохраняться в БД напрямую
    // comment хранится локально в frontend
    const { comment, ...dbUpdates } = updates;
    
    // Сериализуем events и appeals если они есть
    if (dbUpdates.events) {
      dbUpdates.events = typeof dbUpdates.events === 'string' 
        ? dbUpdates.events 
        : JSON.stringify(dbUpdates.events);
    }
    if (dbUpdates.appeals) {
      dbUpdates.appeals = typeof dbUpdates.appeals === 'string' 
        ? dbUpdates.appeals 
        : JSON.stringify(dbUpdates.appeals);
    }
    
    const { data, error } = await supabase
      .from('cases')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  deleteCase: async (id: string) => {
    // Мягкое удаление - устанавливаем статус 'deleted'
    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Массовое удаление дел
  deleteMultipleCases: async (ids: string[], permanent: boolean = false) => {
    if (permanent) {
      // Полное удаление из базы данных
      const { data, error } = await supabase
        .from('cases')
        .delete()
        .in('id', ids);
      return { data, error };
    }
    // Мягкое удаление - устанавливаем статус 'deleted'
    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .in('id', ids)
      .select();
    return { data, error };
  },

  // Восстановить удалённое дело
  restoreCase: async (id: string) => {
    // Для мягкого удаления - просто обновляем статус
    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Массовое восстановление дел
  restoreMultipleCases: async (ids: string[]) => {
    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .in('id', ids)
      .select();
    return { data, error };
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
    
    // Используем Render.com сервер в production (без ограничений по таймауту)
    const parseUrl = import.meta.env.DEV
      ? 'http://localhost:3000/parse-case'
      : (import.meta.env.VITE_PARSE_CASE_URL || 'https://sudbotwp-parser.onrender.com/parse-case');
    console.log('Parsing from server URL:', parseUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 секунд для медленных судебных сайтов
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Render.com сервер не требует авторизации, только Supabase Edge Function
    const isSupabaseUrl = parseUrl.includes('supabase');
    if (!import.meta.env.DEV && isSupabaseUrl) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    
    const response = await fetch(parseUrl, {
      method: 'POST',
      headers,
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
  
  // Если запрошен полный fallback (с Browserless/ScrapingBee) и это production
  if (options?.useFullFallback !== false && !import.meta.env.DEV) {
    console.log('Using full fallback chain with external services...');
    return await parseWithFullFallback(url);
  }
  
  // Стратегия для DEV или когда useFullFallback = false:
  // Клиентский → Серверный (local/Edge Function)
  if (options?.preferClient !== false) {
    try {
      console.log('Trying client-side parsing first...');
      const clientData = await parseCaseClient(url);
      console.log('Client-side parsing successful');
      return { data: clientData, error: null, source: 'client' };
    } catch (clientError: any) {
      console.log('Client-side parsing failed:', clientError.message);
    }
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

// Обновить дело через повторный парсинг
export const refreshCase = async (caseId: string, link: string) => {
  console.log('=== REFRESH CASE FUNCTION ===');
  console.log('caseId:', caseId);
  console.log('link:', link);
  
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
  const updates = {
    number: parsedData.number || '',
    court: parsedData.court || '',
    status: parsedData.status || '',
    date: parsedData.date || '',
    category: parsedData.category || '',
    judge: parsedData.judge || '',
    plaintiff: parsedData.plaintiff || '',
    defendant: parsedData.defendant || '',
    link: link,
    events: JSON.stringify(parsedData.events || []),
    appeals: JSON.stringify(parsedData.appeals || []),
  };
  
  // Обновляем дело в базе данных
  const { data, error } = await supabase
    .from('cases')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating case:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
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
}

export interface Lawyer {
  id: string;
  user_id: string;
  name: string;
  spec: string | null;
  city: string | null;
  rating: number;
  reviews_count: number;
  verified: boolean;
  leads_purchased: number;
  leads_converted: number;
  total_spent: number;
  subscription_tier: 'free' | 'basic' | 'premium';
  subscription_expires: string | null;
  can_buy_leads: boolean;
  max_leads_per_month: number;
  notify_new_leads: boolean;
  notify_telegram: string | null;
  created_at: string;
  updated_at: string;
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
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'new')
      .gt('expires_at', new Date().toISOString())
      .order('price', { ascending: false })
      .order('created_at', { ascending: false });
    return { data: data as Lead[] | null, error };
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

    const { data, error } = await query
      .order('price', { ascending: false })
      .order('created_at', { ascending: false });
    
    return { data: data as Lead[] | null, error };
  },

  // Создать новый лид
  create: async (leadData: Partial<Lead>) => {
    const { data, error } = await supabase
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
      }])
      .select()
      .single();
    return { data: data as Lead | null, error };
  },

  // Получить конкретный лид
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as Lead | null, error };
  },

  // Обновить статус лида
  updateStatus: async (id: string, status: Lead['status']) => {
    const { data, error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as Lead | null, error };
  },

  // Получить лиды пользователя
  getUserLeads: async (userId: string) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    return { data: data as Lead[] | null, error };
  },
};

export const leadPurchases = {
  // Купить лида
  purchase: async (leadId: string, lawyerId: string, price: number) => {
    const { data, error } = await supabase
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
      .single();
    return { data: data as LeadPurchase | null, error };
  },

  // Подтвердить оплату
  confirmPayment: async (purchaseId: string) => {
    const { data, error } = await supabase
      .from('lead_purchases')
      .update({ 
        payment_status: 'paid',
        updated_at: new Date().toISOString() 
      })
      .eq('id', purchaseId)
      .select()
      .single();
    return { data: data as LeadPurchase | null, error };
  },

  // Раскрыть контакты лида
  revealContact: async (purchaseId: string) => {
    // Сначала получаем данные покупки
    const { data: purchase, error: fetchError } = await supabase
      .from('lead_purchases')
      .select('lead_id, lawyer_id')
      .eq('id', purchaseId)
      .single();

    if (fetchError || !purchase) {
      return { data: null, error: fetchError };
    }

    // Раскрываем контакты
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

    if (error) return { data: null, error };

    // Получаем контакты лида
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('client_name, client_phone, client_email')
      .eq('id', purchase.lead_id)
      .single();

    return { data: { purchase: data as LeadPurchase | null, contact: lead }, error: leadError };
  },

  // Получить купленные лиды юриста
  getLawyerPurchases: async (lawyerId: string) => {
    const { data, error } = await supabase
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
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Проверить, куплен ли лид
  checkIfPurchased: async (leadId: string, lawyerId: string) => {
    const { data, error } = await supabase
      .from('lead_purchases')
      .select('id, contact_revealed, status')
      .eq('lead_id', leadId)
      .eq('lawyer_id', lawyerId)
      .single();
    return { data: data as Pick<LeadPurchase, 'id' | 'contact_revealed' | 'status'> | null, error };
  },

  // Обновить статус работы с лидом
  updateStatus: async (purchaseId: string, status: LeadPurchase['status']) => {
    const { data, error } = await supabase
      .from('lead_purchases')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', purchaseId)
      .select()
      .single();
    return { data: data as LeadPurchase | null, error };
  },

  // Оставить обратную связь
  addFeedback: async (purchaseId: string, isUseful: boolean, feedback?: string) => {
    const { data, error } = await supabase
      .from('lead_purchases')
      .update({ 
        is_useful: isUseful,
        client_feedback: feedback,
        updated_at: new Date().toISOString() 
      })
      .eq('id', purchaseId)
      .select()
      .single();
    return { data: data as LeadPurchase | null, error };
  },
};

export const leadBids = {
  // Сделать ставку на лида
  createBid: async (leadId: string, lawyerId: string, amount: number, message?: string) => {
    const { data, error } = await supabase
      .from('lead_bids')
      .insert([{
        lead_id: leadId,
        lawyer_id: lawyerId,
        bid_amount: amount,
        message,
        status: 'active',
      }])
      .select()
      .single();
    return { data: data as LeadBid | null, error };
  },

  // Получить ставки на лид
  getLeadBids: async (leadId: string) => {
    const { data, error } = await supabase
      .from('lead_bids')
      .select('*')
      .eq('lead_id', leadId)
      .eq('status', 'active')
      .order('bid_amount', { ascending: false });
    return { data: data as LeadBid[] | null, error };
  },

  // Принять ставку
  acceptBid: async (bidId: string) => {
    const { data: bid, error: fetchError } = await supabase
      .from('lead_bids')
      .select('lead_id, lawyer_id, bid_amount')
      .eq('id', bidId)
      .single();

    if (fetchError || !bid) return { data: null, error: fetchError };

    // Обновляем статус ставки
    const { error: updateError } = await supabase
      .from('lead_bids')
      .update({ status: 'accepted' })
      .eq('id', bidId);

    if (updateError) return { data: null, error: updateError };

    // Создаём покупку
    return await leadPurchases.purchase(bid.lead_id, bid.lawyer_id, bid.bid_amount);
  },

  // Отклонить ставку
  rejectBid: async (bidId: string) => {
    const { data, error } = await supabase
      .from('lead_bids')
      .update({ status: 'rejected' })
      .eq('id', bidId)
      .select()
      .single();
    return { data: data as LeadBid | null, error };
  },
};

export const lawyers = {
  // Получить профиль юриста
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('lawyers')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data: data as Lawyer | null, error };
  },

  // Создать профиль юриста
  createProfile: async (userId: string, name: string, spec?: string, city?: string) => {
    const { data, error } = await supabase
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
      .single();
    return { data: data as Lawyer | null, error };
  },

  // Обновить профиль
  updateProfile: async (userId: string, updates: Partial<Lawyer>) => {
    const { data: lawyer, error: findError } = await supabase
      .from('lawyers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (findError || !lawyer) return { data: null, error: findError };

    const { data, error } = await supabase
      .from('lawyers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', lawyer.id)
      .select()
      .single();
    return { data: data as Lawyer | null, error };
  },

  // Получить статистику юриста
  getStats: async (userId: string) => {
    const { data: lawyer, error } = await supabase
      .from('lawyers')
      .select('leads_purchased, leads_converted, total_spent, rating')
      .eq('user_id', userId)
      .single();

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
    const { data, error } = await supabase
      .from('lawyers')
      .select('*')
      .order('rating', { ascending: false });
    return { data: data as Lawyer[] | null, error };
  },

  // Получить отзывы о юристе
  getReviews: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('lawyer_reviews')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    return { data, error };
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
    // Проверяем через case_lawyer_links
    const { data: link, error: linkError } = await supabase
      .from('case_lawyer_links')
      .select('id, case_id')
      .eq('user_id', userId)
      .eq('lawyer_id', lawyerId)
      .eq('status', 'confirmed')
      .single();

    if (link) {
      return { canReview: true, caseId: link.case_id, reason: 'Связь с юристом подтверждена' };
    }

    // Проверяем через lead_purchases
    const { data: purchase, error: purchaseError } = await supabase
      .from('lead_purchases')
      .select('id')
      .eq('lawyer_id', lawyerId)
      .single();

    // Проверяем, есть ли у пользователя дело
    const { data: userCase } = await supabase
      .from('cases')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

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
    const { data, error } = await supabase
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
      .single();
    return { data: data as LawyerReview | null, error };
  },

  // Получить одобренные отзывы о юристе
  getApproved: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('lawyer_reviews')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    return { data: data as LawyerReview[] | null, error };
  },

  // Получить все отзывы пользователя
  getUserReviews: async (userId: string) => {
    const { data, error } = await supabase
      .from('lawyer_reviews')
      .select('*, lawyers(name, spec)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
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
    const { data, error } = await supabase
      .from('case_lawyer_links')
      .insert([{
        case_id: linkData.case_id,
        lawyer_id: linkData.lawyer_id,
        user_id: linkData.user_id,
        description: linkData.description || null,
        status: 'pending',
      }])
      .select()
      .single();
    return { data: data as CaseLawyerLink | null, error };
  },

  // Подтвердить связь (юрист подтверждает)
  confirm: async (linkId: string, isLawyer: boolean) => {
    const updateField = isLawyer ? 'confirmed_by_lawyer' : 'confirmed_by_user';
    const { data, error } = await supabase
      .from('case_lawyer_links')
      .update({
        [updateField]: true,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId)
      .select()
      .single();
    return { data: data as CaseLawyerLink | null, error };
  },

  // Отклонить связь
  reject: async (linkId: string) => {
    const { data, error } = await supabase
      .from('case_lawyer_links')
      .update({ status: 'denied', updated_at: new Date().toISOString() })
      .eq('id', linkId)
      .select()
      .single();
    return { data: data as CaseLawyerLink | null, error };
  },

  // Получить связи пользователя
  getUserLinks: async (userId: string) => {
    const { data, error } = await supabase
      .from('case_lawyer_links')
      .select('*, lawyers(name, spec, city), cases(number, court)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Получить связи юриста
  getLawyerLinks: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('case_lawyer_links')
      .select('*, cases(number, court), profiles(full_name)')
      .eq('lawyer_id', lawyerId)
      .order('created_at', { ascending: false });
    return { data, error };
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
    const { data, error } = await supabase
      .from('case_outcomes')
      .insert([{
        case_id: outcomeData.case_id,
        lawyer_id: outcomeData.lawyer_id,
        user_id: outcomeData.user_id,
        outcome: outcomeData.outcome,
        outcome_description: outcomeData.outcome_description || null,
      }])
      .select()
      .single();
    return { data: data as CaseOutcome | null, error };
  },

  // Подтвердить исход (юрист подтверждает успех)
  confirmByLawyer: async (outcomeId: string, outcome: CaseOutcome['outcome']) => {
    const { data, error } = await supabase
      .from('case_outcomes')
      .update({
        confirmed_by_lawyer: true,
        confirmed_by_lawyer_at: new Date().toISOString(),
        outcome,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outcomeId)
      .select()
      .single();
    return { data: data as CaseOutcome | null, error };
  },

  // Подтвердить исход (пользователь подтверждает)
  confirmByUser: async (outcomeId: string) => {
    // Сначала получаем текущий исход
    const { data: current, error: fetchError } = await supabase
      .from('case_outcomes')
      .select('*')
      .eq('id', outcomeId)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    const bothConfirmed = current.confirmed_by_lawyer && current.outcome === 'won';

    const { data, error } = await supabase
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
      .single();

    // Если обе стороны подтвердили успех - начисляем награду юристу
    if (bothConfirmed && !current.both_confirmed) {
      await lawyerRewards.create({
        lawyer_id: current.lawyer_id,
        reward_type: 'free_lead',
        reward_value: 1,
        case_id: current.case_id,
      });
    }

    return { data: data as CaseOutcome | null, error };
  },

  // Получить исходы пользователя
  getUserOutcomes: async (userId: string) => {
    const { data, error } = await supabase
      .from('case_outcomes')
      .select('*, lawyers(name, spec), cases(number, court)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Получить исходы юриста
  getLawyerOutcomes: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('case_outcomes')
      .select('*, cases(number, court), profiles(full_name)')
      .eq('lawyer_id', lawyerId)
      .order('created_at', { ascending: false });
    return { data, error };
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
    const { data, error } = await supabase
      .from('lawyer_rewards')
      .insert([{
        lawyer_id: rewardData.lawyer_id,
        reward_type: rewardData.reward_type,
        reward_value: rewardData.reward_value,
        case_id: rewardData.case_id || null,
        status: 'available',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 дней
      }])
      .select()
      .single();
    return { data: data as LawyerReward | null, error };
  },

  // Получить доступные награды юриста
  getAvailable: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('lawyer_rewards')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString())
      .order('earned_at', { ascending: true });
    return { data: data as LawyerReward[] | null, error };
  },

  // Использовать награду (получить бесплатный лид)
  useReward: async (rewardId: string, leadId: string) => {
    const { data, error } = await supabase
      .from('lawyer_rewards')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        used_for_lead_id: leadId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rewardId)
      .select()
      .single();
    return { data: data as LawyerReward | null, error };
  },

  // Получить историю наград юриста
  getHistory: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('lawyer_rewards')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .order('earned_at', { ascending: false });
    return { data: data as LawyerReward[] | null, error };
  },
};

export const courts = {
  // Получить все суды
  getAll: async () => {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .order('name');
    return { data: data as Court[] | null, error };
  },

  // Получить суд по ID
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as Court | null, error };
  },

  // Получить суды по региону
  getByRegion: async (regionId: string) => {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('region_id', regionId)
      .order('name');
    return { data: data as Court[] | null, error };
  },

  // Поиск судов по названию
  searchByName: async (query: string) => {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name');
    return { data: data as Court[] | null, error };
  },

  // Найти суд по названию (для привязки к делу)
  findByName: async (courtName: string) => {
    if (!courtName || courtName.trim() === '') {
      return { data: null, error: null };
    }
    
    try {
      // Сначала пробуем нечёткое совпадение с помощью ilike
      let { data, error } = await supabase
        .from('courts')
        .select('*')
        .ilike('name', `%${courtName}%`)
        .limit(1);
      
      if (data && data.length > 0) {
        return { data: data[0] as Court | null, error: null };
      }
      
      // Если не найдено, пробуем поиск по всем судам и ищем наиболее подходящий
      const searchTerms = courtName.toLowerCase().split(' ').filter(t => t.length > 2);
      
      if (searchTerms.length > 0) {
        const { data: allCourts } = await supabase
          .from('courts')
          .select('*')
          .order('name');
        
        if (allCourts && allCourts.length > 0) {
          // Ищем суд, в названии которого есть все слова из искомого
          const matched = allCourts.find(court => {
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
    const { data, error } = await supabase
      .from('court_regions')
      .select('*')
      .order('name');
    return { data: data as CourtRegion[] | null, error };
  },

  // Получить регион по ID
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('court_regions')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as CourtRegion | null, error };
  },

  // Поиск регионов по названию
  searchByName: async (query: string) => {
    const { data, error } = await supabase
      .from('court_regions')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name');
    return { data: data as CourtRegion[] | null, error };
  },
};

// =====================================================
// CALENDAR EVENTS - Календарные события
// =====================================================

export const calendarEvents = {
  // Получить все события пользователя
  getByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true });
    return { data: data as CaseCalendarEvent[] | null, error };
  },

  // Получить события на конкретную дату
  getByDate: async (userId: string, date: string) => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_date', date)
      .order('event_time', { ascending: true });
    return { data: data as CaseCalendarEvent[] | null, error };
  },

  // Получить события за период
  getByDateRange: async (userId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true });
    return { data: data as CaseCalendarEvent[] | null, error };
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
    const { data, error } = await supabase
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
      .single();
    return { data: data as CaseCalendarEvent | null, error };
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
    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as CaseCalendarEvent | null, error };
  },

  // Удалить событие
  delete: async (id: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Удалить несколько событий
  deleteMultiple: async (ids: string[]) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .in('id', ids);
    return { error };
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
    const { data, error } = await supabase
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
      .single();
    return { data: data as UserReward | null, error };
  },

  // Получить доступные награды пользователя
  getAvailable: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString())
      .order('earned_at', { ascending: false });
    return { data: data as UserReward[] | null, error };
  },

  // Использовать награду
  useReward: async (rewardId: string) => {
    const { data, error } = await supabase
      .from('user_rewards')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rewardId)
      .select()
      .single();
    return { data: data as UserReward | null, error };
  },

  // Получить историю наград пользователя
  getHistory: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    return { data: data as UserReward[] | null, error };
  },

  // Применить промокод
  applyPromoCode: async (userId: string, promoCode: string) => {
    const { data: reward, error: fetchError } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('promo_code', promoCode.toUpperCase())
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !reward) {
      return { data: null, error: { message: 'Промокод недействителен или истёк' } };
    }

    // Проверяем, что пользователь не использовал этот промокод
    if (reward.user_id !== userId) {
      return { data: null, error: { message: 'Промокод недействителен для этого пользователя' } };
    }

    return { data: reward as UserReward, error: null };
  },
};

// =====================================================
// BLOG COMMENTS SYSTEM - Система комментариев блога
// =====================================================

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  author_id: string | null;
  author_name: string | null;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
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
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    return { data: data as BlogPost[] | null, error };
  },

  // Получить статью по slug
  getBySlug: async (slug: string) => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return { data: data as BlogPost | null, error };
  },

  // Получить все статьи (для админа)
  getAll: async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: data as BlogPost[] | null, error };
  },

  // Создать статью
  create: async (postData: Partial<BlogPost>) => {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([{
        ...postData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();
    return { data: data as BlogPost | null, error };
  },

  // Обновить статью
  update: async (id: string, updates: Partial<BlogPost>) => {
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    return { data: data as BlogPost | null, error };
  },

  // Увеличить счетчик просмотров
  incrementViews: async (id: string) => {
    const { data, error } = await supabase
      .from('blog_posts')
      .update({ views_count: supabase.rpc('increment', { row_id: id }) })
      .eq('id', id)
      .select()
      .single();
    return { data: data as BlogPost | null, error };
  },

  // Удалить статью
  delete: async (id: string) => {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);
    return { error };
  },
};

export const blogComments = {
  // Получить одобренные комментарии для статьи
  getByPostId: async (postId: string) => {
    const { data, error } = await supabase
      .from('blog_comments_with_users')
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'approved')
      .eq('is_deleted', false)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    // Получаем ответы для каждого комментария
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment: BlogComment) => {
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
    let query = supabase
      .from('blog_comments_with_users')
      .select('*, blog_posts(title, slug)')
      .eq('is_deleted', false);
    
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data: data as (BlogComment & { blog_posts: { title: string; slug: string } })[] | null, error };
  },

  // Получить комментарии пользователя
  getByUserId: async (userId: string) => {
    const { data, error } = await supabase
      .from('blog_comments_with_users')
      .select('*, blog_posts(title, slug)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    return { data: data as (BlogComment & { blog_posts: { title: string; slug: string } })[] | null, error };
  },

  // Создать комментарий
  create: async (postId: string, content: string, parentId?: string) => {
    const { data, error } = await supabase
      .from('blog_comments')
      .insert([{
        post_id: postId,
        content: content.trim(),
        parent_id: parentId || null,
        status: 'pending', // По умолчанию на модерации
      }])
      .select()
      .single();
    return { data: data as BlogComment | null, error };
  },

  // Обновить комментарий (в течение 15 минут)
  update: async (id: string, content: string) => {
    const { data, error } = await supabase
      .from('blog_comments')
      .update({ content: content.trim() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as BlogComment | null, error };
  },

  // Удалить комментарий (мягкое удаление)
  delete: async (id: string) => {
    const { data, error } = await supabase
      .from('blog_comments')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data: data as BlogComment | null, error };
  },

  // Модерация: одобрить
  approve: async (id: string) => {
    const { data, error } = await supabase
      .from('blog_comments')
      .update({
        status: 'approved',
        moderated_at: new Date().toISOString(),
        moderated_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', id)
      .select()
      .single();
    return { data: data as BlogComment | null, error };
  },

  // Модерация: отклонить
  reject: async (id: string, reason?: string) => {
    const { data, error } = await supabase
      .from('blog_comments')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        moderated_at: new Date().toISOString(),
        moderated_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', id)
      .select()
      .single();
    return { data: data as BlogComment | null, error };
  },

  // Модерация: пометить как спам
  markAsSpam: async (id: string) => {
    const { data, error } = await supabase
      .from('blog_comments')
      .update({
        status: 'spam',
        moderated_at: new Date().toISOString(),
        moderated_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', id)
      .select()
      .single();
    return { data: data as BlogComment | null, error };
  },

  // Проверить, лайкнул ли пользователь комментарий
  isLikedByUser: async (commentId: string) => {
    const { data, error } = await supabase
      .from('blog_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .maybeSingle();
    return { isLiked: !!data, error };
  },

  // Лайкнуть комментарий
  like: async (commentId: string) => {
    const { data, error } = await supabase
      .from('blog_comment_likes')
      .insert([{ comment_id: commentId }])
      .select()
      .single();
    return { data, error };
  },

  // Убрать лайк
  unlike: async (commentId: string) => {
    const { error } = await supabase
      .from('blog_comment_likes')
      .delete()
      .eq('comment_id', commentId);
    return { error };
  },
};

export const blockedUsers = {
  // Получить всех заблокированных пользователей
  getAll: async () => {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('is_active', true)
      .order('blocked_at', { ascending: false });
    return { data: data as BlockedUser[] | null, error };
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
    const { data, error } = await supabase
      .from('blocked_users')
      .insert([{
        user_id: params.userId || null,
        email: params.email || null,
        ip_address: params.ipAddress || null,
        fingerprint: params.fingerprint || null,
        reason: params.reason,
        expires_at: params.expiresAt || null,
        blocked_by: (await supabase.auth.getUser()).data.user?.id,
      }])
      .select()
      .single();
    return { data: data as BlockedUser | null, error };
  },

  // Разблокировать пользователя
  unblock: async (id: string) => {
    const { data, error } = await supabase
      .from('blocked_users')
      .update({
        is_active: false,
        unblocked_at: new Date().toISOString(),
        unblocked_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', id)
      .select()
      .single();
    return { data: data as BlockedUser | null, error };
  },

  // Проверить, заблокирован ли пользователь
  isBlocked: async (userId?: string) => {
    if (!userId) return { isBlocked: false };
    const { data, error } = await supabase
      .rpc('is_user_blocked', { check_user_id: userId });
    return { isBlocked: data === true, error };
  },
};
