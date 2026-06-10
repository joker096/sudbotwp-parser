# Project Instructions

This file provides context for AI assistants working on this project.

## Project Type: Node.js

### Commands
- Install: `npm install`
- Test: `npm test`
- Build: `npm run build`
- Start: `npm start`

### Framework: Vite

### Documentation
See README.md for project overview.

### Version Control
This project uses Git. See .gitignore for excluded files.


## Guidelines

- Follow existing code style and patterns
- Write tests for new functionality
- Keep changes focused and atomic
- Document public APIs

## Important Notes

## Workflow: AI Article Generation

### Если пользователь говорит «Выполни BATCH_TASK.md»:

1. Прочитай `BATCH_TASK.md` — в нём список статей для генерации
2. Для каждой статьи из раздела «Осталось заполнить»:
   a. Сгенерируй уникальный контент по требованиям ниже
   b. Сохрани JSON в `generated-posts/<slug>.json` (создай папку если нет)
   c. После каждого файла запусти `node scripts/generate.js done generated-posts/<slug>.json`
3. Показывай прогресс: сколько готово, сколько осталось
4. Если процесс прервался — начни с незаполненных файлов (они без ✓ в списке)

### Правила контента

- **Объём:** 3500+ слов (цель — 3500-4500), живой экспертный тон, без канцелярита
- **Структура:** минимум 5-7 разделов h2, внутри h3-h4, а также p, ul, ol, li, strong, em, details, summary, section
- **Практические примеры:** 3+ реальных примера из судебной практики или жизненных ситуаций на статью
- **Таблицы:** 2+ таблицы (table/thead/tbody/tr/th/td) с полезными сравнениями. Таблицы без атрибутов style и class
- **Контроль объёма:** после генерации удали HTML-теги через text.replace(/<[^>]+>/g, ' '), разбей по пробельным символам text.split(/\s+/).filter(Boolean).length и убедись что слов >= 3500. Если меньше — расширь.
- **FAQ:** 8+ вопросов в конце, обёрнутых в FAQPage Schema:

  ```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Вопрос",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ответ"
        }
      }
    ]
  }
  </script>
  ```

- **CTA-блоки:** 3-4 на статью. Вставляй только там, где это уместно по смыслу:

  - `<div class="cta-box-calculator">...</div>` — когда речь о ценах, расчётах, пошлинах
  - `<div class="cta-box-gosuslugi">...</div>` — когда речь о госуслугах, документах
  - `<div class="cta-box">...</div>` — общий призыв к действию
  - `<div class="cta-box-accent">...</div>` — важный акцент, предупреждение

  Точный HTML блоков (копировать как есть):

  ```html
  <!-- CTA: Калькулятор -->
  <div class="cta-box-calculator">
    <p><strong>Рассчитайте стоимость прямо сейчас</strong></p>
    <p>Воспользуйтесь нашим калькулятором, чтобы узнать точную сумму госпошлины или стоимость услуг.</p>
    <a href="/calculator" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;">Калькулятор</a>
  </div>

  <!-- CTA: Госуслуги -->
  <div class="cta-box-gosuslugi">
    <p><strong>Не хотите разбираться в документах?</strong></p>
    <p>Юрист сформирует иск и подскажет, какие файлы прикрепить.</p>
    <a href="/lawyers" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;">Профессионалы своего дела</a>
  </div>

  <!-- Блок призыва (CTA) -->
  <div class="cta-box">
    <p><strong>Нужна консультация по вашему случаю?</strong></p>
    <p>Оставьте заявку, и наш юрист свяжется с вами в течение часа.</p>
    <a href="/contact" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;">Связаться</a>
  </div>

  <!-- CTA: Акцентный -->
  <div class="cta-box-accent">
    <p><strong>Важно!</strong></p>
    <p>Не откладывайте — сроки могут быть ограничены.</p>
    <a href="/register" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;">Записаться</a>
  </div>
  ```

- **SEO:** Заполни в JSON: seo_title, seo_description, seo_keywords, og_title, og_description
- **excerpt:** 1-2 предложения, краткое описание статьи (без повторов заголовка)
- **read_time:** Рассчитай исходя из 150 слов/мин, округли до целых минут
- **Запрещено:**
  - `style=""` на любых тегах (кроме кнопок CTA-блоков)
  - `class=""` на любых тегах (кроме CTA-классов)
  - Эмодзи
  - ИИ-штампы: "в мире современных технологий", "добро пожаловать в мир", "давайте разберёмся", "в современном мире", "стремительно развивается", "невозможно переоценить"
  - Шаблонные фразы-паразиты: "ключевой темой", "играет важную роль", "подробное руководство поможет", "на сегодняшний день"

### Формат JSON

```json
{
  "title": "Название статьи",
  "slug": "transliterirovannyy-slug",
  "excerpt": "Краткое описание (1-2 предложения)",
  "content": "<h2>Введение</h2>\n<p>Полный HTML контент...</p>",
  "category": "Инструкции",
  "author": "Админ",
  "read_time": "7 мин",
  "published": true,
  "seo_title": "Название: SEO-заголовок 2026",
  "seo_description": "Мета-описание для поисковиков",
  "seo_keywords": "ключевые, слова, через, запятую",
  "og_title": "Название для соцсетей",
  "og_description": "Описание для соцсетей",
  "og_image": ""
}
```
