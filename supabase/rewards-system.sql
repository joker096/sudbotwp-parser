-- =====================================================
-- Reward & Review System - Система поощрений и отзывов
-- =====================================================

-- 1. Таблица отзывов о юристах
CREATE TABLE IF NOT EXISTS lawyer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связь с юристом и пользователем
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Связь с делом (для проверки что было дело)
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    
    -- Содержание отзыва
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    -- Статус модерации
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
    
    -- Капча (для защиты от спама)
    captcha_token TEXT,
    captcha_verified_at TIMESTAMPTZ,
    
    -- Метаданные
    ip_address TEXT,
    user_agent TEXT,
    
    -- Модерация
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_lawyer_reviews_lawyer ON lawyer_reviews(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_reviews_status ON lawyer_reviews(status);
CREATE INDEX IF NOT EXISTS idx_lawyer_reviews_user ON lawyer_reviews(user_id);

-- 2. Таблица связей дел с юристами
-- Позволяет проверить, что пользователь действительно работал с юристом
CREATE TABLE IF NOT EXISTS case_lawyer_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связь с делом и юристом
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Статус подтверждения
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'denied', 'cancelled')),
    
    -- Кто подтвердил
    confirmed_by_user BOOLEAN DEFAULT FALSE,
    confirmed_by_lawyer BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    
    -- Дополнительная информация
    description TEXT,
    contact_phone TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Уникальная связь: дело-юрист
    UNIQUE(case_id, lawyer_id)
);

CREATE INDEX IF NOT EXISTS idx_case_lawyer_links_case ON case_lawyer_links(case_id);
CREATE INDEX IF NOT EXISTS idx_case_lawyer_links_lawyer ON case_lawyer_links(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_case_lawyer_links_user ON case_lawyer_links(user_id);

-- 3. Таблица исходов дел
-- Подтверждение юристом успешного исхода дела
CREATE TABLE IF NOT EXISTS case_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связь с делом и юристом
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Исход дела
    outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost', 'partial', 'settled', 'in_progress', 'dismissed')),
    outcome_description TEXT,
    
    -- Подтверждения от обеих сторон
    confirmed_by_lawyer BOOLEAN DEFAULT FALSE,
    confirmed_by_lawyer_at TIMESTAMPTZ,
    confirmed_by_user BOOLEAN DEFAULT FALSE,
    confirmed_by_user_at TIMESTAMPTZ,
    
    -- Обе стороны подтвердили успех
    both_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(case_id, lawyer_id)
);

CREATE INDEX IF NOT EXISTS idx_case_outcomes_case ON case_outcomes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_outcomes_lawyer ON case_outcomes(lawyer_id);

-- 4. Таблица поощрений для юристов
CREATE TABLE IF NOT EXISTS lawyer_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Юрист-получатель
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Тип поощрения
    reward_type TEXT NOT NULL CHECK (reward_type IN ('free_lead', 'bonus_lead', 'discount', 'bonus_points', 'badge')),
    reward_value INTEGER DEFAULT 1,  -- количество бесплатных лидов или процент скидки
    
    -- Связанное дело
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    case_outcome_id UUID REFERENCES case_outcomes(id) ON DELETE SET NULL,
    
    -- Статус
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'used', 'expired', 'cancelled')),
    
    -- Когда было получено и использовано
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- Срок действия (например, 30 дней)
    used_at TIMESTAMPTZ,
    
    -- На какой лид использован
    used_for_lead_id UUID REFERENCES leads(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lawyer_rewards_lawyer ON lawyer_rewards(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_rewards_status ON lawyer_rewards(status);

-- 5. Таблица поощрений для пользователей
-- За оставление положительного отзыва пользователь получает скидку
CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Пользователь-получатель
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Тип поощрения
    reward_type TEXT NOT NULL CHECK (reward_type IN ('discount', 'bonus_lead', 'free_parsing', 'promo_code')),
    reward_value TEXT,  -- '10%', '500', 'FREE_LEAD_2024'
    
    -- Описание
    description TEXT,
    
    -- Связанный отзыв и юрист
    review_id UUID REFERENCES lawyer_reviews(id) ON DELETE SET NULL,
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL,
    
    -- Статус
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'used', 'expired', 'cancelled')),
    
    -- Срок действия
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    
    -- Промокод (если применимо)
    promo_code TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_status ON user_rewards(status);
CREATE INDEX IF NOT EXISTS idx_user_rewards_promo ON user_rewards(promo_code) WHERE promo_code IS NOT NULL;

-- 6. Таблица баланса пользователей
CREATE TABLE IF NOT EXISTS user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Баланс бонусов
    bonus_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    
    -- История бонусов (JSONB для производительности)
    bonus_history JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_balances_user ON user_balances(user_id);

-- =====================================================
-- Функции для работы с системой поощрений
-- =====================================================

