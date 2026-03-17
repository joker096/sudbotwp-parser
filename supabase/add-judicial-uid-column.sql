-- =====================================================
-- SQL миграция для добавления столбца judicialUid в таблицу cases
-- Выполните этот скрипт в SQL-редакторе Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/qhiietjvfuekfaehddox/sql
-- =====================================================

-- Добавляем столбец judicialUid для хранения уникального идентификатора дела в судебной системе
ALTER TABLE cases ADD COLUMN IF NOT EXISTS judicial_uid TEXT; 

-- Создаём индекс для быстрого поиска по judicialUid
CREATE INDEX IF NOT EXISTS idx_cases_judicial_uid ON cases(judicial_uid);

-- Комментарий для документации
COMMENT ON COLUMN cases.judicial_uid IS 'Уникальный идентификатор дела в судебной системе (case_uid из URL судов)';

-- Также добавляем индекс для поиска по номеру дела и ссылке
CREATE INDEX IF NOT EXISTS idx_cases_number_link ON cases(number, link);
