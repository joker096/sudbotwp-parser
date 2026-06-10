# Деплой sud.cvr.name

## Быстрый деплой (sitemap)

# Настрой и запусти:
$env:VDS_HOST = "130.49.175.224"
$env:VDS_USER = "user0"
.\deploy.ps1

```powershell
.\deploy.ps1
```

Один скрипт: собирает sitemap.xml + загружает на сервер + проверяет.

### Флаги

| Флаг | Описание |
|------|----------|
| `-BuildOnly` | Только собрать, без загрузки |
| `-UploadOnly` | Только загрузить, без сборки |

### Параметры

| Параметр | Значение по умолчанию |
|----------|------------------------|
| `-Server` | `130.49.175.224` |
| `-User` | `user0` |
| `-ServerPath` | `/var/www/sud.cvr.name` |

Пример:

```powershell
.\deploy.ps1 -Server myserver.com -User admin
```

## Что делает скрипт

1. **Build** — запускает `npm run build` (vite + generate-sitemap)
2. **Upload** — scp `dist/` на сервер
3. **Verify** — проверяет что sitemap.xml отдаётся (HTTP 200)

## На сервере

Файл должен быть в: `/var/www/sud.cvr.name/sitemap.xml`

Убедись, что nginx не делает редирект на Supabase:

```bash
grep -rn 'qhiietjvfuekfaehddox' /etc/nginx/conf.d/
```

Если пусто — всё ок.
