-- Add comment column to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS comment TEXT;
