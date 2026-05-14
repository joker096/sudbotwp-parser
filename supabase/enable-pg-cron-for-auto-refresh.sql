-- =====================================================
-- SQL Migration: Настройка pg_cron для автообновления дел
-- ВНИМАНИЕ: Требует Supabase Pro (pg_cron extension)
-- =====================================================

-- 1. Включить расширение pg_cron (выполняется один раз суперпользователем)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Настроить параметры pg_cron (базовые настройки)
-- SELECT cron.set_job('0 6 * * *', 'auto-refresh-cases-schedule', $$
--   SELECT net.http_post(
--     url := 'https://qhiietjvfuekfaehddox.supabase.co/functions/v1/auto-refresh-cases',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_FUNCTION_SECRET'
--     )
--   );
-- $$);

-- 3. АЛЬТНАТИВА: Создание schedule через Supabase Dashboard
-- После активации Supabase Pro:
-- 1. Откройте Supabase Dashboard → Database → Schedules
-- 2. Создайте новый schedule:
--    - Name: auto-refresh-cases
--    - Cron: 0 6 * * * (каждый день в 6:00 UTC = 9:00 МСК)
--    - SQL: SELECT cron.job_run_add('auto-refresh-cases-schedule', '0 6 * * *');

-- 4. Удаление schedule (если нужно)
-- SELECT cron.unschedule('auto-refresh-cases-schedule');

-- =====================================================
-- Проверка статуса pg_cron после активации Pro плана:
-- =====================================================
SELECT 
  extname AS extension,
  extversion AS version
FROM pg_extension
WHERE extname = 'pg_cron';

-- Посмотреть существующие задачи:
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =====================================================
-- Инструкция по активации:
-- =====================================================
-- 1. Обновите план на Supabase до Pro ($25/мес)
-- 2. В Dashboard перейдите в Database → Schedules  
-- 3. Создайте schedule для auto-refresh-cases:
--    - Frequency: 0 6 * * * (ежедневно в 6:00 UTC)
--    - Function: auto-refresh-cases
-- 4. Или выполните этот SQL после подключения Pro плана
-- =====================================================