-- DIAGNOSE document_templates RLS Issues
-- Run in Supabase SQL Editor to identify exact problem

-- 1. Current RLS policies
SELECT 
  policyname, cmd, qual, with_check, roles
FROM pg_policies 
WHERE tablename = 'document_templates';

-- 2. RLS status
SELECT 
  tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'document_templates';

-- 3. Test data exists?
SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM document_templates;

-- 4. Current user role (must login as admin)
SELECT 
  auth.role(),
  auth.uid(),
  (auth.jwt() ->> 'role') as jwt_role,
  (SELECT role FROM profiles WHERE id = auth.uid()) as profile_role;

-- 5. Test SELECT (should work)
SELECT id, name FROM document_templates WHERE is_active = true LIMIT 3;

-- 6. Test UPDATE as admin (expect success if role=admin/service_role)
-- UPDATE document_templates SET updated_at = NOW() WHERE id = 'de5659ef-953f-4943-8938-f375e2a36119' RETURNING *;

-- =====================================================
-- EXPECTED OUTPUT:
-- Policies: "Public read active templates" + "Admin full CRUD access"  
-- RLS: enabled
-- User: jwt_role = 'admin' OR auth.role() = 'service_role'
-- =====================================================