-- Функция: Проверка, может ли пользователь оставить отзыв о юристе
-- Пользователь может оставить отзыв если:
-- 1. У него есть дело в системе
-- 2. Это дело связано с данным юристом (или он купил лид этого юриста)
CREATE OR REPLACE FUNCTION can_user_review_lawyer(p_user_id UUID, p_lawyer_id UUID)
RETURNS TABLE (can_review BOOLEAN, case_id UUID, reason TEXT) AS $$
DECLARE
    v_has_case_link BOOLEAN;
    v_has_lead_purchase BOOLEAN;
    v_case_id UUID;
BEGIN
    -- Проверяем связь через case_lawyer_links
    SELECT EXISTS (
        SELECT 1 FROM case_lawyer_links
        WHERE user_id = p_user_id 
          AND lawyer_id = p_lawyer_id 
          AND status = 'confirmed'
    ) INTO v_has_case_link;
    
    -- Проверяем, был ли куплен лид у этого юриста
    SELECT EXISTS (
        SELECT 1 FROM lead_purchases lp
        JOIN leads l ON lp.lead_id = l.id
        WHERE l.created_by = p_user_id 
          AND lp.lawyer_id = p_lawyer_id
          AND lp.payment_status = 'paid'
    ) INTO v_has_lead_purchase;
    
    -- Проверяем, есть ли у пользователя дело
    SELECT c.id INTO v_case_id
    FROM cases c
    WHERE c.user_id = p_user_id
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    IF v_has_case_link OR v_has_lead_purchase THEN
        RETURN QUERY SELECT TRUE, v_case_id, 'Связь с юристом подтверждена';
    ELSE
        RETURN QUERY SELECT FALSE, NULL, 'Вы не работали с данным юристом';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Функция: Создание поощрения для юриста за успешный исход дела
CREATE OR REPLACE FUNCTION award_lawyer_for_successful_outcome(
    p_lawyer_id UUID,
    p_case_id UUID,
    p_user_id UUID,
    p_outcome TEXT
)
RETURNS UUID AS $$
DECLARE
    v_reward_id UUID;
    v_lawyer_record lawyers%ROWTYPE;
