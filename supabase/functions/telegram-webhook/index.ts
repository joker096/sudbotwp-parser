const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Интерфейс для профиля
interface Profile {
  id: string
  email: string
  notification_settings: any
  telegram_chat_id: string | null
}

export default async function handler(req: Request) {
  // Обработка CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('=== TELEGRAM WEBHOOK ===')
  console.log('Method:', req.method)
  
  try {
    // Парсим тело запроса от Telegram
    const update = await req.json()
    console.log('Telegram update:', JSON.stringify(update).substring(0, 200))

    // Проверяем, что это сообщение
    if (!update.message) {
      return new Response(JSON.stringify({ ok: true, no_message: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const message = update.message
    const chatId = message.chat.id.toString()
    const text = message.text || ''

    console.log(`Message from ${chatId}: ${text}`)

    // Получаем переменные окружения
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!telegramBotToken) {
      console.error('TELEGRAM_BOT_TOKEN not found in env')
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Простой ответ на /start
    if (text === '/start') {
      await sendTelegramMessage(telegramBotToken, chatId, 
        `👋 Добро пожаловать в @ur_sud_bot!

` +
        `Бот работает! Теперь вы можете подключить уведомления о ваших делах.

` +
        `Для этого введите: /connect ваш@email.ru`
      )
      return new Response(JSON.stringify({ ok: true, sent: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Обработка /help
    if (text === '/help') {
      await sendTelegramMessage(telegramBotToken, chatId,
        `📖 Команды:
/start - Начать
/connect email - Подключить
/disconnect - Отключить
/status - Статус
/help - Помощь`
      )
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true, echo: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Функция отправки сообщения в Telegram
async function sendTelegramMessage(token: string, chatId: string, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Telegram API error:', error)
    }
    
    return response.ok
  } catch (error) {
    console.error('Error sending telegram message:', error)
    return false
  }
}
