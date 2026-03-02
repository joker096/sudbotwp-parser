-- =====================================================
-- LegalTech Lead System - SQL Schema for Supabase
-- Выполните этот скрипт в SQL-редакторе Supabase
-- =====================================================

-- 1. Таблица лидов (заявок от клиентов)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Контактные данные (скрыты до оплаты)
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    
    -- Детали заявки
    region TEXT,                    -- Регион
    case_type TEXT NOT NULL,        -- Тип дела: civil, criminal, family, arbitration, administrative, other
    case_description TEXT,          -- Описание ситуации
    budget TEXT,                    -- Бюджет: "до 10 000", "10 000-30 000", etc.
    urgency TEXT DEFAULT 'medium',  -- low, medium, high
    
    -- Статус и метаданные
    status TEXT DEFAULT 'new',      -- new, contacted, closed, spam
    price INTEGER DEFAULT 500,       -- Цена для юристов (в рублях)
    priority INTEGER DEFAULT 0,      -- Приоритет для сортировки
    
    -- Связь с пользователем (кто создал заявку)
    created_by UUID REFERENCES auth.users(id),
    
    -- Временные метки
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')  -- Лид живёт 30 дней
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_case_type ON leads(case_type);
CREATE INDEX IF NOT EXISTS idx_leads_region ON leads(region);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_price ON leads(price DESC);

-- 2. Таблица юристов (расширение профилей)
CREATE TABLE IF NOT EXISTS lawyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    
    -- Основная информация
    name TEXT NOT NULL,
    spec TEXT,                      -- Специализация
    city TEXT,
    
    -- Рейтинг и верификация
    rating DECIMAL(2,1) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    
    -- Статистика покупок
    leads_purchased INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,  -- Потрачено на лиды
    
    -- Подписка
    subscription_tier TEXT DEFAULT 'free', -- free, basic, premium
    subscription_expires TIMESTAMPTZ,
    
    -- Доступ к лидам
    can_buy_leads BOOLEAN DEFAULT TRUE,
    max_leads_per_month INTEGER DEFAULT 50,
    
    -- Настройки уведомлений
    notify_new_leads BOOLEAN DEFAULT TRUE,
    notify_telegram TEXT,            -- Telegram chat_id
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица покупок лидов
CREATE TABLE IF NOT EXISTS lead_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Цена и статус
    price INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
    payment_method TEXT,                   -- card, balance, telegram
    
    -- Доступ к контактам
    contact_revealed BOOLEAN DEFAULT FALSE,
    revealed_at TIMESTAMPTZ,
    
    -- Статус работы с лидом
    status TEXT DEFAULT 'new', -- new, contacted, in_progress, converted, lost, closed
    
    -- Обратная связь
    client_feedback TEXT,       -- Отзыв клиента
    is_useful BOOLEAN,         -- Полезный ли лид
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_purchases_lawyer ON lead_purchases(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_lead ON lead_purchases(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_status ON lead_purchases(status);

-- 4. Таблица ставок (аукционная модель)
CREATE TABLE IF NOT EXISTS lead_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Ставка
    bid_amount INTEGER NOT NULL,
    
    -- Комментарий юриста
    message TEXT,
    
    -- Статус
    status TEXT DEFAULT 'active', -- active, accepted, rejected, expired
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_bids_lead ON lead_bids(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_bids_lawyer ON lead_bids(lawyer_id);

-- 5. Таблица баланса юристов
CREATE TABLE IF NOT EXISTS lawyer_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE UNIQUE,
    
    balance INTEGER DEFAULT 0,           -- Текущий баланс
    total_deposited INTEGER DEFAULT 0,  -- Всего пополнено
    total_spent INTEGER DEFAULT 0,      -- Всего потрачено
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
    lead_purchase_id UUID REFERENCES lead_purchases(id),
    
    amount INTEGER NOT NULL,            -- Сумма в рублях
    payment_method TEXT NOT NULL,       -- card, yookassa, telegram
    payment_status TEXT DEFAULT 'pending', -- pending, succeeded, failed, refunded
    
    -- Данные платежа
    external_id TEXT,                   -- ID в платёжной системе
    receipt_url TEXT,                   -- Ссылка на чек
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 7. Функция для автоматического расчёта цены лида
CREATE OR REPLACE FUNCTION calculate_lead_price(lead_row leads)
RETURNS INTEGER AS $$
DECLARE
    base_price INTEGER := 500;
    urgency_multiplier DECIMAL := 1.0;
    budget_multiplier DECIMAL := 1.0;
BEGIN
    -- Мультипликатор срочности
    CASE lead_row.urgency
        WHEN 'high' THEN urgency_multiplier := 2.0;
        WHEN 'medium' THEN urgency_multiplier := 1.5;
        WHEN 'low' THEN urgency_multiplier := 1.0;
    END CASE;
    
    -- Мультипликатор бюджета
    CASE lead_row.budget
        WHEN '100 000+' THEN budget_multiplier := 2.5;
        WHEN '50 000-100 000' THEN budget_multiplier := 2.0;
        WHEN '30 000-50 000' THEN budget_multiplier := 1.5;
        WHEN '10 000-30 000' THEN budget_multiplier := 1.2;
        ELSE budget_multiplier := 1.0;
    END CASE;
    
    RETURN (base_price * urgency_multiplier * budget_multiplier)::INTEGER;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_lead_price()
RETURNS TRIGGER AS $$
BEGIN
    NEW.price := calculate_lead_price(NEW);
    NEW.priority := EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER / 3600; -- Приоритет по возрасту
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger для автоматического расчёта цены при создании лида
-- Сначала удаляем старый триггер, чтобы избежать ошибок при повторном запуске
DROP TRIGGER IF EXISTS trigger_set_lead_price ON leads;
CREATE TRIGGER trigger_set_lead_price
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION set_lead_price();

-- 9. Функция для раскрытия контактов лида
CREATE OR REPLACE FUNCTION reveal_lead_contact(
    p_lead_id UUID,
    p_lawyer_id UUID
)
RETURNS TABLE (
    client_name TEXT,
    client_phone TEXT,
    client_email TEXT
) AS $$
DECLARE
    v_purchase lead_purchases%ROWTYPE;
BEGIN
    -- Проверяем, что юрист купил этот лид
    SELECT * INTO v_purchase
    FROM lead_purchases
    WHERE lead_id = p_lead_id 
      AND lawyer_id = p_lawyer_id
      AND payment_status = 'paid'
      AND contact_revealed = FALSE
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Лид не приобретён или контакты уже раскрыты';
    END IF;
    
    -- Раскрываем контакты
    UPDATE lead_purchases
    SET contact_revealed = TRUE,
        revealed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_purchase.id;
    
    -- Возвращаем контакты
    RETURN QUERY
    SELECT l.client_name, l.client_phone, l.client_email
    FROM leads l
    WHERE l.id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- 10. View для юристов - доступные лиды
-- Сначала удаляем старое представление, чтобы избежать ошибок при изменении колонок
DROP VIEW IF EXISTS available_leads_view;

CREATE OR REPLACE VIEW available_leads_view AS
SELECT 
    l.id,
    l.region,
    l.case_type,
    l.case_description,
    l.budget,
    l.urgency,
    l.price,
    l.priority,
    l.status,
    l.created_at,
    -- Проверяем, не куплен ли уже этот лид текущим юристом
    (lp.id IS NOT NULL) AS already_purchased,
    lp.status AS purchase_status
FROM leads l
-- Присоединяем покупки только для текущего юриста, чтобы избежать дубликатов и показать правильный статус
LEFT JOIN lead_purchases lp ON l.id = lp.lead_id AND lp.lawyer_id = (SELECT id FROM lawyers WHERE user_id = auth.uid())
WHERE l.status = 'new' 
  AND l.expires_at > NOW()
ORDER BY l.price DESC, l.priority DESC;

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Лиды видят только их создатели
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own leads" ON leads;
CREATE POLICY "Users can see own leads" ON leads
    FOR SELECT USING (created_by = auth.uid());

-- Юристы видят все лиды (для покупки)
DROP POLICY IF EXISTS "Lawyers can see all leads" ON leads;
CREATE POLICY "Lawyers can see all leads" ON leads
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lawyers WHERE user_id = auth.uid())
    );

-- Лиды могут создаваться публично (без авторизации для демо)
-- Для продакшена нужно добавить проверку
-- Добавляем политику на создание лидов, чтобы разрешить вставку
DROP POLICY IF EXISTS "Anyone can create leads" ON leads;
CREATE POLICY "Anyone can create leads" ON leads
    FOR INSERT
    WITH CHECK (true);

-- Покупки видит только юрист
ALTER TABLE lead_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lawyers see own purchases" ON lead_purchases;
CREATE POLICY "Lawyers see own purchases" ON lead_purchases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM lawyers 
            WHERE user_id = auth.uid() 
            AND id = lead_purchases.lawyer_id
        )
    );

