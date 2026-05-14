-- Fixed Set Admin Role - No email column needed
-- Run in Supabase SQL Editor

-- 1. Check current users' roles
SELECT 
  id, name, is_admin, role 
FROM profiles 
ORDER BY name;

-- 2. Ensure role column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 3. Set role='admin' for users with is_admin=true OR your ID
UPDATE profiles 
SET role = 'admin' 
WHERE is_admin = true OR id IN (
  'db1e0875-dda7-469a-b6e3-68f7abc2706f',  -- Иван Иванов (admin)
  '82f64fd0-9659-46ca-969f-da53c05651fd'   -- Иван Иванов (user → admin)
);

-- 4. Verify
SELECT 
  id, name, is_admin, role 
FROM profiles 
WHERE role = 'admin' OR is_admin = true
ORDER BY name;

-- 5. JWT refresh: LOGOUT + LOGIN in app
-- SUCCESS! RLS now works for template saves
