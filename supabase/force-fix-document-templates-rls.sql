-- FORCE Fix document_templates RLS - Ignores existing policies
-- Run this in Supabase SQL Editor when DROP POLICY fails due to naming

-- =====================================================
-- STEP 1: Force drop ALL policies by name (safe)
-- =====================================================
DROP POLICY IF EXISTS "Public read active templates" ON document_templates;
DROP POLICY IF EXISTS "Anyone can view document_templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can insert document_templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can update document_templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can delete document_templates" ON document_templates;
DROP POLICY IF EXISTS "Admin full CRUD access" ON document_templates;

-- =====================================================
-- STEP 2: Verify dropped (should return 0 rows)
-- =====================================================
SELECT policyname FROM pg_policies WHERE tablename = 'document_templates';

-- =====================================================
-- STEP 3: Create CORRECT policies
-- =====================================================

-- Public: Read ONLY active templates
CREATE POLICY "Public read active templates" ON document_templates 
  FOR SELECT 
  USING (is_active = true);

-- Admin/Service: FULL CRUD access
CREATE POLICY "Admin full CRUD access" ON document_templates 
  FOR ALL 
  USING (
    auth.role() = 'service_role' 
    OR (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    auth.role() = 'service_role' 
    OR (auth.jwt() ->> 'role')::text = 'admin'
  );

-- =====================================================
-- STEP 4: Verify created
-- =====================================================
SELECT 
  policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'document_templates';

-- =====================================================
-- STEP 5: RUN DIAGNOSTICS NOW
-- =====================================================
-- Copy results below:

-- Current user role:
SELECT 
  auth.role(),
  auth.uid(),
  (auth.jwt() ->> 'role') as jwt_role;

-- Test SELECT (public):
SELECT COUNT(*) FROM document_templates WHERE is_active = true;

-- SUCCESS: Policies fixed! Test AdminSettings.tsx now.
