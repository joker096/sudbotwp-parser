-- Migration: Add missing columns to profiles table
-- Fixes PGRST204 errors for missing schema fields

-- 1. full_name (causes PGRST204)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. is_legal_entity
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_legal_entity BOOLEAN DEFAULT false;

-- 3. role
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'lawyer', 'admin'));

-- 4. lawyer_id
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL;

-- 5. calendar_token
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS calendar_token VARCHAR(64) UNIQUE;

-- 6. telegram_chat_id
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

-- 7. subscription_tier
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium'));

-- 8. subscription_expires
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_expires TIMESTAMPTZ;

-- 9. notification_settings (JSONB)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "browserNotifications": false,
  "telegramBot": false,
  "telegramChatId": "",
  "notifyBeforeHours": 24,
  "notifyOnHearing": true,
  "notifyOnDeadline": true,
  "notifyOnResult": true
}'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_lawyer_id ON public.profiles(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_calendar_token ON public.profiles(calendar_token);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON public.profiles(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_notification ON public.profiles ((notification_settings->>'browserNotifications'));

-- Comments
COMMENT ON COLUMN profiles.full_name IS 'Полное имя пользователя (from Google OAuth)';
COMMENT ON COLUMN profiles.phone IS 'Номер телефона';
COMMENT ON COLUMN profiles.is_legal_entity IS 'Юриское лицо';
COMMENT ON COLUMN profiles.role IS 'Роль: user, lawyer, admin';
COMMENT ON COLUMN profiles.lawyer_id IS 'Связь с профилем юриста';
COMMENT ON COLUMN profiles.calendar_token IS 'Токен для синхронизации календаря (ICS feed)';
COMMENT ON COLUMN profiles.telegram_chat_id IS 'ID чата Telegram для уведомлений';
COMMENT ON COLUMN profiles.subscription_tier IS 'Уровень подписки: free, basic, premium';
COMMENT ON COLUMN profiles.subscription_expires IS 'Дата окончания подписки';
COMMENT ON COLUMN profiles.notification_settings IS 'Настройки уведомлений';
