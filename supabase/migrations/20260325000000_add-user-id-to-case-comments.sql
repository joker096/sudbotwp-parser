-- Add user_id column to case_comments table
ALTER TABLE case_comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_case_comments_case_id ON case_comments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_comments_user_id ON case_comments(user_id);

-- Disable RLS for now (simpler for testing)
ALTER TABLE case_comments DISABLE ROW LEVEL SECURITY;

-- Allow all access
GRANT ALL ON case_comments TO anon, authenticated, service_role;