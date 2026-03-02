-- ============================================
-- BLOG COMMENTS VIEW - Добавляет представление для комментариев
-- Предполагает что таблицы blog_posts и blog_comments уже существуют
-- ============================================

-- Проверяем существующие таблицы и типы колонок
-- Создаем таблицу blog_comments только если её нет
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id BIGINT REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  rejection_reason TEXT,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON blog_comments(status);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_at ON blog_comments(created_at DESC);

-- RLS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Политика для публичного просмотра одобренных комментариев
DROP POLICY IF EXISTS "blog_comments_select_approved" ON blog_comments;
CREATE POLICY "blog_comments_select_approved" 
  ON blog_comments FOR SELECT 
  USING (status = 'approved' AND is_deleted = FALSE);

-- Права
GRANT SELECT ON blog_comments TO anon, authenticated;

-- Создаем представление
DROP VIEW IF EXISTS blog_comments_with_users;
CREATE VIEW blog_comments_with_users AS
SELECT 
  c.id,
  c.post_id,
  c.user_id,
  c.content,
  c.parent_id,
  c.status,
  c.rejection_reason,
  c.moderated_by,
  c.moderated_at,
  c.is_deleted,
  c.deleted_at,
  c.deleted_by,
  c.likes_count,
  c.created_at,
  c.updated_at,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_name,
  u.raw_user_meta_data->>'avatar_url' as user_avatar
FROM blog_comments c
LEFT JOIN auth.users u ON c.user_id = u.id;

-- Права на представление
GRANT SELECT ON blog_comments_with_users TO anon, authenticated;
