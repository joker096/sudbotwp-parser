-- Таблица для отслеживания просмотров дополнительных данных о юристах
CREATE TABLE IF NOT EXISTS lawyer_view_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lawyer_id TEXT NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  current_month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ограничение: один рекорд на пользователя и юриста за месяц
  CONSTRAINT unique_lawyer_view_limit UNIQUE (user_id, lawyer_id, current_month)
);

-- Индекс для быстрого поиска
CREATE INDEX idx_lawyer_view_limits_user ON lawyer_view_limits(user_id);
CREATE INDEX idx_lawyer_view_limits_lawyer ON lawyer_view_limits(lawyer_id);

COMMENT ON TABLE lawyer_view_limits IS 'Лимиты просмотров доп. данных юристов для каждого пользователя';
COMMENT ON COLUMN lawyer_view_limits.current_month IS 'Формат YYYY-MM для сброса каждый месяц';

-- RLS Policies
ALTER TABLE lawyer_view_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own records" ON lawyer_view_limits
  FOR INSERT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own records" ON lawyer_view_limits
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can select their records" ON lawyer_view_limits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own records" ON lawyer_view_limits
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
