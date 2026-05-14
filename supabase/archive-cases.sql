-- Archive cases: add status column and policies
-- Run this migration to add archive functionality to the cases table

-- 1. Add status column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'status'
  ) THEN
    ALTER TABLE cases ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));
  END IF;
END $$;

-- Add index for status
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- 2. RLS Policies for cases
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Users can see their own cases (active, archived, deleted)
DROP POLICY IF EXISTS "Users see own cases" ON cases;
CREATE POLICY "Users see own cases" ON cases
  FOR SELECT
  USING (auth.uid()::uuid = user_id::uuid);

-- Users can update their own cases
DROP POLICY IF EXISTS "Users update own cases" ON cases;
CREATE POLICY "Users update own cases" ON cases
  FOR UPDATE
  USING (auth.uid()::uuid = user_id::uuid)
  WITH CHECK (auth.uid()::uuid = user_id::uuid);

-- Users can delete their own cases
DROP POLICY IF EXISTS "Users delete own cases" ON cases;
CREATE POLICY "Users delete own cases" ON cases
  FOR DELETE
  USING (auth.uid()::uuid = user_id::uuid);

-- 3. Seed data - update existing cases to 'active' if no status
UPDATE cases SET status = 'active' WHERE status IS NULL;