BEGIN
    -- Только для успешных исходов
    IF p_outcome NOT IN ('won', 'settled', 'partial') THEN
        RETURN NULL;
    END IF;
    
    -- Создаём поощрение (1 бесплатный лид)
    INSERT INTO lawyer_rewards (
        lawyer_id,
        reward_type,
        reward_value,
        case_id,
        status,
        expires_at
    ) VALUES (
        p_lawyer_id,
        'free_lead',
        1,
        p_case_id,
        'available',
        NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_reward_id;
    
    -- Обновляем счётчик успешных дел у юриста
    UPDATE lawyers 
    SET leads_converted = leads_converted + 1,
        updated_at = NOW()
    WHERE id = p_lawyer_id;
    
    RETURN v_reward_id;
END;
$$ LANGUAGE plpgsql;

-- Функция: Создание поощрения для пользователя за отзыв
CREATE OR REPLACE FUNCTION award_user_for_review(
    p_user_id UUID,
    p_lawyer_id UUID,
    p_review_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_reward_id UUID;
    v_promo_code TEXT;
BEGIN
    -- Генерируем промокод
    v_promo_code := 'REVIEW' || EXTRACT(YEAR FROM NOW()) || 
                    LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || 
                    SUBSTRING(MD5(p_user_id::TEXT) FROM 1 FOR 6);
    
    INSERT INTO user_rewards (
        user_id,
        reward_type,
        reward_value,
        description,
        review_id,
        lawyer_id,
        status,
        expires_at,
        promo_code
    ) VALUES (
        p_user_id,
        'discount',
        '10%',
        'Скидка 10% на любую услугу',
        p_review_id,
        p_lawyer_id,
        'available',
        NOW() + INTERVAL '90 days',
        UPPER(v_promo_code)
    )
    RETURNING id INTO v_reward_id;
    
    -- Обновляем баланс пользователя
    INSERT INTO user_balances (user_id, bonus_balance, total_earned)
    VALUES (p_user_id, 100, 100)
    ON CONFLICT (user_id) DO UPDATE 
    SET bonus_balance = user_balances.bonus_balance + 100,
        total_earned = user_balances.total_earned + 100,
        updated_at = NOW();
    
    RETURN v_reward_id;
END;
$$ LANGUAGE plpgsql;

-- Функция: Использование награды юриста (получение бесплатного лида)
CREATE OR REPLACE FUNCTION use_lawyer_free_lead(
    p_lawyer_id UUID,
    p_lead_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_reward_record lawyer_rewards%ROWTYPE;
BEGIN
    -- Находим доступную награду
    SELECT * INTO v_reward_record
    FROM lawyer_rewards
    WHERE lawyer_id = p_lawyer_id
      AND reward_type = 'free_lead'
      AND status = 'available'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY earned_at ASC
    LIMIT 1
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Помечаем награду как использованную
    UPDATE lawyer_rewards
    SET status = 'used',
        used_at = NOW(),
        used_for_lead_id = p_lead_id,
        updated_at = NOW()
    WHERE id = v_reward_record.id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Функция: Автоматическое обновление рейтинга юриста при новом одобренном отзыве
CREATE OR REPLACE FUNCTION update_lawyer_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_reviews_count INTEGER;
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Рассчитываем новый средний рейтинг
        SELECT COALESCE(AVG(rating), 0), COUNT(*)
        INTO v_avg_rating, v_reviews_count
        FROM lawyer_reviews
        WHERE lawyer_id = NEW.lawyer_id
          AND status = 'approved';
        
        -- Обновляем юриста
        UPDATE lawyers
        SET rating = v_avg_rating,
            reviews_count = v_reviews_count,
            updated_at = NOW()
        WHERE id = NEW.lawyer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления рейтинга
DROP TRIGGER IF EXISTS trigger_update_lawyer_rating ON lawyer_reviews;
CREATE TRIGGER trigger_update_lawyer_rating
    AFTER INSERT OR UPDATE ON lawyer_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_lawyer_rating();

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Отзывы о юристах
ALTER TABLE lawyer_reviews ENABLE ROW LEVEL SECURITY;

-- Все видят одобренные отзывы
DROP POLICY IF EXISTS "Anyone can see approved reviews" ON lawyer_reviews;
CREATE POLICY "Anyone can see approved reviews" ON lawyer_reviews
    FOR SELECT USING (status = 'approved');

-- Пользователи видят свои отзывы
DROP POLICY IF EXISTS "Users can see own reviews" ON lawyer_reviews;
CREATE POLICY "Users can see own reviews" ON lawyer_reviews
    FOR ALL USING (user_id = auth.uid());

-- Юристы видят отзывы о себе
DROP POLICY IF EXISTS "Lawyers can see reviews about themselves" ON lawyer_reviews;
CREATE POLICY "Lawyers can see reviews about themselves" ON lawyer_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lawyers 
            WHERE user_id = auth.uid() 
            AND id = lawyer_reviews.lawyer_id
        )
    );

-- Связи дел с юристами
ALTER TABLE case_lawyer_links ENABLE ROW LEVEL SECURITY;

-- Пользователи видят свои связи
DROP POLICY IF EXISTS "Users can see own case links" ON case_lawyer_links;
CREATE POLICY "Users can see own case links" ON case_lawyer_links
    FOR ALL USING (user_id = auth.uid());

-- Юристы видят связи о себе
DROP POLICY IF EXISTS "Lawyers can see case links about themselves" ON case_lawyer_links;
CREATE POLICY "Lawyers can see case links about themselves" ON case_lawyer_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lawyers 
            WHERE user_id = auth.uid() 
            AND id = case_lawyer_links.lawyer_id
        )
    );

-- Исходы дел
ALTER TABLE case_outcomes ENABLE ROW LEVEL SECURITY;

-- Пользователи видят свои исходы
DROP POLICY IF EXISTS "Users can see own case outcomes" ON case_outcomes;
CREATE POLICY "Users can see own case outcomes" ON case_outcomes
    FOR ALL USING (user_id = auth.uid());

-- Юристы видят исходы о себе
DROP POLICY IF EXISTS "Lawyers can see case outcomes about themselves" ON case_outcomes;
CREATE POLICY "Lawyers can see case outcomes about themselves" ON case_outcomes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lawyers 
            WHERE user_id = auth.uid() 
            AND id = case_outcomes.lawyer_id
        )
    );

-- Поощрения юристов
ALTER TABLE lawyer_rewards ENABLE ROW LEVEL SECURITY;

-- Юристы видят свои поощрения
DROP POLICY IF EXISTS "Lawyers can see own rewards" ON lawyer_rewards;
CREATE POLICY "Lawyers can see own rewards" ON lawyer_rewards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM lawyers 
            WHERE user_id = auth.uid() 
            AND id = lawyer_rewards.lawyer_id
        )
    );

-- Поощрения пользователей
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- Пользователи видят свои поощрения
DROP POLICY IF EXISTS "Users can see own rewards" ON user_rewards;
CREATE POLICY "Users can see own rewards" ON user_rewards
    FOR ALL USING (user_id = auth.uid());

-- Балансы пользователей
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- Пользователи видят свой баланс
DROP POLICY IF EXISTS "Users can see own balance" ON user_balances;
CREATE POLICY "Users can see own balance" ON user_balances
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- Начальные данные (демо)
-- =====================================================

-- Добавим демо-отзывы (уже одобренные)
-- INSERT INTO lawyer_reviews (lawyer_id, user_id, rating, review_text, status) VALUES ...
