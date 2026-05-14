# Логика парсинга судебных дел

## Общая архитектура

Система парсинга дел с сайтов sudrf.ru работает по схеме: **браузер пользователя → VDS cronjob**.

### Поток данных

```
Пользователь открывает страницу дела
        ↓
Браузер пользователя запрашивает sudrf.ru (CORS bypass за счёт того что запрос с того же домена)
        ↓
Страница парсится через clientParser.ts (через React компонент)
        ↓
Данные сохраняются в Supabase (таблица cases)
        ↓
Cronjob на VDS (systemd timer каждую ночь в 3:00)
        ↓
parse-all-cases.js на VDS перебирает все дела старше 24ч
        ↓
Для каждого дела — запрос на sudrf.ru напрямую с VDS (с iconv-lite для win-1251 → utf8)
        ↓
Обновлённые данные сохраняются в Supabase
```

## Два режима парсинга

### 1. Клиентский парсинг (браузер)

**Файл:** `src/lib/clientParser.ts`

Используется когда пользователь добавляет дело вручную или открывает страницу.

```typescript
// 1. Запрос с браузера (CORS не блокирует т.к. sudrf.ru разрешает свой origin)
const response = await fetch(url);  // fetch из браузера

// 2. Декодирование windows-1251 → utf-8
const decoder = new TextDecoder('windows-1251');
const html = decoder.decode(buffer);

// 3. Cheerio парсинг HTML
const $ = cheerio.load(html);

// 4. Извлечение данных из таблиц:
//    - .casenumber → номер дела
//    - #cont1 table → дата поступления, категория, судья, статус
//    - #cont3 table → истец, ответчик
//    - #cont2 table → события (дата, время, название, результат)
//    - #cont4 table → апелляции
```

**Fallback:** если клиентский парсинг не сработал — показывает ошибку и предлагает ввести данные вручную.

### 2. Серверный парсинг (VDS)

**Файл:** `scripts/parse-all-cases.js` (на VDS)

```javascript
// 1. Запрос с VDS (node-fetch или native fetch)
// 2. iconv-lite для декодирования windows-1251
const iconv = require('iconv-lite');
const html = iconv.decode(buffer, 'win1251');

// 3. Cheerio парсинг (аналогично клиентскому)
// 4. Обновление записи в Supabase
supabase.from('cases').update(parsedData).eq('id', caseId);
```

## Как добавить новое дело

```typescript
// В компоненте добавления дела (Profile.tsx):
const parsed = await parseCaseClient(urlFromUser);
await supabase.from('cases').insert({ ...parsed, user_id: currentUserId });
```

## Cronjob на VDS

```bash
# systemd timer: /etc/systemd/system/sud-parser.timer
[Timer]
OnCalendar=*-*-* 03:00:00

# systemd service: /etc/systemd/system/sud-parser.service
ExecStart=/usr/bin/node /opt/sud-app/parse-all-cases.js
Environment=SUPABASE_SERVICE_ROLE_KEY=xxx
```

## Файлы парсинга

| Файл | Где | Назначение |
|------|-----|------------|
| `src/lib/clientParser.ts` | Локально + в браузере | Клиентский парсинг дел |
| `src/lib/browserlessParser.ts` | Локально + в браузере | Fallback цепочка (прямой fetch → ScrapingBee → server) |
| `src/lib/supabase.ts` | Локально + в браузере | `parseCaseServer()` — серверный парсинг |
| `scripts/parse-all-cases.js` | **Только на VDS** | Cronjob — массовое обновление всех дел |

## Переменные окружения

**Локально (.env):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_YANDEXMAP_API_KEY`

**На VDS:**
- `SUPABASE_SERVICE_ROLE_KEY` — для parse-all-cases.js

## Обработка ошибок

- **CORS блок** → клиентский парсинг невозможен, пользователь вводит данные вручную
- **Сайт не отвечает** → пропускаем дело, не обновляем
- **Парсинг не нашёл данных** → сохраняем пустые значения, не удаляем запись
- **Supabase недоступен** → логируем ошибку, останавливаем скрипт