# Как получить SUPABASE_SERVICE_ROLE_KEY

## Способ 1: Через Supabase Dashboard

1. Открыть [https://supabase.com](https://supabase.com)
2. Выбрать свой проект (`qhiietjvfuekfaehddox`)
3. Перейти в **Settings** → **API**
4. В разделе **Project API keys** найти **service_role key**
5. Скопировать значение поля **service_role**

## Способ 2: Через CLI

```bash
npx supabase project ls
```

Или через Supabase CLI, если проект привязан.

## Что вставлять в service file

В файле `/etc/systemd/system/sud-parser.service` или `sudo-cases-parser.service` заменить:

```
Environment=SUPABASE_SERVICE_ROLE_KEY=тут-вставить-ключ
```
