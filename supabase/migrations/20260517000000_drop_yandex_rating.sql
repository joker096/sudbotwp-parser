-- =====================================================
-- Migration: Remove yandex_rating column from lawyers table
-- Run this to clean up after removing Yandex Maps API support
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lawyers' AND column_name = 'yandex_rating') THEN
    ALTER TABLE lawyers DROP COLUMN yandex_rating;
  END IF;
END $$;

-- Verify column is gone
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'lawyers' AND column_name = 'yandex_rating';
-- Should return 0 rows