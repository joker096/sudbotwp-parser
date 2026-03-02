-- ============================================
-- BLOG COMMENTS SYSTEM
-- Система комментариев для блога с предмодерацией
-- ============================================

-- Таблица статей блога (для хранения в базе данных)
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category VARCHAR(100),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(255),
  featured_image TEXT,
  
  -- SEO мета-теги
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  og_title VARCHAR(255),
  og_description TEXT,
  og_image TEXT,
  canonical_url TEXT,
  
  -- Статус публикации
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Статистика
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- Таблица комментариев к статьям блога
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Данные комментария
  content TEXT NOT NULL,
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
  
  -- Статус модерации
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  
  -- Причина отклонения (для администратора)
  rejection_reason TEXT,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  
  -- Флаги
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Статистика
  likes_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для blog_comments
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON blog_comments(status);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_at ON blog_comments(created_at DESC);

-- Таблица для отслеживания лайков комментариев
CREATE TABLE IF NOT EXISTS blog_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES blog_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_comment_likes_comment_id ON blog_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_blog_comment_likes_user_id ON blog_comment_likes(user_id);

-- Таблица для отслеживания заблокированных пользователей (спамеров)
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Данные для блокировки по IP/Email (для незарегистрированных)
  email VARCHAR(255),
  ip_address INET,
  fingerprint TEXT,
  
  -- Причина блокировки
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Срок блокировки (NULL = бессрочно)
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Статистика
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  is_active BOOLEAN DEFAULT TRUE
);

-- Индексы для blocked_users
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_email ON blocked_users(email);
CREATE INDEX IF NOT EXISTS idx_blocked_users_ip ON blocked_users(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_users_active ON blocked_users(is_active) WHERE is_active = TRUE;

-- Таблица для логов модерации
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES blog_comments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'approve', 'reject', 'spam', 'delete', 'restore'
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_comment_id ON moderation_logs(comment_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON moderation_logs(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- Политики для blog_posts
CREATE POLICY "blog_posts_select_published" 
  ON blog_posts FOR SELECT 
  USING (status = 'published');

CREATE POLICY "blog_posts_select_all_admin" 
  ON blog_posts FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "blog_posts_insert_admin" 
  ON blog_posts FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "blog_posts_update_admin" 
  ON blog_posts FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "blog_posts_delete_admin" 
  ON blog_posts FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Политики для blog_comments
-- Публичный просмотр одобренных комментариев
CREATE POLICY "blog_comments_select_approved" 
  ON blog_comments FOR SELECT 
  USING (status = 'approved' AND is_deleted = FALSE);

-- Автор может видеть свои комментарии
CREATE POLICY "blog_comments_select_own" 
  ON blog_comments FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Админ может видеть все комментарии
CREATE POLICY "blog_comments_select_admin" 
  ON blog_comments FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

-- Вставка комментариев (только авторизованные и не заблокированные)
CREATE POLICY "blog_comments_insert_auth" 
  ON blog_comments FOR INSERT 
  TO authenticated 
  WITH CHECK (
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM blocked_users 
      WHERE blocked_users.user_id = auth.uid() 
      AND blocked_users.is_active = TRUE 
      AND (blocked_users.expires_at IS NULL OR blocked_users.expires_at > NOW())
    )
  );

-- Обновление комментариев (только автор в течение 15 минут)
CREATE POLICY "blog_comments_update_own" 
  ON blog_comments FOR UPDATE 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    AND created_at > NOW() - INTERVAL '15 minutes'
    AND is_deleted = FALSE
  );

-- Модерация комментариев
CREATE POLICY "blog_comments_update_admin" 
  ON blog_comments FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

-- Мягкое удаление (скрытие) комментариев
CREATE POLICY "blog_comments_delete_own" 
  ON blog_comments FOR DELETE 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    AND created_at > NOW() - INTERVAL '15 minutes'
  );

CREATE POLICY "blog_comments_delete_admin" 
  ON blog_comments FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

