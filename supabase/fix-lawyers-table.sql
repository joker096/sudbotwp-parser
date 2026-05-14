-- Добавить недостающие колонки в таблицу lawyers
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS telegram TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS practice_areas JSONB DEFAULT '[]';
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]';

-- Проверить какие колонки есть
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lawyers' ORDER BY ordinal_position;
