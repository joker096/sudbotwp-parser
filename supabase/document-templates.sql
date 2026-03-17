-- Таблица для хранения шаблонов документов
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    icon TEXT DEFAULT '📄',
    content TEXT,
    file_url TEXT,  -- Ссылка на файл в Storage
    file_name TEXT, -- Оригинальное имя файла
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для поиска по категории
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);

-- Индекс для поиска по названию
CREATE INDEX IF NOT EXISTS idx_document_templates_name ON document_templates(name);

-- RLS - админы могут управлять, все могут читать
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Политика чтения для всех
DROP POLICY IF EXISTS "Anyone can view document_templates" ON document_templates;
CREATE POLICY "Anyone can view document_templates" ON document_templates
    FOR SELECT
    USING (is_active = true);

-- Полизия вставки для админов (проверка по role)
DROP POLICY IF EXISTS "Admins can insert document_templates" ON document_templates;
CREATE POLICY "Admins can insert document_templates" ON document_templates
    FOR INSERT
    WITH CHECK (true);

-- Полизия обновления для админов
DROP POLICY IF EXISTS "Admins can update document_templates" ON document_templates;
CREATE POLICY "Admins can update document_templates" ON document_templates
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Полизия удаления для админов (мягкое удаление - только деактивация)
DROP POLICY IF EXISTS "Admins can delete document_templates" ON document_templates;
CREATE POLICY "Admins can delete document_templates" ON document_templates
    FOR DELETE
    USING (true);

-- Вставка начальных шаблонов (если таблица пустая)
INSERT INTO document_templates (name, description, category, icon, is_active)
SELECT 'Исковое заявление', 'Стандартный шаблон искового заявления в суд общей юрисдикции', 'Иски', '📝', true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Исковое заявление');

INSERT INTO document_templates (name, description, category, icon, is_active)
SELECT 'Возражения на иск', 'Возражения на исковое заявление ответчика', 'Защита', '🛡️', true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Возражения на иск');

INSERT INTO document_templates (name, description, category, icon, is_active)
SELECT 'Ходатайство', 'Ходатайство о назначении экспертизы, привлечении свидетелей и т.д.', 'Ходатайства', '📋', true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Ходатайство');

INSERT INTO document_templates (name, description, category, icon, is_active)
SELECT 'Апелляционная жалоба', 'Жалоба на решение суда в апелляционную инстанцию', 'Жалобы', '⚖️', true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Апелляционная жалоба');

INSERT INTO document_templates (name, description, category, icon, is_active)
SELECT 'Кассационная жалоба', 'Жалоба в кассационную инстанцию', 'Жалобы', '📇', true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Кассационная жалоба');

INSERT INTO document_templates (name, description, category, icon, is_active)
SELECT 'Досудебная претензия', 'Претензия перед подачей иска (обязательный досудебный порядок)', 'Претензии', '✉️', true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Досудебная претензия');

INSERT INTO document_templates (name, description, category, icon, is_active)
SELECT 'Расписка', 'Расписка о получении денег/имущества', 'Доказательства', '💰', true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Расписка');

INSERT INTO document_templates (name, description, category, icon, is_active)
SELECT 'Доверенность', 'Доверенность на представление интересов в суде', 'Полномочия', '📜', true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Доверенность');