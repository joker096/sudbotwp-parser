<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4f9c3433-9310-49e4-b0fd-0a14882c4bb8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`




Итог: Гибридный подход к парсингу
Я реализовал fallback-стратегию парсинга, которая сначала пробует клиентский парсинг, а при неудаче переключается на серверный.

Что изменилось:
Создан клиентский парсер (src/lib/clientParser.ts)

Работает в браузере пользователя
Использует тот же cheerio для парсинга HTML
Обходит блокировку IP серверов (судовые сайты не блокируют клиентские запросы)
Обновлён parseCase

Сначала пробует парсинг на стороне клиента
При ошибке CORS или других проблемах — fallback на сервер
Улучшенные сообщения об ошибках
Обновлён refreshCase

Теперь использует ту же стратегию через parseCase
Стратегия работы:
1. Клиентский парсинг (через браузер пользователя)
   ↓ если CORS или ошибка
2. Серверный парсинг (Edge Function / localhost:3000)
   ↓ если ошибка
3. Показать пользователю инструкцию по ручному добавлению
Проблема клиентского парсинга:
Сайты судов не отдают CORS-заголовки, поэтому браузер блокирует доступ к их данным. Это означает, что клиентский парсинг скорее всего не сработает для большинства судов.

Рекомендации для production:
Вариант А: VPS с simple-server.js (рекомендуется)

Развернуть simple-server.js на VPS (например, Hetzner, Timeweb)
Указать URL сервера в VITE_PARSE_CASE_URL
Это самый надёжный вариант (использует Puppeteer)
Вариант Б: Проксирование через Cloudflare Workers

Создать воркер, который делает запросы к сайтам судов
Обходит блокировку IP благодаря ротации Cloudflare
Вариант В: Оставить Edge Function

Работает для судов, которые не блокируют облачные IP
Можно добавить retry-логику с разными User-Agent
Сборка проходит успешно (npx vite build). Текущий подход с fallback — оптимальный баланс между надёжностью и простотой развёртывания.