-- Add spam detection tracking columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS checked_for_spam TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS spam_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster spam filtering
CREATE INDEX IF NOT EXISTS idx_leads_checked_for_spam ON leads(checked_for_spam);
CREATE INDEX IF NOT EXISTS idx_leads_status_new ON leads(status) WHERE status = 'new';
