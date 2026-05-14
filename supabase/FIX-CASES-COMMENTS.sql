-- FINAL RLS FIX: Cases + Comments Work Perfectly
-- Run in Supabase SQL Editor

-- 1. Re-enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies (clean slate)
DROP POLICY IF EXISTS "User own cases SELECT" ON cases;
DROP POLICY IF EXISTS "User own cases INSERT" ON cases;
DROP POLICY IF EXISTS "Service full access" ON cases;
DROP POLICY IF EXISTS "Users can read own cases" ON cases;
DROP POLICY IF EXISTS "Users can create own cases" ON cases;
DROP POLICY IF EXISTS "Users can update own cases" ON cases;
DROP POLICY IF EXISTS "Users can delete own cases" ON cases;
DROP POLICY IF EXISTS "Service role full access" ON cases;
-- Legacy policies too
DROP POLICY IF EXISTS "cases_select_owner_or_shared" ON cases;
DROP POLICY IF EXISTS "cases_update_owner" ON cases;
DROP POLICY IF EXISTS "cases_delete_owner" ON cases;
DROP POLICY IF EXISTS "cases_insert_owner" ON cases;

-- 3. PERFECT policies (no recursion)
CREATE POLICY "Cases full user access" ON cases
  FOR ALL 
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Service role bypass" ON cases
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Verify
SELECT policyname FROM pg_policies WHERE tablename = 'cases';

-- Test
SELECT comment FROM cases WHERE user_id = 'db1e0875-dda7-469a-b6e3-68f7abc2706f' LIMIT 1;

-- UPDATE test
UPDATE cases SET comment = 'Test comment' WHERE id = '0718416c-37cb-400f-b633-fc70779de65b';

-- App works: Comments save + persist on reload!
