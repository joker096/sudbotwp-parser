# План расширения AdminSettings для управления всеми рекламными местами

## Текущее состояние
Файл `src/components/AdminSettings.tsx` содержит настройки для:
- Google Analytics
- Реклама в статьях (blog_ads)
- Внешние ссылки (external_links_ads)

## Требуемое расширение
Нужно добавить управление следующими рекламными позициями:

### 1. Глобальные настройки рекламы
- site_ads_enabled - общий переключатель рекламы на сайте
- site_ads_global_yandex - глобальный код Яндекс.Рекламы
- site_ads_global_google - глобальный код Google AdSense
- site_ads_global_custom - глобальный пользовательский код

### 2. Реклама в header
- ad_header_enabled - показывать рекламу в header
- ad_header_yandex - код Яндекс.Рекламы для header
- ad_header_google - код Google AdSense для header
- ad_header_custom - пользовательский код для header

### 3. Реклама в sidebar
- ad_sidebar_enabled - показывать рекламу в sidebar
- ad_sidebar_position - позиция sidebar (left/right)
- ad_sidebar_yandex - код Яндекс.Рекламы для sidebar
- ad_sidebar_google - код Google AdSense для sidebar
- ad_sidebar_custom - пользовательский код для sidebar

### 4. Реклама в контенте (верх, середина, низ)
- ad_content_top_enabled - показывать рекламу над контентом
- ad_content_top_yandex - код Яндекс.Рекламы для верхней части
- ad_content_top_google - код Google AdSense для верхней части
- ad_content_top_custom - пользовательский код для верхней части

- ad_content_middle_enabled - показывать рекламу в середине контента
- ad_content_middle_yandex - код Яндекс.Рекламы для середины
- ad_content_middle_google - код Google AdSense для середины
- ad_content_middle_custom - пользовательский код для середины

- ad_content_bottom_enabled - показывать рекламу под контентом
- ad_content_bottom_yandex - код Яндекс.Рекламы для нижней части
- ad_content_bottom_google - код Google AdSense для нижней части
- ad_content_bottom_custom - пользовательский код для нижней части

### 5. Реклама в footer
- ad_footer_enabled - показывать рекламу в footer
- ad_footer_yandex - код Яндекс.Рекламы для footer
- ad_footer_google - код Google AdSense для footer
- ad_footer_custom - пользовательский код для footer

### 6. Реклама между элементами
- ad_between_items_enabled - показывать рекламу между элементами списка
- ad_between_items_after - показывать после N-го элемента
- ad_between_items_yandex - код Яндекс.Рекламы для вставки
- ad_between_items_google - код Google AdSense для вставки
- ad_between_items_custom - пользовательский код для вставки

### 7. Реклама на главной странице
- ad_homepage_enabled - показывать рекламу на главной
- ad_homepage_banner_text - текст баннера
- ad_homepage_banner_desc - описание баннера
- ad_homepage_banner_cta - текст кнопки
- ad_homepage_banner_url - URL кнопки

### 8. Реклама на конкретных страницах
- ad_search_enabled - страница поиска
- ad_lawyers_enabled - страница юристов
- ad_leads_enabled - страница лидов
- ad_monitoring_enabled - страница мониторинга
- ad_calculator_enabled - страница калькулятора

### 9. Реклама в статьях блога (обновление существующих)
- ad_blog_article_enabled - показывать в статьях
- ad_blog_article_after_paragraph - после N-го абзаца
- ad_blog_article_yandex - код Яндекс.Рекламы
- ad_blog_article_google - код Google AdSense
- ad_blog_article_custom - пользовательский код

### 10. Ограничения и настройки показа
- ad_frequency_limit - максимальное количество блоков на странице
- ad_refresh_interval - интервал обновления рекламы (сек)

## Структура UI
Добавить новые секции в AdminSettings:
1. Глобальные настройки рекламы
2. Реклама в header
3. Реклама в sidebar
4. Реклама в контенте (верх/середина/низ)
5. Реклама в footer
6. Реклама между элементами
7. Реклама на главной странице
8. Реклама на конкретных страницах
9. Реклама в статьях блога (обновить существующую секцию)
10. Ограничения показа

Каждая секция должна содержать:
- Переключатель включения/выключения
- Поля для ввода кодов (Yandex, Google, Custom)
- Описание настроек
- Предпросмотр статуса (где применимо)