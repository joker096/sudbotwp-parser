-- Force schema refresh for case_comments table
-- This migration ensures the table schema is properly published

-- First, ensure user_id column exists with proper type
ALTER TABLE case_comments 
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS text TEXT;

-- Set up foreign key if users table exists
-- ALTER TABLE case_comments 
--   ADD CONSTRAINT fk_user 
--   FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Ensure RLS is off for now
ALTER TABLE case_comments DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON case_comments TO anon, authenticated, service_role;

-- Force schema cache refresh by touching the table
NOTIFY pgrst, 'reload schema';