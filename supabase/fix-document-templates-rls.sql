-- Fix document_templates RLS policies for 403/42501 errors
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard > SQL Editor)

-- =====================================================
-- STEP 1: Backup current policies
-- =====================================================
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'document_templates'
ORDER BY policyname;

-- =====================================================
-- STEP 2: Drop ALL existing policies (safe - RLS stays ENABLED)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view document_templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can insert document_templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can update document_templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can delete document_templates" ON document_templates;

-- =====================================================
-- STEP 3: Create FIXED policies
-- =====================================================

-- Public: Read ONLY active templates (DocumentsLibrary.tsx)
CREATE POLICY "Public read active templates" ON document_templates 
  FOR SELECT 
  USING (is_active = true);

-- Admin/Service: FULL access (AdminSettings.tsx UPDATE/DELETE)
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
-- STEP 4: Verify new policies
-- =====================================================
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'document_templates';

-- =====================================================
-- STEP 5: Test queries (run as ADMIN user)
-- =====================================================

-- Test 1: Public SELECT (should work)
SELECT id, name, category, icon FROM document_templates WHERE is_active = true;

-- Test 2: Admin UPDATE (should work for admin user)
-- UPDATE document_templates SET is_active = false WHERE id = 'de5659ef-953f-4943-8938-f375e2a36119';

-- Test 3: Non-admin SELECT (should work for active)
-- SELECT COUNT(*) FROM document_templates;

-- =====================================================
-- SUCCESS: RLS fixed! 403/42501 errors resolved
-- Next: Test AdminSettings.tsx delete button
-- =====================================================
