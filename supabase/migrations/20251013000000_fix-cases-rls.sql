-- ============================================
-- CRITICAL FIX: RLS Policies for CASES table
-- 500 Error: SELECT cases 500 due to broken RLS
-- ============================================

-- Enable RLS if not enabled
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can read own cases + public cases
DROP POLICY IF EXISTS "Users can read own cases" ON cases;
CREATE POLICY "Users can read own cases" ON cases
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    status = 'public' OR
    (auth.role() = 'service_role')
  );

-- 2. INSERT: Authenticated users can create cases for themselves
DROP POLICY IF EXISTS "Users can create own cases" ON cases;
CREATE POLICY "Users can create own cases" ON cases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can update own cases (comment, plaintiff, etc.)
DROP POLICY IF EXISTS "Users can update own cases" ON cases;
CREATE POLICY "Users can update own cases" ON cases
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Users can soft-delete own cases (status='deleted')
DROP POLICY IF EXISTS "Users can delete own cases" ON cases;
CREATE POLICY "Users can delete own cases" ON cases
  FOR UPDATE
  USING (auth.uid() = user_id AND status != 'deleted')
  WITH CHECK (auth.uid() = user_id OR status = 'deleted');

-- Service role full access (cron jobs, admin)
DROP POLICY IF EXISTS "Service role full access" ON cases;
CREATE POLICY "Service role full access" ON cases
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, qual, roles FROM pg_policies WHERE tablename = 'cases';

-- Run this in Supabase SQL Editor!
-- After → npm run dev → comments work + list loads (no 500)

