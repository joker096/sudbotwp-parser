-- =====================================================
-- EXTERNAL LINKS ADS SETTINGS - Настройки рекламы для внешних ссылок
-- =====================================================

-- Добавление настроек рекламы для внешних ссылок
INSERT INTO site_settings (key, value, description) VALUES
  ('external_links_ad_enabled', 'true', 'Включить показ рекламы при переходе по внешним ссылкам (true/false)'),
  ('external_links_ad_type', 'modal', 'Тип рекламы при клике на внешнюю ссылку: modal (модальное окно с рекламой), direct (прямой переход), interstitial (межстраничная реклама)'),
  ('external_links_ad_text', 'Хотите получать уведомления о новых событиях по вашему делу?', 'Текст рекламного сообщения при переходе по внешней ссылке'),
  ('external_links_ad_cta_text', 'Подключить мониторинг', 'Текст кнопки призыва к действию'),
  ('external_links_ad_cta_url', '/monitoring', 'URL для кнопки призыва к действию'),
  ('external_links_show_warning', 'true', 'Показывать предупреждение о переходе на внешний сайт (true/false)')
ON CONFLICT (key) DO NOTHING;

-- Обновление RLS политик для новых настроек
DO $$
BEGIN
  -- Политика для чтения уже существует, проверяем и создаем если нужно
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'site_settings_select_anon_external'
  ) THEN
    CREATE POLICY "site_settings_select_anon_external" 
    ON site_settings 
    FOR SELECT 
    TO anon 
    USING (true);
  END IF;
END $$;
