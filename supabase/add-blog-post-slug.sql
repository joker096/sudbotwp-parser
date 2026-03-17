-- Добавляем колонку slug для собственных URL статей
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Добавляем индекс для slug
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- Обновляем существующие записи, у которых нет slug
UPDATE blog_posts 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[а-яё]+', '', 'g'),
      '[^a-z0-9]+', '-', 'g'
    ),
    '^-|-$', '', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Также добавляем колонку category_id для связи с категориями
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES blog_categories(id);

-- Создаем индекс для category_id
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);
