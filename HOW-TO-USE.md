# Blog Post Generator - Инструкция

## Быстрый старт

1. Откройте `topics.txt`
2. Замените примеры своими темами (по одной строке)
3. Сохраните файл
4. Запустите в терминале:

```bash
# Только генерация файлов
node scripts/blog-generator.mjs --topics topics.txt --json

# Публикация в базу сайта (требует .env с SUPABASE_SERVICE_ROLE_KEY)
node scripts/publish-posts.mjs --topics topics.txt
```

## Опции blog-generator.mjs

| Опция | Описание |
|-------|----------|
| `--topics <file>` | Файл со списком тем (обязательно) |
| `--output <dir>` | Папка для сохранения (по умолчанию: generated-posts) |
| `--outline` | Только план в markdown |
| `--json` | Включить JSON-файлы с метаданными |
| `--cta-url <url>` | Кастомный URL кнопки (по умолчанию: /lawyers) |

## Опции publish-posts.mjs

| Опция | Описание |
|-------|----------|
| `--topics <file>` | Файл со списком тем (обязательно) |
| `--dry-run` | Тестовый запуск без публикации в БД |

## Что входит в готовый пост

- HTML-разметка без CSS (совместима с вашим сайтом)
- CTA-блоки для реферального перехода:
  - `<div class="cta-box">` — кнопка "Опытные юристы подскажут"
  - `<div class="cta-box-gosuslugi">` — блок "Профессионалы своего дела"
- Таблицы сравнения способов
- FAQ schema (структурированные данные)
- SEO-теги в JSON

## Пример команд

```bash
# Сгенерировать 14 статей
node scripts/blog-generator.mjs --topics topics.txt --json

# Тестировать публикацию (без записи в БД)
node scripts/publish-posts.mjs --topics topics.txt --dry-run

# Опубликовать в базу
node scripts/publish-posts.mjs --topics topics.txt
```

## Формат topics.txt

```
Как подать иск в суд онлайн через ГАС Правосудие
Банкротство физических лиц: пошаговое руководство 2026
Новые государственные пошлины в 2026 году
```

Строки с `#` игнорируются.