-- Добавление полей для хранения файлов шаблонов
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_document_templates_file_url ON document_templates(file_url);
