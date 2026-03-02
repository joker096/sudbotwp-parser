-- =====================================================
-- Rating System - Система рейтингов для юристов и судов
-- =====================================================

-- 1. Таблица рейтингов (универсальная для юристов и судов)
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Тип объекта: 'lawyer' (юрист) или 'court' (суд)
    target_type TEXT NOT NULL CHECK (target_type IN ('lawyer', 'court')),
    
    -- ID юриста или суда
    target_id UUID NOT NULL,
    
    -- Пользователь, который поставил рейтинг (может быть NULL для анонимных)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Рейтинг (1-5 звёзд)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    
    -- IP адрес пользователя (для защиты от накруток)
    ip_address TEXT NOT NULL,
    
    -- User-Agent (для дополнительной проверки)
    user_agent TEXT,
    
    -- Капча (токен верификации)
    captcha_token TEXT,
    captcha_verified_at TIMESTAMPTZ,
    
    -- Статус (для модерации при необходимости)
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'flagged', 'removed')),
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Уникальное ограничение: пользователь может голосовать только 1 раз за каждый объект
    UNIQUE(user_id, target_type, target_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_ratings_target ON ratings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_ip ON ratings(ip_address, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ratings_status ON ratings(status);

-- 2. Представление для получения среднего рейтинга объекта
CREATE OR REPLACE VIEW ratings_summary AS
SELECT 
    target_type,
    target_id,
    COUNT(*) as total_ratings,
    AVG(rating)::DECIMAL(3,2) as average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as count_5,
    COUNT(CASE WHEN rating = 4 THEN 1 END) as count_4,
    COUNT(CASE WHEN rating = 3 THEN 1 END) as count_3,
    COUNT(CASE WHEN rating = 2 THEN 1 END) as count_2,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as count_1
FROM ratings
WHERE status = 'active'
GROUP BY target_type, target_id;

-- 3. Функция: Проверка, может ли пользователь голосовать
-- Возвращает true если пользователь еще не голосовал за этот объект
-- и если с этого IP еще не голосовали за этот объект
CREATE OR REPLACE FUNCTION can_user_rate(
    p_user_id UUID,
    p_target_type TEXT,
    p_target_id UUID,
    p_ip_address TEXT
)
RETURNS TABLE (can_rate BOOLEAN, reason TEXT) AS $$
DECLARE
    v_user_voted BOOLEAN;
    v_ip_voted BOOLEAN;
BEGIN
    -- Проверяем, голосовал ли пользователь
    SELECT EXISTS (
        SELECT 1 FROM ratings
        WHERE user_id = p_user_id
          AND target_type = p_target_type
          AND target_id = p_target_id
          AND status = 'active'
    ) INTO v_user_voted;
    
    -- Проверяем, голосовали ли с этого IP
    SELECT EXISTS (
        SELECT 1 FROM ratings
        WHERE ip_address = p_ip_address
          AND target_type = p_target_type
          AND target_id = p_target_id
          AND status = 'active'
    ) INTO v_ip_voted;
    
    IF v_user_voted THEN
        RETURN QUERY SELECT FALSE, 'Вы уже голосовали за этого пользователя';
    ELSIF v_ip_voted THEN
        RETURN QUERY SELECT FALSE, 'С этого адреса уже голосовали за этого пользователя';
    ELSE
        RETURN QUERY SELECT TRUE, 'Можно голосовать';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Функция: Добавление/обновление рейтинга
CREATE OR REPLACE FUNCTION add_or_update_rating(
    p_user_id UUID,
    p_target_type TEXT,
    p_target_id UUID,
    p_rating INTEGER,
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_captcha_token TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_can_rate BOOLEAN;
    v_reason TEXT;
    v_result JSONB;
BEGIN
    -- Проверяем, может ли пользователь голосовать
    SELECT can_rate, reason INTO v_can_rate, v_reason
    FROM can_user_rate(
        CASE WHEN p_user_id IS NOT NULL THEN p_user_id ELSE NULL END,
        p_target_type,
        p_target_id,
        p_ip_address
    );
    
    -- Если пользователь не авторизован, проверяем только по IP
    IF p_user_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM ratings
            WHERE ip_address = p_ip_address
              AND target_type = p_target_type
              AND target_id = p_target_id
              AND status = 'active'
        ) INTO v_can_rate;
        
        IF v_can_rate THEN
            v_can_rate := FALSE;
            v_reason := 'С этого адреса уже голосовали';
        ELSE
            v_can_rate := TRUE;
            v_reason := 'Можно голосовать';
        END IF;
    END IF;
    
    IF NOT v_can_rate THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', v_reason
        );
    END IF;
    
    -- Проверяем валидность рейтинга
    IF p_rating < 1 OR p_rating > 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Рейтинг должен быть от 1 до 5'
        );
    END IF;
    
    -- Проверяем капчу (если токен передан)
    IF p_captcha_token IS NOT NULL THEN
        -- Капча считается верифицированной если токен не пустой
        -- В production здесь должна быть реальная проверка капчи
        NULL;
    END IF;
    
    -- Вставляем или обновляем рейтинг
    INSERT INTO ratings (
        user_id,
        target_type,
        target_id,
        rating,
        ip_address,
        user_agent,
        captcha_token,
        captcha_verified_at,
        status
    ) VALUES (
        p_user_id,
        p_target_type,
        p_target_id,
        p_rating,
        p_ip_address,
        p_user_agent,
        p_captcha_token,
        CASE WHEN p_captcha_token IS NOT NULL THEN NOW() ELSE NULL END,
        'active'
    )
    ON CONFLICT (user_id, target_type, target_id) 
    DO UPDATE SET
        rating = EXCLUDED.rating,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW();
    
    -- Получаем обновленный рейтинг
    SELECT jsonb_build_object(
        'success', true,
        'message', 'Спасибо за ваш голос!',
        'rating', (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM ratings
            WHERE target_type = p_target_type
              AND target_id = p_target_id
              AND status = 'active'
        ),
        'total_votes', (
            SELECT COUNT(*)
            FROM ratings
            WHERE target_type = p_target_type
              AND target_id = p_target_id
              AND status = 'active'
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. Триггер для обновления рейтинга у юриста/суда
CREATE OR REPLACE FUNCTION update_target_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_count INTEGER;
BEGIN
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        -- Получаем средний рейтинг и количество голосов
        SELECT AVG(rating), COUNT(*)
        INTO v_avg_rating, v_count
        FROM ratings
        WHERE target_type = NEW.target_type
          AND target_id = NEW.target_id
          AND status = 'active';
        
        -- Обновляем рейтинг юриста
        IF NEW.target_type = 'lawyer' THEN
            UPDATE lawyers
            SET rating = COALESCE(v_avg_rating, 0),
                reviews_count = v_count,
                updated_at = NOW()
            WHERE id = NEW.target_id;
        END IF;
        
        -- Для судов можно добавить отдельное поле в таблицу судов
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
DROP TRIGGER IF EXISTS trigger_update_target_rating ON ratings;
CREATE TRIGGER trigger_update_target_rating
    AFTER INSERT OR UPDATE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_target_rating();

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Все видят активные рейтинги
DROP POLICY IF EXISTS "Anyone can see active ratings" ON ratings;
CREATE POLICY "Anyone can see active ratings" ON ratings
    FOR SELECT USING (status = 'active');

-- Пользователи видят свои рейтинги
DROP POLICY IF EXISTS "Users can see own ratings" ON ratings;
CREATE POLICY "Users can see own ratings" ON ratings
    FOR SELECT USING (user_id = auth.uid());

-- Анонимные могут вставлять рейтинги (с IP проверкой)
DROP POLICY IF EXISTS "Anyone can insert ratings" ON ratings;
CREATE POLICY "Anyone can insert ratings" ON ratings
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- SEO Мета-теги для страниц
-- =====================================================

-- Таблица для хранения SEO настроек страниц
CREATE TABLE IF NOT EXISTS page_seo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Путь страницы (например, '/lawyers', '/courts/moscow', '/blog/post-1')
    page_path TEXT NOT NULL UNIQUE,
    
    -- Meta теги
    meta_title TEXT NOT NULL,
    meta_description TEXT,
    meta_keywords TEXT,
    meta_author TEXT,
    
    -- Open Graph
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    og_type TEXT DEFAULT 'website',
    og_url TEXT,
    
    -- Twitter
    twitter_card TEXT DEFAULT 'summary_large_image',
    twitter_title TEXT,
    twitter_description TEXT,
    twitter_image TEXT,
    
    -- Канонический URL
    canonical_url TEXT,
    
    -- Индексация
    noindex BOOLEAN DEFAULT FALSE,
    nofollow BOOLEAN DEFAULT FALSE,
    
    -- Приоритет для sitemap
    sitemap_priority DECIMAL(2,1) DEFAULT 0.5 CHECK (sitemap_priority >= 0 AND sitemap_priority <= 1),
    sitemap_frequency TEXT DEFAULT 'weekly' CHECK (sitemap_frequency IN ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_page_seo_path ON page_seo(page_path);

-- RLS для SEO
ALTER TABLE page_seo ENABLE ROW LEVEL SECURITY;

-- Все могут читать SEO настройки
DROP POLICY IF EXISTS "Anyone can see page seo" ON page_seo;
CREATE POLICY "Anyone can see page seo" ON page_seo
    FOR SELECT USING (true);

-- =====================================================
-- Начальные SEO данные для основных страниц
-- =====================================================

INSERT INTO page_seo (page_path, meta_title, meta_description, sitemap_priority, sitemap_frequency) VALUES
('/', 'Судовой Бот - Мониторинг судебных дел онлайн', 'Отслеживайте судебные дела в режиме онлайн. Поиск по базе судов РФ, мониторинг дел, уведомления о новых событиях.', 1.0, 'daily'),
('/lawyers', 'Юристы и адвокаты - поиск и рейтинг', 'Найдите лучшего юриста или адвоката. Отзывы, рейтинги, контакты специалистов по всей России.', 0.9, 'daily'),
('/cases', 'Поиск судебных дел - База судов РФ', 'Поиск и мониторинг судебных дел по всем судам Российской Федерации. Актуальная информация о движении дела.', 0.9, 'daily'),
('/blog', 'Блог - Юридические статьи и новости', 'Полезные статьи о юридических вопросах, советы юристов, новости законодательства.', 0.8, 'weekly'),
('/monitoring', 'Мониторинг дел - Отслеживание онлайн', 'Настройте мониторинг судебных дел и получайте уведомления о всех изменениях.', 0.8, 'daily'),
('/leads', 'Юридические лиды - База клиентов', 'База потенциальных клиентов для юристов. Новые дела и обращения граждан.', 0.7, 'daily'),
('/calculator', 'Калькулятор госпошлины и сроков', 'Рассчитайте госпошлину и процессуальные сроки для подачи в суд.', 0.7, 'monthly'),
('/help', 'Помощь и FAQ', 'Ответы на частые вопросы о работе с системой мониторинга судов.', 0.6, 'monthly'),
('/profile', 'Личный кабинет', 'Управление подпиской, настройки уведомлений и история мониторинга.', 0.5, 'weekly'),
('/login', 'Вход в систему', 'Войдите в личный кабинет для доступа к мониторингу судебных дел.', 0.3, 'yearly')
ON CONFLICT (page_path) DO NOTHING;

-- =====================================================
-- Sitemap генерация - вспомогательная функция
-- =====================================================

CREATE OR REPLACE FUNCTION generate_sitemap_xml()
RETURNS TEXT AS $$
DECLARE
    v_sitemap TEXT;
    v_base_url TEXT := 'https://cvr.name';
BEGIN
    v_sitemap := '<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
    -- Добавляем страницы из SEO таблицы
    FOR rec IN SELECT 
        page_path, 
        sitemap_priority, 
        sitemap_frequency,
        updated_at
    FROM page_seo
    WHERE noindex = FALSE
    LOOP
        v_sitemap := v_sitemap || '
    <url>
        <loc>' || v_base_url || rec.page_path || '</loc>
        <lastmod>' || TO_CHAR(rec.updated_at, 'YYYY-MM-DD') || '</lastmod>
        <changefreq>' || rec.sitemap_frequency || '</changefreq>
        <priority>' || rec.sitemap_priority::TEXT || '</priority>
    </url>';
    END LOOP;
    
    v_sitemap := v_sitemap || '
</urlset>';
    
    RETURN v_sitemap;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Представление для получения всех страниц сайта
-- =====================================================

CREATE OR REPLACE VIEW site_pages AS
SELECT 
    page_path,
    meta_title,
    meta_description,
    og_title,
    og_description,
    og_image,
    og_type,
    canonical_url,
    noindex,
    nofollow,
    sitemap_priority,
    sitemap_frequency,
    created_at,
    updated_at
FROM page_seo;
