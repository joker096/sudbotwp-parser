-- =====================================================
-- Настройка автомониторинга компаний через pg_cron
-- Выполните в SQL-редакторе Supabase
-- =====================================================

-- Включаем pg_cron (если ещё не включён)
-- Примечание: в Supabase pg_cron обычно уже доступен

-- 1. Создаём таблицу отслеживаемых компаний (если ещё не создана)
CREATE TABLE IF NOT EXISTS monitored_companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    inn text NOT NULL,
    name text,
    ogrn text,
    risk_score integer DEFAULT 0,
    status text DEFAULT 'active',
    last_egrul_data jsonb,
    last_fssp_count integer DEFAULT 0,
    last_efrsb_count integer DEFAULT 0,
    last_check_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, inn)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_monitored_companies_user_id ON monitored_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_monitored_companies_inn ON monitored_companies(inn);
CREATE INDEX IF NOT EXISTS idx_monitored_companies_last_check ON monitored_companies(last_check_at);

-- RLS
ALTER TABLE monitored_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own monitored companies" ON monitored_companies;
CREATE POLICY "Users can view own monitored companies" ON monitored_companies
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own monitored companies" ON monitored_companies;
CREATE POLICY "Users can insert own monitored companies" ON monitored_companies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own monitored companies" ON monitored_companies;
CREATE POLICY "Users can delete own monitored companies" ON monitored_companies
    FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Таблица событий (лента изменений)
CREATE TABLE IF NOT EXISTS company_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES monitored_companies(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'director_changed', 'status_changed', 'address_changed', 'new_fssp', 'new_bankruptcy'
    event_data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_events_company_id ON company_events(company_id);
CREATE INDEX IF NOT EXISTS idx_company_events_created_at ON company_events(created_at DESC);

ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company events" ON company_events;
CREATE POLICY "Users can view own company events" ON company_events
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM monitored_companies mc
        WHERE mc.id = company_events.company_id
        AND mc.user_id = auth.uid()
    ));

-- 3. Настройка cron (раз в сутки в 6:00 утра)
-- Примечание: pg_cron может не быть доступен во всех планах Supabase
-- Если не доступен — используйте внешний cron (GitHub Actions / Vercel Cron)

SELECT cron.schedule(
    'monitor-companies-daily',  -- имя задачи
    '0 6 * * *',              -- cron-выражение: каждый день в 6:00
    $$ SELECT net.http_post(
        url := 'https://qhiietjvfuekfaehddox.supabase.co/functions/v1/monitor-companies',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaWlldGp2ZnVla2ZhZWhkZG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNDY3MTAsImV4cCI6MjA2NTcyMjcxMH0.Ae-xBpuSnLcQpWGC8COR3N_5BAjdJ6cqkzP4rnCJAzA", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    ) $$,
    'UTC'
);

-- Проверка: SELECT * FROM cron.job;

-- 4. Функция для получения ленты событий пользователя
CREATE OR REPLACE FUNCTION get_user_events(p_user_id uuid)
RETURNS TABLE (
    event_id uuid,
    company_name text,
    company_inn text,
    event_type text,
    event_data jsonb,
    created_at timestamptz,
    is_read boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id as event_id,
        mc.name as company_name,
        mc.inn as company_inn,
        ce.event_type,
        ce.event_data,
        ce.created_at,
        ce.is_read
    FROM company_events ce
    JOIN monitored_companies mc ON mc.id = ce.company_id
    WHERE mc.user_id = p_user_id
    ORDER BY ce.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_monitored_companies_updated_at ON monitored_companies;
CREATE TRIGGER update_monitored_companies_updated_at
    BEFORE UPDATE ON monitored_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Готово! Теперь можно добавлять компании для мониторинга
-- =====================================================
