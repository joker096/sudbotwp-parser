export interface CaseEvent {
  date: string;
  time: string;
  name: string;
  location?: string;
  result?: string;
  reason?: string;
}

export interface CaseAppeal {
  id: number | string;
  type: string;
  applicant: string;
  court: string;
  date: string;
  result: string;
}

export interface CaseComment {
  id: string;
  case_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface CaseCalendarEvent {
  id: string;
  case_id: string;
  user_id: string;
  event_date: string;
  event_type: 'hearing' | 'deadline' | 'reminder' | 'custom';
  title: string;
  description?: string;
  created_at: string;
}

export interface ParsedCase {
  id?: string;
  user_id?: string;
  number: string;
  court: string;
  status: string;
  date: string;
  category: string;
  judge: string;
  plaintiff: string;
  defendant: string;
  link: string;
  judicial_uid?: string;
  events: CaseEvent[];
  appeals: CaseAppeal[];
  comment?: string;
  updated_at?: string;
  last_manual_refresh_at?: string;
  auto_refresh_enabled?: boolean;
}

export interface CourtRegion {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Court {
  id: string;
  name: string;
  region_id: string;
  full_address: string;
  phone: string;
  email: string;
  website: string;
  code: string;
  recipient_account: string;
  recipient_bank: string;
  recipient_bik: string;
  treasury_account: string;
  recipient_inn: string;
  tax_period: string;
  recipient_kpp: string;
  recipient_name: string;
  kbk: string;
  oktmo: string;
  payment_basis: string;
  payment_type: string;
  jurisdiction: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  updated_at: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_legal_entity: boolean;
  created_at: string;
  role?: string;
  calendar_token?: string | null;
  telegram_chat_id?: string | null;
  subscription_tier?: 'free' | 'basic' | 'premium';
  subscription_expires?: string | null;
  notification_settings?: {
    browserNotifications: boolean;
    telegramBot: boolean;
    telegramChatId: string;
    notifyBeforeHours: number;
    notifyOnHearing: boolean;
    notifyOnDeadline: boolean;
    notifyOnResult: boolean;
  };
}