-- =====================================================
-- Начальные данные для демо
-- =====================================================

-- Добавим демо-лиды
INSERT INTO leads (client_name, client_phone, client_email, region, case_type, case_description, budget, urgency, price) VALUES
('Алексей Петров', '+7 (999) 111-22-33', 'alexey@example.com', 'Москва', 'civil', 'Спор с застройщиком по качеству квартиры', '50 000-100 000', 'high', 1500),
('Мария Сидорова', '+7 (999) 222-33-44', 'maria@example.com', 'Санкт-Петербург', 'family', 'Раздел имущества после развода', '30 000-50 000', 'medium', 750),
('Иван Иванов', '+7 (999) 333-44-55', 'ivan@example.com', 'Казань', 'arbitration', 'Взыскание долга с контрагента', '100 000+', 'high', 2500),
('Елена Козлова', '+7 (999) 444-55-66', 'elena@example.com', 'Новосибирск', 'civil', 'ДТП - возмещение ущерба', 'до 10 000', 'low', 500),
('Сергей Смирнов', '+7 (999) 555-66-77', 'sergey@example.com', 'Москва', 'criminal', 'Защита по уголовному делу', '100 000+', 'high', 3000);

-- Обновим приоритеты для демо-лидов
UPDATE leads SET priority = EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER / 3600;

-- =====================================================
-- User Saved Cases - Таблица сохраненных дел
-- =====================================================

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Core case data from parsing
    number TEXT NOT NULL,
    court TEXT,
    status TEXT,
    date TEXT,
    category TEXT,
    judge TEXT,
    plaintiff TEXT,
    defendant TEXT,
    link TEXT NOT NULL,
    
    -- Dynamic data stored as JSON
    events JSONB,
    appeals JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);

-- RLS Policies for cases
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own cases" ON cases;
CREATE POLICY "Users can manage their own cases" ON cases
    FOR ALL
    USING (auth.uid() = user_id);
