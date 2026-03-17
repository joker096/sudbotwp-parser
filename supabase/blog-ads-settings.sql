-- =====================================================
-- BLOG ADS SETTINGS - Настройки рекламы в статьях
-- =====================================================

-- Добавление настроек рекламы для блога
INSERT INTO site_settings (key, value, description) VALUES
  ('blog_ads_enabled', 'false', 'Включить показ рекламы внутри статей (true/false)'),
  ('blog_ad_after_paragraph', '3', 'Показывать рекламу после N-го абзаца (0 - отключено)'),
  ('blog_ad_yandex_code', '', 'Код Яндекс.Рекламы (HTML/JavaScript)'),
  ('blog_ad_google_code', '', 'Код Google AdSense (HTML/JavaScript)'),
  ('blog_ad_custom_code', '', 'Пользовательский код рекламы (HTML/JavaScript)')
ON CONFLICT (key) DO NOTHING;

-- Обновление RLS политик для новых настроек
-- Политика для чтения (все пользователи)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'site_settings_select_anon_blog'
  ) THEN
    CREATE POLICY "site_settings_select_anon_blog" 
    ON site_settings 
    FOR SELECT 
    TO anon 
    USING (true);
  END IF;
END $$;
