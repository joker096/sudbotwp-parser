# Варианты парсинга судебных дел

## ⚠️ ВНИМАНИЕ: Настройка парсинга

**Текущая проблема:** Парсинг судебных дел не работает, потому что:
1. Сайты судов (sudrf.ru) блокируют запросы из браузера (CORS)
2. Серверные запросы также могут блокироваться
3. Сервисы Browserless.io и ScrapingBee не настроены

### Как настроить:

1. **Получите токен Browserless.io** (рекомендуется):
   - Зарегистрируйтесь на https://browserless.io
   - Скопируйте ваш токен из Dashboard
   - Добавьте в `.env` файл: `VITE_BROWSERLESS_TOKEN=ваш_токен`

2. **ИЛИ получите ключ ScrapingBee:**
   - Зарегистрируйтесь на https://scrapingbee.com
   - Скопируйте API ключ
   - Добавьте в `.env` файл: `VITE_SCRAPINGBEE_API_KEY=ваш_ключ`

3. **Перезапустите приложение** для применения изменений

---

## Текущая реализация (гибридный fallback)

```
1. Клиентский парсинг (браузер пользователя)
   ↓ если CORS/ошибка
2. Серверный парсинг (Edge Function / localhost)
   ↓ если ошибка
3. Ручное добавление дела
```

---

## Дополнительные варианты (из статьи и практики)

### Вариант 1: API ГАС "Правосудие" (официальный)
**Плюсы:**
- Легальный доступ к данным
- Стабильное API
- Нет проблем с блокировками

**Минусы:**
- Нужен договор с Федеральной судебной инстанцией
- Платно (от ~100к руб/мес)
- Бюрократия при подключении

**Подходит для:** Крупных юридических компаний, интеграторов

---

### Вариант 2: Облачные браузеры (Puppeteer-as-a-Service)

#### 2.1. Browserless.io
```javascript
const response = await fetch('https://chrome.browserless.io/content?token=YOUR_TOKEN', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://vsevgorsud--lo.sudrf.ru/...',
    gotoOptions: { waitUntil: 'networkidle0' }
  })
});
const html = await response.text();
```

**Плюсы:**
- Не нужно поддерживать инфраструктуру
- Работают с headless Chrome
- Ротация IP

**Минусы:**
- Платно (~$50-200/мес)
- Зависимость от внешнего сервиса

**Подходит для:** Быстрого запуска без DevOps

#### 2.2. ScrapingBee / ScrapingAnt
```javascript
const response = await fetch(
  `https://app.scrapingbee.com/api/v1/?api_key=YOUR_KEY&url=${encodeURIComponent(courtUrl)}`
);
```

**Плюсы:**
- Простая интеграция
- Прокси-ротация включена
- Рендеринг JavaScript

**Минусы:**
- Платно (~$20-100/мес)
- Ограничения на количество запросов

---

### Вариант 3: Прокси-ротация (своя инфраструктура)

```javascript
// proxy-rotator.js
const PROXY_LIST = [
  'http://user:pass@proxy1:8080',
  'http://user:pass@proxy2:8080',
  // ...
];

let proxyIndex = 0;

export function getNextProxy() {
  const proxy = PROXY_LIST[proxyIndex];
  proxyIndex = (proxyIndex + 1) % PROXY_LIST.length;
  return proxy;
}

// В парсере
const proxy = getNextProxy();
const browser = await puppeteer.launch({
  args: [`--proxy-server=${proxy}`]
});
```

**Плюсы:**
- Полный контроль
- Можно использовать резидентные прокси

**Минусы:**
- Нужно покупать прокси (~$50-500/мес)
- Сложность поддержки

**Подходит для:** Высоких нагрузок, когда нужно много парсить

---

### Вариант 4: Tor/Onion routing

```javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch({
  args: [
    '--proxy-server=socks5://127.0.0.1:9050',
    '--no-sandbox'
  ]
});
```

**Плюсы:**
- Бесплатно
- Меняет IP каждые 10 минут

**Минусы:**
- Медленно
- Нестабильно
- Сайты могут блокировать выходные ноды Tor

**Подходит для:** Тестирования, не для production

---

### Вариант 5: Распределённый парсинг (P2P)

Каждый клиент парсит "свои" дела и делится результатом через общую БД.

```typescript
// Псевдокод
async function parseDistributed(url: string) {
  // 1. Проверяем, не парсил ли кто-то недавно
  const cached = await db.getRecentParse(url);
  if (cached && cached.age < '1 hour') {
    return cached.data;
  }
  
  // 2. Пробуем клиентский парсинг
  try {
    const data = await parseClient(url);
    await db.saveParse(url, data);
    return data;
  } catch (e) {
    // 3. Ставим в очередь на серверный парсинг
    await db.queueForServerParse(url);
    return { status: 'queued', message: 'Дело будет обработано в течение 5 минут' };
  }
}
```

**Плюсы:**
- Распределяет нагрузку
- Можно парсить "со всех IP пользователей"

**Минусы:**
- Сложная архитектура
- Не мгновенный результат

---

## Рекомендуемая стратегия для вашего проекта

### Phase 1 (сейчас): Гибридный fallback
- Клиентский парсинг → Серверный (Edge Function) → Ручное добавление
- Быстро, дёшево, работает для 30-50% случаев

### Phase 2 (когда нужна надёжность): Browserless + Edge Function
```typescript
// Приоритеты:
1. Клиентский парсинг (бесплатно)
2. Browserless.io (по необходимости, $0.005/запрос)
3. Edge Function (бесплатно, но ограничено)
4. Ручное добавление
```

### Phase 3 (когда масштабирование): Своя инфраструктура
- VPS с Puppeteer
- Ротация прокси
- Очередь задач (Redis/Bull)

---

## Сравнение по стоимости (примерно)

| Вариант | Стоимость/мес | Надёжность | Скорость |
|---------|---------------|------------|----------|
| Edge Function (Supabase) | $0 (лимит) | 30% | Средняя |
| Browserless.io | $50-100 | 95% | Быстрая |
| ScrapingBee | $50-200 | 90% | Быстрая |
| Свой VPS + прокси | $30-100 | 85% | Средняя |
| API ГАС Правосудие | $1000+ | 99% | Мгновенно |
| Tor | $0 | 40% | Медленно |

---

## Реализация Browserless fallback

```typescript
// src/lib/browserless.ts
const BROWSERLESS_TOKEN = import.meta.env.VITE_BROWSERLESS_TOKEN;

export async function parseWithBrowserless(url: string) {
  const response = await fetch(`https://chrome.browserless.io/content?token=${BROWSERLESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      gotoOptions: { waitUntil: 'networkidle2', timeout: 60000 },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Browserless error: ${response.status}`);
  }
  
  const html = await response.text();
  return parseCaseHtml(html, url); // ваша существующая функция
}
```

Добавить в цепочку:
```typescript
// 1. Клиентский
// 2. Browserless (если настроен)
// 3. Edge Function
// 4. Ручное
```
