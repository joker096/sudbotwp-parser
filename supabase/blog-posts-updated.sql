-- Обновление таблицы blog_posts для связи с категориями
-- Добавляем столбец category_id с внешним ключом
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES blog_categories(id) ON DELETE SET NULL;

-- Обновляем существующие записи, присваивая им категорию по умолчанию
UPDATE blog_posts 
SET category_id = (SELECT id FROM blog_categories WHERE name = blog_posts.category)
WHERE category_id IS NULL;

-- Добавляем индекс для производительности
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);

-- Создаем представление для удобного доступа к данным с категориями
CREATE OR REPLACE VIEW blog_posts_with_categories AS
SELECT 
    bp.*,
    bc.name AS category_name,
    bc.slug AS category_slug,
    bc.color AS category_color
FROM blog_posts bp
LEFT JOIN blog_categories bc ON bp.category_id = bc.id;
