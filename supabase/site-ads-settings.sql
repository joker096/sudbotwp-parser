-- =====================================================
-- SITE ADS SETTINGS - Настройки рекламы на сайте
-- =====================================================

-- Расширяем таблицу site_settings новыми настройками рекламы
-- Позиции рекламы: header, sidebar, content-top, content-middle, content-bottom, footer, between-posts

-- Глобальные настройки рекламы
INSERT INTO site_settings (key, value, description) VALUES
  ('site_ads_enabled', 'true', 'Включить показ рекламы на сайте (true/false)'),
  ('site_ads_global_yandex', '', 'Глобальный код Яндекс.Рекламы (будет показываться на всех позициях)'),
  ('site_ads_global_google', '', 'Глобальный код Google AdSense (будет показываться на всех позициях)'),
  ('site_ads_global_custom', '', 'Глобальный пользовательский код (HTML/JS)')
ON CONFLICT (key) DO NOTHING;

-- Реклама в header (над навигацией)
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_header_enabled', 'false', 'Показывать рекламу в header (true/false)'),
  ('ad_header_yandex', '', 'Код Яндекс.Рекламы для header'),
  ('ad_header_google', '', 'Код Google AdSense для header'),
  ('ad_header_custom', '', 'Пользовательский код для header')
ON CONFLICT (key) DO NOTHING;

-- Реклама в sidebar (боковая колонка)
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_sidebar_enabled', 'true', 'Показывать рекламу в sidebar (true/false)'),
  ('ad_sidebar_position', 'right', 'Позиция sidebar: left или right'),
  ('ad_sidebar_yandex', '', 'Код Яндекс.Рекламы для sidebar'),
  ('ad_sidebar_google', '', 'Код Google AdSense для sidebar'),
  ('ad_sidebar_custom', '', 'Пользовательский код для sidebar')
ON CONFLICT (key) DO NOTHING;

-- Реклама над контентом
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_content_top_enabled', 'true', 'Показывать рекламу над контентом (true/false)'),
  ('ad_content_top_yandex', '', 'Код Яндекс.Рекламы для верхней части'),
  ('ad_content_top_google', '', 'Код Google AdSense для верхней части'),
  ('ad_content_top_custom', '', 'Пользовательский код для верхней части')
ON CONFLICT (key) DO NOTHING;

-- Реклама в середине контента
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_content_middle_enabled', 'true', 'Показывать рекламу в середине контента (true/false)'),
  ('ad_content_middle_yandex', '', 'Код Яндекс.Рекламы для середины'),
  ('ad_content_middle_google', '', 'Код Google AdSense для середины'),
  ('ad_content_middle_custom', '', 'Пользовательский код для середины')
ON CONFLICT (key) DO NOTHING;

-- Реклама под контентом
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_content_bottom_enabled', 'true', 'Показывать рекламу под контентом (true/false)'),
  ('ad_content_bottom_yandex', '', 'Код Яндекс.Рекламы для нижней части'),
  ('ad_content_bottom_google', '', 'Код Google AdSense для нижней части'),
  ('ad_content_bottom_custom', '', 'Пользовательский код для нижней части')
ON CONFLICT (key) DO NOTHING;

-- Реклама в footer
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_footer_enabled', 'true', 'Показывать рекламу в footer (true/false)'),
  ('ad_footer_yandex', '', 'Код Яндекс.Рекламы для footer'),
  ('ad_footer_google', '', 'Код Google AdSense для footer'),
  ('ad_footer_custom', '', 'Пользовательский код для footer')
ON CONFLICT (key) DO NOTHING;

-- Реклама между постами/элементами списка
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_between_items_enabled', 'true', 'Показывать рекламу между элементами списка (true/false)'),
  ('ad_between_items_after', '3', 'Показывать рекламу после N-го элемента'),
  ('ad_between_items_yandex', '', 'Код Яндекс.Рекламы для вставки между элементами'),
  ('ad_between_items_google', '', 'Код Google AdSense для вставки между элементами'),
  ('ad_between_items_custom', '', 'Пользовательский код для вставки между элементами')
ON CONFLICT (key) DO NOTHING;

-- Реклама на главной странице
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_homepage_enabled', 'true', 'Показывать рекламу на главной странице (true/false)'),
  ('ad_homepage_banner_text', 'Ваша реклама здесь', 'Текст для баннера на главной'),
  ('ad_homepage_banner_desc', 'Нативное размещение рекламы для вашей целевой аудитории. Привлекайте клиентов, которым нужны юридические услуги.', 'Описание для баннера на главной'),
  ('ad_homepage_banner_cta', 'Узнать подробнее', 'Текст кнопки баннера'),
  ('ad_homepage_banner_url', '/leads', 'URL для кнопки баннера'),
  ('ad_homepage_banner_image_url', '', 'URL изображения для кастомного баннера')
ON CONFLICT (key) DO NOTHING;

-- Реклама на странице поиска
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_search_enabled', 'true', 'Показывать рекламу на странице поиска (true/false)')
ON CONFLICT (key) DO NOTHING;

-- Реклама на странице юристов
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_lawyers_enabled', 'true', 'Показывать рекламу на странице юристов (true/false)')
ON CONFLICT (key) DO NOTHING;

-- Реклама в статьях блога
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_blog_article_enabled', 'true', 'Показывать рекламу в статьях блога (true/false)'),
  ('ad_blog_article_after_paragraph', '3', 'Показывать рекламу после N-го абзаца в статье'),
  ('ad_blog_article_yandex', '', 'Код Яндекс.Рекламы в статьях'),
  ('ad_blog_article_google', '', 'Код Google AdSense в статьях'),
  ('ad_blog_article_custom', '', 'Пользовательский код в статьях')
ON CONFLICT (key) DO NOTHING;

-- Реклама в лидах
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_leads_enabled', 'true', 'Показывать рекламу на странице лидов (true/false)')
ON CONFLICT (key) DO NOTHING;

-- Реклама в мониторинге
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_monitoring_enabled', 'true', 'Показывать рекламу на странице мониторинга (true/false)')
ON CONFLICT (key) DO NOTHING;

-- Реклама в калькуляторе
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_calculator_enabled', 'true', 'Показывать рекламу на странице калькулятора (true/false)')
ON CONFLICT (key) DO NOTHING;

-- Частота показов (чтобы не показывать слишком часто)
INSERT INTO site_settings (key, value, description) VALUES
  ('ad_frequency_limit', '3', 'Максимальное количество рекламных блоков на одной странице'),
  ('ad_refresh_interval', '0', 'Интервал обновления рекламы в секундах (0 - не обновлять)')
ON CONFLICT (key) DO NOTHING;