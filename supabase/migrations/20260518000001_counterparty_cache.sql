-- =====================================================
-- Миграция: кэширование результатов проверки контрагентов
-- Дата: 2026-05-18
-- =====================================================

-- Таблица кэша проверок контрагентов
CREATE TABLE IF NOT EXISTS counterparty_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inn text NOT NULL UNIQUE,
    egrul_data jsonb,
    fssp_data jsonb,
    efrsb_data jsonb,
    rosstat_data jsonb,
    risk_score jsonb,
    checked_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Добавляем колонку, если таблица уже существовала без неё
ALTER TABLE counterparty_checks ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours');

-- Индексы
CREATE INDEX IF NOT EXISTS idx_counterparty_checks_inn ON counterparty_checks(inn);
CREATE INDEX IF NOT EXISTS idx_counterparty_checks_expires ON counterparty_checks(expires_at);

-- RLS (доступ только для сервисного ключа или авторизованных)
ALTER TABLE counterparty_checks ENABLE ROW LEVEL SECURITY;

-- Политика: только чтение для всех (данные кэша общедоступны)
DROP POLICY IF EXISTS "Allow read access to cache" ON counterparty_checks;
CREATE POLICY "Allow read access to cache" ON counterparty_checks
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Политика: только insert/update через сервисную роль (Edge Functions)
DROP POLICY IF EXISTS "Allow insert/update via service role" ON counterparty_checks;
CREATE POLICY "Allow insert/update via service role" ON counterparty_checks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Функция очистки старых записей (старше 7 дней)
CREATE OR REPLACE FUNCTION cleanup_counterparty_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM counterparty_checks WHERE checked_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
