-- ULTIMATE FIX: document_templates RLS Policies
-- Run this ENTIRE script in Supabase SQL Editor AFTER setting admin role

-- =====================================================
-- STEP 1: Backup current policies
-- =====================================================
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'document_templates';

-- =====================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- =====================================================
DROP POLICY IF EXISTS \"Public read active templates\" ON document_templates;
DROP POLICY IF EXISTS \"Anyone can view document_templates\" ON document_templates;
DROP POLICY IF EXISTS \"Admins can insert document_templates\" ON document_templates;
DROP POLICY IF EXISTS \"Admins can update document_templates\" ON document_templates;
DROP POLICY IF EXISTS \"Admins can delete document_templates\" ON document_templates;
DROP POLICY IF EXISTS \"Admin full CRUD access\" ON document_templates;
DROP POLICY IF EXISTS \"Admin CRUD via profiles\" ON document_templates;

-- =====================================================
-- STEP 3: Verify dropped (0 rows)
-- =====================================================
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'document_templates';

-- =====================================================
-- STEP 4: CREATE PROPER POLICIES
-- Public: Read ONLY active templates (DocumentsLibrary.tsx)
-- =====================================================
CREATE POLICY \"Public read active templates\" ON document_templates
FOR SELECT USING (is_active = true);

-- Admin: FULL CRUD via profiles.role='admin' (AdminSettings.tsx)
-- =====================================================
CREATE POLICY \"Admin CRUD via profiles\" ON document_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- STEP 5: Verify new policies (2 rows)
-- =====================================================
SELECT 
  policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'document_templates' 
ORDER BY policyname;

-- =====================================================
-- STEP 6: Test queries
-- =====================================================
-- Public SELECT (works for all)
SELECT COUNT(*) FROM document_templates WHERE is_active = true;

-- Admin UPDATE test (login as admin, should work)
-- UPDATE document_templates SET updated_at = NOW() WHERE id = (SELECT id FROM document_templates LIMIT 1) RETURNING *;

-- =====================================================
-- SUCCESS: RLS fixed! Test AdminSettings.tsx delete now.
-- Delete button should ONLY work for admin + instant UI update.
-- =====================================================

