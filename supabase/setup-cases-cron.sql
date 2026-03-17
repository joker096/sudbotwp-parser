-- =====================================================
-- SQL для настройки cron-задачи для автоматического обновления дел
-- Выполните этот скрипт в SQL-редакторе Supabase
-- =====================================================

-- 1. Включаем расширение pg_cron (если ещё не включено)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Примечание: pg_cron обычно уже включен в Supabase
-- Если нужно включить вручную, используйте: SELECT cron.enable();

-- =====================================================
-- Создаём задачу для ежедневного обновления в 3:00 UTC (6:00 по Москве)
-- =====================================================

-- Примечание: Если задача уже существует, удалите её вручную:
-- SELECT cron.unschedule('daily-cases-refresh');

-- Создаём задачу для вызова Edge Function
-- Запускается каждый день в 3:00 UTC
SELECT cron.schedule(
    'daily-cases-refresh',
    '0 3 * * *',  -- Каждый день в 3:00 UTC
    $$
    SELECT
        net.http_post(
            url:='https://qhiietjvfuekfaehddox.supabase.co/functions/v1/auto-refresh-cases',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer <FUNCTION_SECRET>"}'::jsonb
        ) as request_id;
    $$
);

-- =====================================================
-- Таблица для логирования обновлений (optional)
-- =====================================================

-- Создаём таблицу для логирования обновлений
CREATE TABLE IF NOT EXISTS cases_refresh_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL,
    refreshed_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_cases_refresh_log_refreshed_at 
ON cases_refresh_log(refreshed_at);

-- =====================================================
-- Инструкция по настройке:
-- =====================================================
-- 1. Замените <FUNCTION_SECRET> на ваш секретный токен
--    (можно получить в настройках Edge Functions в Supabase dashboard)
-- 2. Выполните этот скрипт в SQL-редакторе Supabase
-- 
-- Проверить расписание задач:
-- SELECT * FROM cron.job;
--
-- Просмотреть логи задач:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- Удалить задачу:
-- SELECT cron.unschedule('daily-cases-refresh');
--
-- ВАЖНО: Убедитесь, что в .func.yaml функции auto-refresh-cases
-- установлен правильный FUNCTION_SECRET
