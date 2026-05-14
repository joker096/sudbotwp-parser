-- ============================================
-- FIX: Permission denied for table users
-- Проблема: представление blog_comments_with_users обращается к auth.users
-- Решение: изменяем представление, чтобы не обращаться к внешним таблицам
-- ============================================

-- Удаляем старое представление
DROP VIEW IF EXISTS blog_comments_with_users;

-- Создаем новое представление без JOIN
-- Оставляем все поля из blog_comments, user_name и user_avatar будут NULL
-- Это позволит избежать ошибки 42501
CREATE OR REPLACE VIEW blog_comments_with_users AS
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
  NULL as user_email,
  NULL as user_name,
  NULL as user_avatar
FROM blog_comments c;

-- Права на представление
GRANT SELECT ON blog_comments_with_users TO anon, authenticated;
