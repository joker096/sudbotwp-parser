-- =====================================================
-- SITE SETTINGS - Настройки сайта (Google Analytics и др.)
-- =====================================================

-- Создание таблицы настроек сайта
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Вставка настроек по умолчанию
INSERT INTO site_settings (key, value, description) VALUES
  ('ga_measurement_id', '', 'Google Analytics Measurement ID (формат: G-XXXXXXXXXX)'),
  ('ga_enabled', 'false', 'Включить Google Analytics (true/false)')
ON CONFLICT (key) DO NOTHING;

-- Включаем RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все аутентифицированные пользователи)
CREATE POLICY "site_settings_select" 
  ON site_settings 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Политика для чтения (анонимные пользователи)
CREATE POLICY "site_settings_select_anon" 
  ON site_settings 
  FOR SELECT 
  TO anon 
  USING (true);

-- Политика для обновления (только админы)
CREATE POLICY "site_settings_update" 
  ON site_settings 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role IS NULL)
    )
  );

-- Политика для вставки (только админы)
CREATE POLICY "site_settings_insert" 
  ON site_settings 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role IS NULL)
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS trigger_site_settings_updated_at ON site_settings;
CREATE TRIGGER trigger_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();