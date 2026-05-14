-- Add lawyer_id to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_lawyer_id ON profiles(lawyer_id);

-- Verify
SELECT COUNT(*) as total FROM profiles WHERE lawyer_id IS NOT NULL;
