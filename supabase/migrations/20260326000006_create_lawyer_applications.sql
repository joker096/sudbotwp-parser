-- Create lawyer_applications table
CREATE TABLE IF NOT EXISTS lawyer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  experience_years INTEGER NOT NULL,
  description TEXT NOT NULL,
  certificate_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE lawyer_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own applications
CREATE POLICY "Users can view own applications"
  ON lawyer_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all
CREATE POLICY "Admins can view all applications"
  ON lawyer_applications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy: Service role full access
CREATE POLICY "Service role full access"
  ON lawyer_applications FOR ALL
  USING (auth.role() = 'service_role');

-- Grants
GRANT SELECT ON lawyer_applications TO anon, authenticated;
GRANT ALL ON lawyer_applications TO service_role;

-- Verify
SELECT COUNT(*) as total FROM lawyer_applications;
