-- Migration: Add lawyer management columns and policies
-- Run in Supabase SQL Editor

-- Ensure lawyers table has required columns
ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' 
CHECK (status IN ('pending', 'approved', 'rejected', 'blocked'));

-- Set existing lawyers to active/approved (if no status)
UPDATE lawyers SET status = 'approved', is_active = true WHERE status IS NULL;
UPDATE lawyers SET is_active = true WHERE is_active IS NULL;

-- RLS Policies for admins (select/update/insert/delete lawyers)
-- Enable RLS if not already
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;

-- Admin can view all
CREATE POLICY "Admins view lawyers" ON lawyers FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Admin can update all
CREATE POLICY "Admins update lawyers" ON lawyers FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Admin can insert
CREATE POLICY "Admins insert lawyers" ON lawyers FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Admin can delete
CREATE POLICY "Admins delete lawyers" ON lawyers FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Lawyers can view/update own profile
CREATE POLICY "Lawyers own profile" ON lawyers FOR ALL 
USING (user_id = auth.uid());

-- Public read active approved lawyers (for Lawyers.tsx)
CREATE POLICY "Public read active lawyers" ON lawyers FOR SELECT 
USING (is_active = true AND status = 'approved');

