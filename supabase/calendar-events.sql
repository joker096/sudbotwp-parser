-- Таблица пользовательских событий календаря
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  event_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  description TEXT,
  case_id UUID, -- опциональная привязка к делу
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, event_date);

-- RLS политики
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Пользователь может видеть только свои события
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователь может создавать только свои события
CREATE POLICY "Users can insert own calendar events" ON calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователь может обновлять только свои события
CREATE POLICY "Users can update own calendar events" ON calendar_events
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Пользователь может удалять только свои события
CREATE POLICY "Users can delete own calendar events" ON calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_calendar_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления времени
CREATE TRIGGER update_calendar_event_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_updated_at();

-- Комментарии для документации
COMMENT ON TABLE calendar_events IS 'Пользовательские события календаря';
COMMENT ON COLUMN calendar_events.user_id IS 'ID пользователя';
COMMENT ON COLUMN calendar_events.title IS 'Название события';
COMMENT ON COLUMN calendar_events.event_date IS 'Дата события';
COMMENT ON COLUMN calendar_events.event_time IS 'Время события';
COMMENT ON COLUMN calendar_events.event_type IS 'Тип события: hearing, deadline, reminder, custom';
COMMENT ON COLUMN calendar_events.description IS 'Описание события';
COMMENT ON COLUMN calendar_events.case_id IS 'Ссылка на дело (опционально)';
COMMENT ON COLUMN calendar_events.is_recurring IS 'Повторяющееся событие';
COMMENT ON COLUMN calendar_events.recurrence_rule IS 'Правило повторения (RRULE)';
