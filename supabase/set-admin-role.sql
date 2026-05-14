-- Set Admin Role for Lawyer Management
-- Replace 'your-admin-email@example.com' with your actual admin email

-- 1. Check current profile
SELECT id, email, role FROM profiles WHERE email = 'your-admin-email@example.com';

-- 2. Set admin role (run this)
UPDATE profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-admin-email@example.com';

-- 3. Verify
SELECT id, email, role FROM profiles WHERE email = 'your-admin-email@example.com';

-- 4. Test RLS (should show ALL lawyers)
SELECT * FROM lawyers LIMIT 5;

-- Run steps 2-4 in Supabase SQL Editor after login as admin user

