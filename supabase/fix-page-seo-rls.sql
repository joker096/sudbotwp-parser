-- Исправление RLS политик для SEO и настроек сайта

-- 1. Политика для page_seo (SEO настройки)
DROP POLICY IF EXISTS "Anyone can update page seo" ON page_seo;
CREATE POLICY "Anyone can update page seo" ON page_seo
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role IS NULL)
        )
    );

-- 2. Политика для site_settings (настройки сайта, включая Google Analytics)
DROP POLICY IF EXISTS "site_settings_update" ON site_settings;
CREATE POLICY "site_settings_update" 
  ON site_settings 
  FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);
