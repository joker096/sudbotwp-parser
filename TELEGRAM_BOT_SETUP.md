# 🚀 Настройка Telegram бота @ur_sud_bot

## ✅ Уже выполнено

1. **Webhook установлен** — бот @ur_sud_bot направлен на URL:
   ```
   https://qhiietjvfuekfaehddox.supabase.co/functions/v1/telegram-webhook
   ```

2. **Код функции обновлен** — исправлена проблема с названием секрета (теперь `SERVICE_ROLE_KEY` вместо `SUPABASE_SERVICE_ROLE_KEY`)

---

## 🔧 Что нужно сделать вручную

### 1. Установить Environment Secrets в Supabase

1. Откройте **Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/qhiietjvfuekfaehddox/settings/functions
   ```

2. Войдите в свой аккаунт Supabase

3. Перейдите в раздел **Edge Functions → Secrets**

4. Добавьте секреты:
   
   | Name | Value |
   |------|-------|
   | `TELEGRAM_BOT_TOKEN` | `8062305676:AAGVlika2UYuScFPdHSBmlOFFtz2F-J7Cw8` |
   | `SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaWlldGp2ZnVla2ZhZWhkZG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE0NjcxMCwiZXhwIjoyMDY1NzIyNzEwfQ.32QgnbqwNQHaJ3Mq5pAaHYQlZ1x2tTbNUEG5bvtuX8I` |

5. Нажмите **Save**

---

### 2. Передеплоить Edge Function

**Вариант А — через CLI (если заработает соединение):**
```powershell
supabase functions deploy telegram-webhook --project-ref qhiietjvfuekfaehddox
```

**Вариант Б — через веб-интерфейс:**
1. Откройте **Edge Functions → telegram-webhook**
2. Нажмите **Deploy** или **Redeploy**

**Вариант В — через GitHub Actions (если настроен CI/CD):**
Запушьте изменения в репозиторий

---

### 3. Выполнить SQL миграцию

Откройте **SQL Editor** в Supabase и выполните:

```sql
-- Add telegram_chat_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON public.profiles (telegram_chat_id);

-- Enable RLS on the new column
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow service role to update telegram_chat_id
CREATE POLICY IF NOT EXISTS "Service role can update telegram_chat_id"
ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (true);
```

---

### 4. Проверить работу бота

1. Откройте Telegram и найдите бота `@ur_sud_bot`

2. Отправьте команду `/start`

3. Если бот ответит — всё работает!

---

## 🐛 Возможные проблемы

### Ошибка "Service key not configured"
- Секрет `SERVICE_ROLE_KEY` не установлен — проверьте шаг 1

### Ошибка "Bot token not configured"
- Секрет `TELEGRAM_BOT_TOKEN` не установлен — проверьте шаг 1

### Бот не отвечает
- Проверьте логи функции: **Edge Functions → telegram-webhook → Logs**
- Проверьте webhook: выполните в PowerShell:
  ```powershell
  Invoke-RestMethod -Uri "https://api.telegram.org/bot8062305676:AAGVlika2UYuScFPdHSBmlOFFtz2F-J7Cw8/getWebhookInfo"
  ```

### Код 546 (Gateway Timeout)
- Функция падает по таймауту — проверьте логи, возможно проблема с подключением к Supabase API изнутри функции

---

## 📋 Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Начать работу с ботом |
| `/connect email@example.com` | Привязать Telegram к аккаунту |
| `/disconnect` | Отвязать Telegram от аккаунта |
| `/status` | Проверить статус уведомлений |
| `/help` | Справка |

---

## 🔗 Полезные ссылки

- **Supabase Dashboard**: https://supabase.com/dashboard/project/qhiietjvfuekfaehddox
- **Bot Father**: https://t.me/BotFather
- **Ваш бот**: https://t.me/ur_sud_bot
