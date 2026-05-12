-- =====================================================
-- Migration: Sync telegram_chat_id to lawyers table
-- Run this in Supabase SQL Editor after approval flow
-- =====================================================

-- 1. Add missing columns to lawyers table
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS notify_new_leads BOOLEAN DEFAULT TRUE;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS notify_telegram TEXT;

-- 2. Update existing lawyers with telegram_chat_id from profiles
UPDATE lawyers l
SET 
  notify_telegram = p.telegram_chat_id,
  notify_new_leads = COALESCE(l.notify_new_leads, TRUE)
FROM profiles p
WHERE l.user_id = p.id
  AND p.telegram_chat_id IS NOT NULL
  AND (l.notify_telegram IS NULL OR l.notify_telegram = '');

-- 3. Create or replace function to sync telegram on profile update
CREATE OR REPLACE FUNCTION sync_telegram_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile has telegram_chat_id, update lawyers table too
  IF NEW.telegram_chat_id IS NOT NULL THEN
    UPDATE lawyers 
    SET notify_telegram = NEW.telegram_chat_id,
        notify_new_leads = TRUE
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on profiles table
DROP TRIGGER IF EXISTS trg_sync_telegram ON profiles;
CREATE TRIGGER trg_sync_telegram
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_telegram_on_profile_update();

-- 5. Verify sync results
SELECT 
  'lawyers_with_telegram' AS metric,
  COUNT(*) AS count
FROM lawyers 
WHERE notify_telegram IS NOT NULL AND notify_telegram != '';

SELECT
  'profiles_with_telegram' AS metric,
  COUNT(*) AS count
FROM profiles
WHERE telegram_chat_id IS NOT NULL;
