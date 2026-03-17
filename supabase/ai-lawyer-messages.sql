-- AI Lawyer Messages and Usage Tracking
-- Таблица для хранения сообщений с ИИ-юристом
CREATE TABLE IF NOT EXISTS ai_lawyer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого получения сообщений пользователя
CREATE INDEX IF NOT EXISTS idx_ai_lawyer_messages_user_id ON ai_lawyer_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_lawyer_messages_created_at ON ai_lawyer_messages(created_at);

-- Таблица для отслеживания использования ИИ-юриста (лимиты)
CREATE TABLE IF NOT EXISTS ai_lawyer_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  messages_count INTEGER DEFAULT 0,
  current_month VARCHAR(7) NOT NULL, -- Формат: YYYY-MM
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по пользователю и месяцу
CREATE INDEX IF NOT EXISTS idx_ai_lawyer_usage_user_month ON ai_lawyer_usage(user_id, current_month);

-- Включаем RLS
ALTER TABLE ai_lawyer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lawyer_usage ENABLE ROW LEVEL SECURITY;

-- Политика для ai_lawyer_messages: пользователь может читать только свои сообщения
DROP POLICY IF EXISTS "Users can read own ai_lawyer_messages" ON ai_lawyer_messages;
CREATE POLICY "Users can read own ai_lawyer_messages" ON ai_lawyer_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Политика для ai_lawyer_messages: пользователь может добавлять свои сообщения
DROP POLICY IF EXISTS "Users can insert own ai_lawyer_messages" ON ai_lawyer_messages;
CREATE POLICY "Users can insert own ai_lawyer_messages" ON ai_lawyer_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политика для ai_lawyer_usage: пользователь может читать только свои данные
DROP POLICY IF EXISTS "Users can read own ai_lawyer_usage" ON ai_lawyer_usage;
CREATE POLICY "Users can read own ai_lawyer_usage" ON ai_lawyer_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Политика для ai_lawyer_usage: пользователь может обновлять только свои данные
DROP POLICY IF EXISTS "Users can update own ai_lawyer_usage" ON ai_lawyer_usage;
CREATE POLICY "Users can update own ai_lawyer_usage" ON ai_lawyer_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Политика для ai_lawyer_usage: пользователь может вставлять свои данные
DROP POLICY IF EXISTS "Users can insert own ai_lawyer_usage" ON ai_lawyer_usage;
CREATE POLICY "Users can insert own ai_lawyer_usage" ON ai_lawyer_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);
