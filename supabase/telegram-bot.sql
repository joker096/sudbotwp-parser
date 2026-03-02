-- Add telegram_chat_id column to profiles table for faster queries
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

-- Create index for faster queries by telegram_chat_id
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON public.profiles (telegram_chat_id);

-- Enable RLS on the new column
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow service role to update telegram_chat_id
CREATE POLICY IF NOT EXISTS "Service role can update telegram_chat_id"
ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (true);
