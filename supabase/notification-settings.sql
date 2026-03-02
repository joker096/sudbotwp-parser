-- Add notification_settings column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"browserNotifications": false, "telegramBot": false, "telegramChatId": "", "notifyBeforeHours": 24, "notifyOnHearing": true, "notifyOnDeadline": true, "notifyOnResult": true}'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_notification_settings ON public.profiles ((notification_settings->>'browserNotifications'));
