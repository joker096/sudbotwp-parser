-- Добавление колонки avatar_url в таблицу lawyers
-- Выполните это в SQL Editor панели Supabase

-- Добавляем колонку avatar_url если её нет
ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
