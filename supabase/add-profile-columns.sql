-- Добавление недостающих колонок в таблицу profiles

-- Колонка для токена синхронизации календаря
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS calendar_token VARCHAR(64) UNIQUE;

-- Колонка для хранения Telegram chat ID
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

-- Индекс для быстрого поиска по токену календаря
CREATE INDEX IF NOT EXISTS idx_profiles_calendar_token ON profiles(calendar_token);

-- Индекс для быстрого поиска по Telegram chat ID
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON profiles(telegram_chat_id);

-- Комментарии для документации
COMMENT ON COLUMN profiles.calendar_token IS 'Токен для синхронизации календаря (ICS feed)';
COMMENT ON COLUMN profiles.telegram_chat_id IS 'ID чата Telegram для отправки уведомлений';
