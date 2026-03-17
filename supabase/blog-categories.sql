-- Таблица категорий для блога
CREATE TABLE IF NOT EXISTS blog_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1', -- Индиго по умолчанию
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS политики
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Все могут читать категории
CREATE POLICY "Public read categories"
    ON blog_categories FOR SELECT
    USING (true);

-- Только авторизованные могут читать все категории
CREATE POLICY "Auth read categories"
    ON blog_categories FOR SELECT
    USING (auth.role() = 'authenticated');

-- Только админы могут создавать категории
CREATE POLICY "Admin insert categories"
    ON blog_categories FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) = 'admin'
    );

-- Только админы могут обновлять категории
CREATE POLICY "Admin update categories"
    ON blog_categories FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) = 'admin'
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND
        (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) = 'admin'
    );

-- Только админы могут удалять категории
CREATE POLICY "Admin delete categories"
    ON blog_categories FOR DELETE
    USING (
        auth.role() = 'authenticated' AND
        (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) = 'admin'
    );

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_blog_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Триггер для автоматического обновления
DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
    BEFORE UPDATE ON blog_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_categories_updated_at();

-- Вставка начальных категорий
INSERT INTO blog_categories (name, slug, description, color) VALUES
('Новости', 'novosti', 'Актуальные новости и изменения в законодательстве', '#ef4444'),
('Инструкции', 'instrukcii', 'Пошаговые инструкции по юридическим процедурам', '#10b981'),
('Советы', 'sovety', 'Полезные советы и рекомендации от экспертов', '#f59e0b'),
('Обзоры', 'obzory', 'Обзоры юридических услуг и платформ', '#8b5cf6');
