# Telegram Bot Polling Server
# Запустите этот скрипт на вашем сервере (Windows)

# Проверка Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js не установлен. Установите Node.js с https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host "🤖 Запуск Telegram бота..." -ForegroundColor Cyan

# Запуск бота
node telegram-bot-server.js
