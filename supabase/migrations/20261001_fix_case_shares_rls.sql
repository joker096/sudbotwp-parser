-- 🚀 ULTIMATE FIX: case_shares RLS Recursion + case_comments ENABLE RLS
-- Run this to fix "infinite recursion detected in policy for relation 'case_shares'"

-- 1. FIX case_shares (main culprit)
ALTER TABLE case_shares DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'case_shares'::regclass LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.polname) || ' ON case_shares';
  END LOOP;
END $$;

ALTER TABLE case_shares ENABLE ROW LEVEL SECURITY;

-- PERFECT policies (no recursion - explicit casts)
CREATE POLICY "case_shares_user_access" ON case_shares 
  FOR ALL 
  USING (auth.uid()::uuid = user_id::uuid)
  WITH CHECK (auth.uid()::uuid = user_id::uuid);

CREATE POLICY "case_shares_service_bypass" ON case_shares 
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. ENABLE RLS on case_comments (was disabled)
ALTER TABLE case_comments DISABLE ROW LEVEL SECURITY;

-- Drop any old policies
DROP POLICY IF EXISTS "case_comments_user_access" ON case_comments;
DROP POLICY IF EXISTS "case_comments_service_bypass" ON case_comments;

ALTER TABLE case_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_comments_user_access" ON case_comments 
  FOR ALL 
  USING (auth.uid()::uuid = user_id::uuid OR case_id IN (SELECT id FROM cases WHERE user_id::uuid = auth.uid()::uuid))
  WITH CHECK (auth.uid()::uuid = user_id::uuid);

CREATE POLICY "case_comments_service_bypass" ON case_comments 
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Verify policies
SELECT 'case_shares' as table_name, policyname, cmd FROM pg_policies WHERE tablename = 'case_shares'
UNION ALL
SELECT 'case_comments' as table_name, policyname, cmd FROM pg_policies WHERE tablename = 'case_comments';

-- 4. Test query (replace with actual case_id)
-- SELECT * FROM case_comments WHERE case_id = '9f48d803-3b2f-4831-be5a-9ae2a11b2471' ORDER BY created_at DESC LIMIT 5;

-- 5. Schema refresh
NOTIFY pgrst, 'reload schema';

-- 🎉 DONE! PaymentModal comments will load without 500 error
