# Design Spec: Производительность и UX — Кэширование, Экспорт, PWA

> **Дата:** 2026-05-18
> **Проект:** sud.cvr.name (Casebook alternative)
> **Статус:** Ожидает одобрения

---

## Обзор

Улучшение производительности и пользовательского опыта: кэширование результатов проверки контрагентов, экспорт данных в Excel/CSV, PWA-улучшения (offline, install prompt).

---

## Модули

### Модуль 1: Кэширование проверок контрагентов

**Проблема:** Каждая проверка контрагента ходит в 4-5 внешних API. Это медленно и расходует лимиты API.

**Решение:**
1. **Таблица кэша:**
   ```sql
   CREATE TABLE counterparty_checks (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     inn text NOT NULL UNIQUE,
     egrul_data jsonb,
     fssp_data jsonb,
     efrsb_data jsonb,
     rosstat_data jsonb,
     risk_score jsonb,
     checked_at timestamptz DEFAULT now(),
     expires_at timestamptz DEFAULT (now() + interval '24 hours')
   );
   ```

2. **Логика:**
   - При проверке: сначала ищем в `counterparty_checks` по ИНН
   - Если запись есть и `expires_at > now()` — возвращаем кэш
   - Если нет или протухло — запрашиваем API, сохраняем результат, возвращаем
   - Кнопка "Обновить данные" — принудительный сброс кэша и повторный запрос

3. **TTL:** 24 часа (баланс свежести vs производительности)

4. **Очистка:** Cron или триггер — удалять записи старше 7 дней

**Файлы:**
- `supabase/migrations/20260518_counterparty_cache.sql` — таблица
- `src/lib/counterparty.ts` — добавить `getCachedCheck`, `saveCheckCache`
- `src/components/CounterpartyDashboard.tsx` — кнопка "Обновить"

**Edge Functions:** Без изменений (кэш на уровне frontend API layer)

---

### Модуль 2: Экспорт Excel/CSV

**Функционал:**
1. Кнопка "Скачать Excel" на дашборде контрагента (рядом с "Скачать отчёт")
2. Формат: .xlsx (SheetJS) или .csv (PapaParse)
3. Содержимое:
   - Лист "ЕГРЮЛ" — все поля выписки
   - Лист "ФССП" — список исполнительных производств
   - Лист "ЕФРСБ" — дела о банкротстве
   - Лист "Росстат" — бухгалтерские показатели по годам
   - Лист "Риск" — оценка риска с факторами

**Библиотека:** `xlsx` (npm install xlsx) — лёгкая, работает в браузере

**Файлы:**
- `src/lib/export.ts` — функции генерации Excel/CSV
- `src/components/ExportButton.tsx` — кнопка + логика
- Интеграция в `CounterpartyDashboard.tsx`

**Тесты:**
- Unit: проверка структуры сгенерированного Excel

---

### Модуль 3: PWA улучшения

**3.1 Install Prompt**
- Отслеживать событие `beforeinstallprompt`
- Показывать кнопку "Установить приложение" (скрывается если уже установлено)
- Сохранить в `localStorage` флаг `pwa-installed`

**3.2 Offline Fallback**
- Кастомная страница "Нет соединения" при offline
- Проверка `navigator.onLine`
- Кэширование последних проверенных компаний (IndexedDB или localStorage)

**3.3 Background Sync**
- При offline-проверке — сохранить запрос в очередь
- Когда связь восстанавливается — автоматически выполнить проверку и показать уведомление

**Файлы:**
- `src/components/InstallPWA.tsx` — кнопка установки
- `src/components/OfflineBanner.tsx` — баннер offline
- `src/hooks/useOnline.ts` — хук для статуса сети
- `src/sw.ts` — обновить (background sync)

---

## Архитектура

### Таблицы (SQL)

| Таблица | Назначение |
|---|---|
| `counterparty_checks` | Кэш результатов проверки |
| `push_subscriptions` | Уже создана (модуль 2) |

### Новые файлы

| Файл | Описание |
|---|---|
| `src/lib/export.ts` | Генерация Excel/CSV |
| `src/components/ExportButton.tsx` | Кнопка экспорта |
| `src/components/InstallPWA.tsx` | Кнопка установки PWA |
| `src/components/OfflineBanner.tsx` | Баннер offline |
| `src/hooks/useOnline.ts` | Хук статуса сети |

### Изменённые файлы

| Файл | Изменения |
|---|---|
| `src/lib/counterparty.ts` | + кэш логика |
| `src/components/CounterpartyDashboard.tsx` | + кнопки "Обновить", "Скачать Excel" |
| `src/sw.ts` | + background sync |

---

## Порядок реализации

1. **Кэширование** — фундамент, ускоряет всё остальное
2. **Экспорт** — быстрая победа, использует кэш
3. **PWA** — улучшение UX, менее критично

---

## Тесты

| Модуль | Unit | Component | E2E |
|---|---|---|---|
| Кэширование | getCachedCheck, saveCheckCache | Кнопка "Обновить" | — |
| Экспорт | Генерация Excel | Кнопка экспорта | — |
| PWA | useOnline хук | InstallPWA, OfflineBanner | — |

---

## Следующий шаг

После одобрения spec → invoke writing-plans.

---

*Spec создан: 2026-05-18*
