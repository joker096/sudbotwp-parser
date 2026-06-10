# Генератор блог-постов для sud.cvr.name

## Рабочий поток

1. Правите `topics.txt` и/или `BATCH_TASK.md`.
2. Для каждой статьи из раздела «Осталось заполнить» создаётся `generated-posts/<slug>.json`.
3. После каждого файла запускается `node scripts/generate.js done generated-posts/<slug>.json`.
4. Прогресс можно проверять через `node scripts/generate.js status` или просто сказать «Выполни BATCH_TASK.md».

## Опции

- `node scripts/generate.js` использует `BATCH_TASK.md` как источник задач.
- Шаблон контента и ограничения задаются в `AGENTS.md` (объём, структура, CTA-блоки, FAQPage, SEO).
- JSON должен лежать в `generated-posts/<slug>.json` и содержать поля: `title, slug, excerpt, content, category, author, read_time, published, seo_title, seo_description, seo_keywords, og_title, og_description, og_image`.

## Пример

```bash
node scripts/generate.js status
node scripts/generate.js done generated-posts/001-slug.json
```

## Формат topics.txt

```
Как подать иск в суд онлайн через ГАС Правосудие
Банкротство физических лиц: пошаговое руководство 2026
```