-- Политики для blog_comment_likes
CREATE POLICY "blog_comment_likes_select" 
  ON blog_comment_likes FOR SELECT 
  USING (TRUE);

CREATE POLICY "blog_comment_likes_insert" 
  ON blog_comment_likes FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "blog_comment_likes_delete" 
  ON blog_comment_likes FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Политики для blocked_users (только админы)
CREATE POLICY "blocked_users_select_admin" 
  ON blocked_users FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "blocked_users_insert_admin" 
  ON blocked_users FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "blocked_users_update_admin" 
  ON blocked_users FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Политики для moderation_logs
CREATE POLICY "moderation_logs_select_admin" 
  ON moderation_logs FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

CREATE POLICY "moderation_logs_insert_admin" 
  ON moderation_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для updated_at
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON blog_comments;
CREATE TRIGGER update_blog_comments_updated_at
  BEFORE UPDATE ON blog_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления счетчика комментариев
CREATE OR REPLACE FUNCTION update_blog_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE blog_posts 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      UPDATE blog_posts 
      SET comments_count = comments_count + 1 
      WHERE id = NEW.post_id;
    ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
      UPDATE blog_posts 
      SET comments_count = GREATEST(0, comments_count - 1) 
      WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE blog_posts 
    SET comments_count = GREATEST(0, comments_count - 1) 
    WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comments_count ON blog_comments;
CREATE TRIGGER update_comments_count
  AFTER INSERT OR UPDATE OR DELETE ON blog_comments
  FOR EACH ROW EXECUTE FUNCTION update_blog_post_comments_count();

-- Функция для обновления счетчика лайков комментариев
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_comments 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comment_likes ON blog_comment_likes;
CREATE TRIGGER update_comment_likes
  AFTER INSERT OR DELETE ON blog_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Функция для автоматического логирования модерации
CREATE OR REPLACE FUNCTION log_moderation_action()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO moderation_logs (comment_id, user_id, action, reason, performed_by)
    VALUES (
      NEW.id,
      NEW.user_id,
      CASE NEW.status
        WHEN 'approved' THEN 'approve'
        WHEN 'rejected' THEN 'reject'
        WHEN 'spam' THEN 'spam'
        ELSE 'update'
      END,
      NEW.rejection_reason,
      NEW.moderated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_moderation ON blog_comments;
CREATE TRIGGER log_moderation
  AFTER UPDATE ON blog_comments
  FOR EACH ROW EXECUTE FUNCTION log_moderation_action();

-- Функция для проверки заблокированного пользователя
CREATE OR REPLACE FUNCTION is_user_blocked(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE user_id = check_user_id 
    AND is_active = TRUE 
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEWS
-- ============================================

-- Представление для получения комментариев с информацией о пользователе
CREATE OR REPLACE VIEW blog_comments_with_users AS
SELECT 
  c.*,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_name,
  u.raw_user_meta_data->>'avatar_url' as user_avatar,
  p.full_name as profile_name,
  p.avatar_url as profile_avatar
FROM blog_comments c
LEFT JOIN auth.users u ON c.user_id = u.id
LEFT JOIN profiles p ON c.user_id = p.id;

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON blog_posts TO anon, authenticated;
GRANT SELECT ON blog_comments TO anon, authenticated;
GRANT SELECT ON blog_comment_likes TO anon, authenticated;

-- ============================================
-- SAMPLE DATA (раскомментируйте для тестирования)
-- ============================================

-- INSERT INTO blog_posts (slug, title, excerpt, content, category, author_name, status, published_at)
-- VALUES 
--   (
--     'kak-podat-isk-v-sud',
--     'Как подать иск в суд онлайн',
--     'Подробная инструкция по использованию ГАС Правосудие и Мой Арбитр',
--     '<p>Полное содержание статьи...</p>',
--     'Инструкции',
--     'Администратор',
--     'published',
--     NOW()
--   );
