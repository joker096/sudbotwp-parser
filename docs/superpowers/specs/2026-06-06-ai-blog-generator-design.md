# AI Blog Generator — Design

## Overview

Rework the article generation workflow to use AI (opencode) instead of template-based content. The existing `scripts/blog-generator.mjs` is deprecated in favor of a new workflow:

1. User tells opencode "Выполни BATCH_TASK.md"
2. opencode reads BATCH_TASK.md, generates content for each article
3. opencode runs `generate.js done <file>` to mark progress

## Components

### 1. `scripts/generate.js` — Utility Script

A Node.js script with 4 subcommands:

#### `generate.js init`

- Reads `topics.txt` (existing format: one title per line, `#` for comments)
- For each title, generates a transliterated slug (Latin characters)
- Auto-detects category from title keywords (банкротство → Инструкции, иск → Инструкции, развод → Советы, etc.)
- Writes `BATCH_TASK.md` with sections "Осталось заполнить" / "Готово"
- Each entry format:
  ```markdown
  - [ ] Как подать иск в суд онлайн через ГАС Правосудие
    - slug: kak-podat-isk-v-sud-online
    - category: Инструкции
    - keywords: иск, суд, онлайн, ГАС Правосудие
  ```

#### `generate.js done <file>`

- Reads the JSON file at `<file>` to get title/slug
- Parses `BATCH_TASK.md`
- Finds the matching article in "Осталось заполнить" by slug
- Replaces `[ ]` with `[x]`
- Outputs progress: "Готово: 3/14 (21%)"
- If article already marked done, skips

#### `generate.js status`

- Reads `BATCH_TASK.md`
- Counts `[ ]` (pending) and `[x]` (done)
- Outputs:
  ```
  Статус: 5/14 готово (36%)
  Осталось: 9 статей
  ```

#### `generate.js build [dir]`

- Scans `dir` (default: `generated-posts/`) for JSON files
- Generates corresponding HTML files (content extracted from JSON)
- Useful for static file publishing

### 2. BATCH_TASK.md Format

```markdown
# Batch Task: Генерация статей для блога sud.cvr.name

## Инструкция для AI

Сгенерируй уникальную экспертную статью на русском языке.
Правила в AGENTS.md → раздел "Правила контента".

## Осталось заполнить

- [ ] Как подать иск в суд онлайн через ГАС Правосудие
  - slug: kak-podat-isk-v-sud-online
  - category: Инструкции
  - keywords: иск, суд, онлайн, ГАС Правосудие, электронное правосудие

- [ ] Банкротство физических лиц: пошаговое руководство 2026
  - slug: bankrotstvo-fizicheskih-lic-2026
  - category: Инструкции
  - keywords: банкротство, долги, физические лица, процедура

## Готово
```

### 3. AGENTS.md — Workflow Instructions

Added section:

```markdown
## Если пользователь говорит «Выполни BATCH_TASK.md»:

1. Прочитай `BATCH_TASK.md` — в нём список статей для заполнения
2. Для каждой статьи из раздела «Осталось заполнить»:
   a. Сгенерируй контент по требованиям ниже
   b. Сохрани JSON в `generated-posts/<slug>.json`
   c. После каждого файла запусти `node scripts/generate.js done generated-posts/<slug>.json`
3. Показывай прогресс: сколько готово, сколько осталось
4. Если процесс прервался — начни с незаполненных файлов (они без ✓ в списке)

## Правила контента

- RU: 2500+ слов, живой экспертный тон, без канцелярита
- 2+ таблицы с полезными сравнениями (HTML: table/thead/tbody/tr/th/td)
- 8+ FAQ в конце + FAQPage Schema (script type="application/ld+json")
- CTA-блоки (вставлять по смыслу, копировать точный HTML):
  - cta-box-calculator — для тем про цены/расчёты/пошлины
  - cta-box-gosuslugi — для тем про госуслуги/документы
  - cta-box — общий призыв к действию
  - cta-box-accent — важный акцент/предупреждение
- Разрешённые HTML: h2-h4, p, ul, ol, li, table, strong, em, details, summary, section
- Запрещено: style="" (кроме CTA-кнопок), class="" (кроме CTA-классов), эмодзи, ИИ-штампы ("в мире современных технологий", "добро пожаловать в мир" и т.п.)
- SEO: seo_title, seo_description, seo_keywords в JSON
```

### 4. JSON Output Format

Saved to `generated-posts/<slug>.json`:

```json
{
  "title": "Как подать иск в суд онлайн через ГАС Правосудие",
  "slug": "kak-podat-isk-v-sud-online",
  "excerpt": "Пошаговое руководство по подаче иска в суд онлайн через ГАС Правосудие: регистрация, заполнение форм, отправка документов и отслеживание статуса.",
  "content": "<h2>Введение</h2>\n<p>...</p>\n<div class=\"cta-box-calculator\">...</div>\n...",
  "category": "Инструкции",
  "author": "Админ",
  "read_time": "7 мин",
  "published": true,
  "seo_title": "Как подать иск в суд онлайн через ГАС Правосудие: инструкция 2026",
  "seo_description": "Узнайте, как подать иск в суд онлайн через ГАС Правосудие. Пошаговая инструкция, список документов, сроки и стоимость.",
  "seo_keywords": "иск, суд, онлайн, ГАС Правосудие, подача иска, электронное правосудие",
  "og_title": "Подача иска онлайн через ГАС Правосудие",
  "og_description": "Полное руководство по электронной подаче исковых заявлений.",
  "og_image": ""
}
```

### 5. Slug Generation

Transliteration from Cyrillic to Latin for cleaner URLs:
- `признание-сделки-недействительной` → `priznanie-sdelki-nedeyvitelnoy`
- Uses a lookup table for common Cyrillic → Latin mappings

## File Changes

| File | Action |
|------|--------|
| `scripts/generate.js` | **Create** — utility script (init/done/status/build) |
| `AGENTS.md` | **Update** — add workflow + content rules |
| `docs/BLOG-GENERATOR.md` or `HOW-TO-USE.md` | **Update** — document new workflow |

## Non-Goals

- No AI API integration in the script (content is generated by opencode)
- No changes to Supabase schema or blog rendering
- No changes to existing `publish-posts.mjs` or `blog-generator.mjs` (kept for reference)
