-- Добавить недостающие колонки в таблицу leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Также проверить lawyer_id (уже есть)
