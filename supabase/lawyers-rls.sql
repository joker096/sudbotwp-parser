-- RLS Policies for lawyers table
-- Run after create-lawyers-table.sql

-- Policy 1: Admins can do everything
CREATE POLICY "Admins full access" ON lawyers
  FOR ALL
  USING (auth.role() = 'service_role' OR 
         EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policy 2: Lawyers can view their own profile
CREATE POLICY "Lawyers view own" ON lawyers
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy 3: Lawyers can update their own profile (limited fields)
CREATE POLICY "Lawyers update own" ON lawyers
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (
    auth.uid()::text = user_id::text AND
    (name IS NOT NULL AND LENGTH(name) > 0)
  );

-- Policy 4: Public read access to active approved lawyers (for Lawyers.tsx page)
CREATE POLICY "Public read active lawyers" ON lawyers
  FOR SELECT
  USING (is_active = true AND status = 'approved');

-- Policy 5: Authenticated users read approved lawyers
CREATE POLICY "Users read approved lawyers" ON lawyers
  FOR SELECT
  USING (is_active = true AND status = 'approved')
  WITH CHECK (auth.role() != 'anonymous');

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'lawyers';

-- Test queries (run as different roles)
-- As admin/service_role: SELECT * FROM lawyers;
-- As public: SELECT * FROM lawyers WHERE is_active = true AND status = 'approved';
-- As lawyer user: SELECT * FROM lawyers WHERE user_id = auth.uid();

