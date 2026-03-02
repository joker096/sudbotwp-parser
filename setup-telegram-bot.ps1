# Скрипт настройки Telegram бота для Windows PowerShell

$botToken = "8062305676:AAGVlika2UYuScFPdHSBmlOFFtz2F-J7Cw8"
$webhookUrl = "https://qhiietjvfuekfaehddox.supabase.co/functions/v1/telegram-webhook"

Write-Host "=== Настройка Telegram бота ===" -ForegroundColor Green

# 1. Проверка текущего webhook
Write-Host "`n1. Проверка текущего webhook..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getWebhookInfo" -Method Get
    Write-Host "Текущий webhook: $($response.result.url)" -ForegroundColor Cyan
    Write-Host "Ожидает обновлений: $($response.result.pending_update_count)" -ForegroundColor Cyan
} catch {
    Write-Host "Ошибка: $_" -ForegroundColor Red
}

# 2. Установка webhook
Write-Host "`n2. Установка нового webhook..." -ForegroundColor Yellow
try {
    $body = @{ url = $webhookUrl } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setWebhook" -Method Post -ContentType "application/json" -Body $body
    if ($response.ok) {
        Write-Host "✅ Webhook успешно установлен!" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка: $($response.description)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
}

# 3. Проверка информации о боте
Write-Host "`n3. Проверка информации о боте..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getMe" -Method Get
    Write-Host "Имя бота: @$($response.result.username)" -ForegroundColor Cyan
    Write-Host "ID бота: $($response.result.id)" -ForegroundColor Cyan
} catch {
    Write-Host "Ошибка: $_" -ForegroundColor Red
}

Write-Host "`n=== Готово ===" -ForegroundColor Green
Write-Host "Бот: @ur_sud_bot" -ForegroundColor Cyan
Write-Host "Webhook: $webhookUrl" -ForegroundColor Cyan
Write-Host "`n⚠️  ВАЖНО: Не забудьте установить секрет SERVICE_ROLE_KEY в веб-интерфейсе Supabase!" -ForegroundColor Red
