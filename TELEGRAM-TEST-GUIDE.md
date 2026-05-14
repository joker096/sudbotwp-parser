# Инструкция по проверке Telegram-уведомлений

## 1. Проверка токена бота
Убедитесь, что в Supabase Secrets установлен `TELEGRAM_BOT_TOKEN` (должен совпадать с токеном бота @cvrname_bot).

### Как проверить:
- Через CLI: `supabase secrets list`
- Через Dashboard: **Project Settings → Secrets**

Токен должен быть: `8062305676:AAGVlika2UYuScFPdHSBmlOFFtz2F-J7Cw8`

---

## 2. Проверка webhook бота
Webhook должен быть настроен на Supabase Function.

### Проверка:
Отправьте GET-запрос в браузере или через curl:
```
https://api.telegram.org/bot<ВАШ_ТОКЕН>/getWebhookInfo
```

### Ожидаемый результат:
Поле `url` должно содержать:
```
https://<project-ref>.supabase.co/functions/v1/telegram-bot-webhook
```

Если webhook не настроен, выполните:
```
https://api.telegram.org/bot<ВАШ_ТОКЕН>/setWebhook?url=https://<project-ref>.supabase.co/functions/v1/telegram-bot-webhook
```

---

## 3. Проверка настроек пользователя

### В интерфейсе:
1. Перейдите в **Профиль → Уведомления**
2. Включите переключатель **"Telegram бот"**
3. Получите Chat ID:
   - Откройте бота @cvrname_bot в Telegram
   - Отправьте команду `/start`
   - Скопируйте присланный Chat ID и вставьте в поле настроек
4. Сохраните настройки

### В базе данных:
Проверьте, что поле `notify_telegram` или `telegram_chat_id` заполнено в таблице `profiles`:
```sql
SELECT id, telegram_chat_id, notify_telegram FROM profiles WHERE id = '<user_id>';
```

---

## 4. Тестовое уведомление

### Через Supabase Dashboard:
1. Перейдите в **Dashboard → Functions**
2. Выберите функцию `admin-test-lead-notification`
3. Нажмите **Test**
4. Отправьте JSON:
```json
{
  "userId": "<ваш_user_id>"
}
```

### Ожидаемый результат:
В Telegram должно прийти сообщение:
```
🧪 Тестовое уведомление

Это тест от администратора. Убедитесь, что уведомления работают.
```

---

## 5. Проверка логов функций

Если уведомления не приходят, проверьте логи:

1. **Dashboard → Functions**
2. Выберите функции:
   - `send-lead-notification`
   - `telegram-bot-webhook`
   - `admin-test-lead-notification`
3. Откройте вкладку **Logs**

### Типичные ошибки:
- `TELEGRAM_BOT_TOKEN not found` — токен не установлен в Secrets
- `chat not found` — неверный Chat ID
- `Unauthorized` — неверный токен бота

---

## 6. Проверка работы бота

В Telegram:
1. Найдите бота @cvrname_bot
2. Отправьте команду `/start`

### Ожидаемый результат:
Бот должен ответить приветственным сообщением.

---

## Быстрый чек-лист:
- [ ] `TELEGRAM_BOT_TOKEN` установлен в Supabase Secrets
- [ ] Webhook настроен на правильный URL
- [ ] В профиле включен Telegram бот
- [ ] Chat ID сохранен в настройках
- [ ] Тестовое уведомление пришло в Telegram
- [ ] Логи функций не содержат ошибок

Если все пункты выполнены — уведомления настроены верно.
