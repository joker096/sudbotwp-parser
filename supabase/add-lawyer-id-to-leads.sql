-- Добавить lawyer_id в таблицу leads для привязки заявок к конкретным юристам
-- lawyer_id = NULL → платный лид (доступен для покупки)
-- lawyer_id = uuid → бесплатная заявка конкретному юристу

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lawyer_id uuid REFERENCES lawyers(id);

-- Индекс для быстрого поиска заявок юриста
CREATE INDEX IF NOT EXISTS idx_leads_lawyer_id ON leads(lawyer_id);

-- Обновить существующие демо данные - установить lawyer_id = null (платные лиды)
UPDATE leads SET lawyer_id = NULL WHERE lawyer_id IS NULL;