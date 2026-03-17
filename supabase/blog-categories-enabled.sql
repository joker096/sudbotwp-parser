-- Add is_enabled field to blog_categories table
-- This allows disabling categories without deleting them

ALTER TABLE blog_categories 
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true NOT NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_blog_categories_is_enabled 
ON blog_categories(is_enabled);

-- Also add is_enabled to blog_posts for more control
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_is_enabled 
ON blog_posts(is_enabled);
