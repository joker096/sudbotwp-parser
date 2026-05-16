-- Create lawyer_favorites table for user bookmarks
CREATE TABLE IF NOT EXISTS lawyer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lawyer_id)
);

-- Enable RLS
ALTER TABLE lawyer_favorites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own favorites"
  ON lawyer_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON lawyer_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON lawyer_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_lawyer_favorites_user_id ON lawyer_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_favorites_lawyer_id ON lawyer_favorites(lawyer_id);
