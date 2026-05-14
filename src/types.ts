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
  lawyer_id?: string | null;
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

// Lawyer types
export interface Lawyer {
  id: string;
  user_id?: string;
  name: string;
  spec?: string;
  specialization?: string;
  city?: string;
  region?: string;
  rating?: number;
  reviews?: number;
  reviews_count?: number;
  verified?: boolean;
  img?: string;
  avatar_url?: string | null;
  photo_url?: string | null;
  yandex_rating?: number;
  website?: string;
  phone?: string;
  email?: string;
  experience?: string;
  experience_years?: number;
  description?: string;
  is_active?: boolean;
   is_featured?: boolean;
   status?: 'pending' | 'approved' | 'rejected' | 'blocked';
   subscription_tier?: 'free' | 'basic' | 'premium' | 'featured';
  subscription_expires_at?: string;
  created_at?: string;
  telegram?: string;
  license_number?: string;
  practice_areas?: string[];
  languages?: string[];
  updated_at?: string;
}

export interface LawyerApplication {
  id: string;
  user_id?: string;
  name: string;
  specialization?: string;
  city?: string;
  region?: string;
  phone?: string;
  email?: string;
  experience_years?: number;
  description?: string;
  documents?: string[];
  certificate_number?: string;
  status?: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at?: string;
  processed_at?: string;
}

// Заявление о принятии в гражданство
export interface CitizenshipApplication {
  id: string;
  user_id?: string;
  full_name: string;
  birth_date: string;
  birth_place: string;
  citizenship: string;
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issue_date: string;
  registration_address: string;
  phone: string;
  email: string;
  marital_status: 'single' | 'married' | 'divorced' | 'widowed';
  spouse_name?: string;
  spouse_citizenship?: string;
  children?: CitizenshipChild[];
  employment_status: 'employed' | 'self_employed' | 'unemployed' | 'student';
  employer_name?: string;
  work_address?: string;
  income_source?: string;
  criminal_record: 'yes' | 'no';
  criminal_details?: string;
  language_knowledge: 'basic' | 'intermediate' | 'fluent' | 'native';
  language_details?: string;
  knowledge_of_history: 'basic' | 'intermediate' | 'advanced';
  knowledge_details?: string;
  attachment_documents: string[];
  additional_info?: string;
  created_at?: string;
  telegram?: string;
  updated_at?: string;
}

export interface CitizenshipChild {
  name: string;
  birth_date: string;
  citizenship: string;
}

// Auth user type (from Supabase sessions)
export interface User {
  id?: string;
  email?: string | null;
  avatar_url?: string | null;
  profile_data?: Profile;
}