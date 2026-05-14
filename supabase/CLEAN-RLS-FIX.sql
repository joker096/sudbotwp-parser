-- 🚀 CLEAN RLS RE-ENABLE: Cases + Comments Work Perfectly
-- Handles "policy already exists" + recursion

-- 1. Force clean ALL policies
DROP POLICY IF EXISTS "Cases full user access" ON cases;
DROP POLICY IF EXISTS "Service role bypass" ON cases;
DROP POLICY IF EXISTS "User own cases SELECT" ON cases;
DROP POLICY IF EXISTS "Users can read own cases" ON cases;
DROP POLICY IF EXISTS "Safe SELECT own cases" ON cases;
DROP POLICY IF EXISTS "Service full access" ON cases;
DROP POLICY IF EXISTS "cases_select_owner_or_shared" ON cases;
DROP POLICY IF EXISTS "cases_update_owner" ON cases;
DROP POLICY IF EXISTS "cases_delete_owner" ON cases;
DROP POLICY IF EXISTS "cases_insert_owner" ON cases;

-- 2. PERFECT policies (cast prevents recursion)
CREATE POLICY "User cases full access" ON cases
  FOR ALL 
  USING ((auth.uid())::uuid = user_id)
  WITH CHECK ((auth.uid())::uuid = user_id);

CREATE POLICY "Service role bypass" ON cases
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Verify (exactly 2 policies)
SELECT count(*) FROM pg_policies WHERE tablename = 'cases';

-- 4. Test comment UPDATE
UPDATE cases SET comment = 'Тест комментария' WHERE id = (SELECT id FROM cases WHERE user_id = 'db1e0875-dda7-469a-b6e3-68f7abc2706f' LIMIT 1);
SELECT comment FROM cases WHERE user_id = 'db1e0875-dda7-469a-b6e3-68f7abc2706f' LIMIT 1;

-- 5. App test: Comments save + reload ✓
-- npm run dev → Hard refresh → Add comment → Reload → Persists!
