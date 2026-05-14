# Деплой скрипта парсинга на VDS

## Что создано

| Файл | Назначение |
|------|------------|
| `parse-all-cases.js` | Основной скрипт парсинга всех дел пользователей |
| `cron-parse-cases.sh` | Обёртка для crontab |
| `sudo-cases-parser.service` | systemd service (назовём sud-parser.service) |
| `sud-parser.timer` | systemd timer (запуск каждый день в 3:00) |
| `package.json` | Обновлён с новым скриптом и зависимостью iconv-lite |

## На VDS

### 1. Скопировать файлы на сервер

```bash
# На локальном компьютере:
scp parse-all-cases.js cron-parse-cases.sh sudo-cases-parser.service sud-parser.timer user@your-vds:/tmp/

# На VDS:
sudo mv /tmp/parse-all-cases.js /opt/sud-app/
sudo mv /tmp/cron-parse-cases.sh /opt/sud-app/
```

### 2. Установить зависимости

```bash
cd /opt/sud-app
npm install iconv-lite
```

### 3. Вариант A: crontab (простой)

```bash
# Открыть crontab
crontab -e

# Добавить строку (каждый день в 3:00):
0 3 * * * cd /opt/sud-app && SUPABASE_SERVICE_ROLE_KEY=your-key node parse-all-cases.sh
```

### 4. Вариант B: systemd (надёжнее)

```bash
# Скопировать service файл (заменить путь на свой)
sudo cp sudo-cases-parser.service /etc/systemd/system/sud-parser.service
sudo cp sud-parser.timer /etc/systemd/system/

# Заменить <YOUR_SERVICE_ROLE_KEY> на реальный ключ Supabase
sudo sed -i 's/<YOUR_SERVICE_ROLE_KEY>/your-actual-key/g' /etc/systemd/system/sud-parser.service

# Активировать
sudo systemctl daemon-reload
sudo systemctl enable sud-parser.timer
sudo systemctl start sud-parser.timer

# Проверить:
systemctl list-timers --all | grep sud-parser
```

### 5. Проверить вручную

```bash
cd /opt/sud-app
SUPABASE_SERVICE_ROLE_KEY=your-key node parse-all-cases.js
```

### 6. Лог парсинга

Лог парсинга сохраняется в `parse-log.txt`.

### 7. Лог systemd

```bash
journalctl -u sud-parser.service -f
```
