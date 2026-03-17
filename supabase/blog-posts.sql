-- Таблица блога для статей
CREATE TABLE IF NOT EXISTS blog_posts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT,
    category VARCHAR(100) DEFAULT 'Советы',
    image_url TEXT,
    author VARCHAR(255) DEFAULT 'Админ',
    read_time VARCHAR(50) DEFAULT '5 мин',
    published BOOLEAN DEFAULT false,
    seo_title VARCHAR(500),
    seo_description TEXT,
    seo_keywords TEXT,
    og_title VARCHAR(500),
    og_description TEXT,
    og_image TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS политики
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Все могут читать опубликованные статьи
CREATE POLICY "Public read published posts"
    ON blog_posts FOR SELECT
    USING (published = true);

-- Только авторизованные могут читать все статьи (в том числе черновики)
CREATE POLICY "Auth read all posts"
    ON blog_posts FOR SELECT
    USING (auth.role() = 'authenticated');

-- Только админы могут создавать статьи
CREATE POLICY "Admin insert posts"
    ON blog_posts FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) = 'admin'
    );

-- Только админы могут обновлять статьи
CREATE POLICY "Admin update posts"
    ON blog_posts FOR UPDATE
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

-- Только админы могут удалять статьи
CREATE POLICY "Admin delete posts"
    ON blog_posts FOR DELETE
    USING (
        auth.role() = 'authenticated' AND
        (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) = 'admin'
    );

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Триггер для автоматического обновления
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Вставка тестовых данных
INSERT INTO blog_posts (title, excerpt, content, category, image_url, author, read_time, published, seo_title, seo_description, seo_keywords) VALUES
('Как подать иск в суд онлайн', 'Подробная инструкция по использованию ГАС Правосудие и Мой Арбитр для подачи документов не выходя из дома.', '<h3>Шаг 1: Подготовка документов</h3><p>Перед тем как начать процесс подачи, убедитесь, что у вас есть все необходимые документы в электронном виде.</p><ul><li>Само исковое заявление</li><li>Квитанция об оплате госпошлины</li><li>Документы, подтверждающие обстоятельства</li></ul><h3>Шаг 2: Авторизация в системе</h3><p>Для подачи документов в суды общей юрисдикции используется портал ГАС Правосудие.</p>', 'Инструкции', 'https://picsum.photos/seed/blog1/800/400', 'Александр Смирнов', '5 мин', true, 'Как подать иск в суд онлайн - пошаговая инструкция', 'Узнайте, как подать иск в суд онлайн через ГАС Правосудие и Мой Арбитр. Подробная инструкция с картинками.', 'подать иск в суд онлайн, гас правосудие, мой арбитр, электронная подача'),
('Изменения в ГПК РФ с 2024 года', 'Обзор ключевых изменений в гражданском процессуальном кодексе, которые вступят в силу в этом году.', '<h3>Основные изменения</h3><p>В 2024 году в ГПК РФ внесены существенные изменения, касающиеся порядка рассмотрения дел.</p>', 'Новости', 'https://picsum.photos/seed/blog2/800/400', 'Елена Волкова', '7 мин', true, 'Изменения в ГПК РФ 2024 - что нового', 'Обзор изменений в Гражданском процессуальном кодексе РФ в 2024 году. Новые правила и порядок рассмотрения дел.', 'гпк рф 2024, изменения в гпк, новые правила'),
('Как выбрать хорошего юриста', 'На что обращать внимание при выборе специалиста для вашего дела: чек-лист от экспертов.', '<h3>Чек-лист при выборе юриста</h3><p>При выборе юриста обращайте внимание на:</p><ul><li>Опыт работы</li><li>Специализацию</li><li>Отзывы клиентов</li></ul>', 'Советы', 'https://picsum.photos/seed/blog3/800/400', 'Дмитрий Соколов', '4 мин', true, 'Как выбрать юриста - полное руководство', 'Узнайте, как правильно выбрать юриста для вашего дела. Чек-лист и рекомендации от экспертов.', 'выбрать юриста, юридическая помощь, хороший юрист'),
('Новые пошлины: что нужно знать', 'Разбираем новые тарифы на судебные пошлины и рассказываем, как их правильно рассчитать.', '<h3>Расчет госпошлины</h3><p>Размер госпошлины зависит от цены иска и категории дела.</p>', 'Новости', 'https://picsum.photos/seed/blog4/800/400', 'Анна Морозова', '6 мин', true, 'Новые судебные пошлины 2024 - расчет и оплата', 'Новые тарифы на судебные пошлины в 2024 году. Как правильно рассчитать и оплатить госпошлину.', 'судебная пошлина, госпошлина, расчет пошлины');
