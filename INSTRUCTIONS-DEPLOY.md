# Деплой sud.cvr.name

## Быстрый деплой (sitemap)

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
| `-User` | `root` |
| `-ServerPath` | `/var/www/sud.cvr.name` |

Пример:

```powershell
.\deploy.ps1 -Server myserver.com -User admin
```

## Что делает скрипт

1. **Build** — запускает `npm run build` (vite + generate-sitemap)
2. **Upload** — scp `dist/sitemap.xml` на сервер
3. **Verify** — проверяет что sitemap.xml отдаётся (HTTP 200)

## На сервере

Файл должен быть в: `/var/www/sud.cvr.name/dist/sitemap.xml`

Убедись, что nginx не делает редирект на Supabase:

```bash
grep -rn 'qhiietjvfuekfaehddox' /etc/nginx/conf.d/
```

Если пусто — всё ок.
