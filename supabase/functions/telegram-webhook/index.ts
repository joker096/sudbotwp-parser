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

  // ========== ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ ==========
  console.log('=== TELEGRAM WEBHOOK DEBUG ===')
  console.log('Method:', req.method)
  console.log('All headers:', Object.fromEntries(req.headers.entries()))
  
  // Получаем apikey из заголовков (Supabase передаёт его автоматически)
  const apikey = req.headers.get('apikey') || ''
  console.log('Apikey present:', !!apikey)
  // ==========================================================

  try {
    // Получаем переменные окружения
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://qhiietjvfuekfaehddox.supabase.co'
    // Используем SERVICE_ROLE_KEY без префикса SUPABASE_
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

    // Проверяем наличие обязательных переменных
    if (!telegramBotToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!supabaseServiceKey) {
      console.error('SERVICE_ROLE_KEY not configured')
      return new Response(JSON.stringify({ error: 'Service key not configured. Set SERVICE_ROLE_KEY secret.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Парсим тело запроса от Telegram
    const update = await req.json()

    console.log('Telegram update received:', JSON.stringify(update))

    // Проверяем, что это сообщение
    if (!update.message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const message = update.message
    const chatId = message.chat.id.toString()
    const text = message.text || ''

    console.log(`Message from ${chatId}: ${text}`)

    // Функция для выполнения запросов к Supabase
    async function supabaseFetch(endpoint: string, options: any = {}) {
      const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': options.prefer || 'return=representation',
          ...options.headers
        }
      })
      return response
    }

    // Обработка команды /start
    if (text === '/start') {
      // Проверяем, есть ли уже привязанный пользователь
      const profileRes = await supabaseFetch(
        `profiles?select=id,email,notification_settings,telegram_chat_id&telegram_chat_id=eq.${chatId}&limit=1`
      )
      const existingProfiles: Profile[] = await profileRes.json()

      if (existingProfiles && existingProfiles.length > 0) {
        const existingProfile = existingProfiles[0]
        // Пользователь уже привязан
        await sendTelegramMessage(telegramBotToken, chatId, 
          `✅ Вы уже подключены к боту!\n\n` +
          `Ваш email: ${existingProfile.email}\n\n` +
          `Для отключения используйте /disconnect`
        )
      } else {
        // Отправляем приветственное сообщение с инструкцией
        await sendTelegramMessage(telegramBotToken, chatId, 
          `👋 Добро пожаловать в @ur_sud_bot!

` +
          `Для подключения уведомлений о ваших делах:

` +
          `1. Введите ваш email в формате:\n` +
          `/connect ваш@email.ru\n\n` +
          `Например: /connect user@example.com\n\n` +
          `После этого вы будете получать уведомления о заседаниях и результатах дел в Telegram.`
        )
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Обработка команды /connect с email
    if (text === '/connect' || text.startsWith('/connect ')) {
      const email = text === '/connect' ? '' : text.substring(9).trim().toLowerCase()

      // Валидация email
      if (!email || !email.includes('@')) {
        await sendTelegramMessage(telegramBotToken, chatId,
          `❌ Неверный формат email.\n\n` +
          `Используйте: /connect ваш@email.ru\n` +
          `Например: /connect user@example.com`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Ищем пользователя по email
      const profileRes = await supabaseFetch(
        `profiles?select=id,email,notification_settings,telegram_chat_id&email=eq.${encodeURIComponent(email)}&limit=1`
      )
      const profiles: Profile[] = await profileRes.json()

      if (!profiles || profiles.length === 0) {
        await sendTelegramMessage(telegramBotToken, chatId,
          `❌ Пользователь с email ${email} не найден.\n\n` +
          `Пожалуйста, зарегистрируйтесь на сайте sudbotwp.ru`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const profile = profiles[0]

      // Проверяем, не привязан ли уже этот email к другому Telegram аккаунту
      if (profile.telegram_chat_id && profile.telegram_chat_id !== chatId) {
        await sendTelegramMessage(telegramBotToken, chatId,
          `❌ Этот email уже привязан к другому Telegram аккаунту.\n\n` +
          `Свяжитесь с поддержкой для решения проблемы.`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Обновляем профиль - привязываем Telegram chat_id
      const currentSettings = profile.notification_settings || {}
      const newSettings = {
        ...currentSettings,
        telegramChatId: chatId,
        telegramBot: true
      }

      const updateRes = await supabaseFetch(
        `profiles?id=eq.${profile.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ 
            telegram_chat_id: chatId,
            notification_settings: newSettings
          })
        }
      )

      if (!updateRes.ok) {
        const errorText = await updateRes.text()
        console.error('Error updating profile:', errorText)
        await sendTelegramMessage(telegramBotToken, chatId,
          `❌ Произошла ошибка при подключении.\n\n` +
          `Пожалуйста, попробуйте позже.`
        )
      } else {
        await sendTelegramMessage(telegramBotToken, chatId,
          `✅ Успешно подключено!\n\n` +
          `Email: ${email}\n\n` +
          `Теперь вы будете получать уведомления о:\n` +
          `• Заседаниях по вашим делам\n` +
          `• Сроках обжалования\n` +
          `• Результатах рассмотрения\n\n` +
          `Управлять настройками можно на сайте в разделе "Профиль".\n\n` +
          `Для отключения используйте /disconnect`
        )
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Обработка команды /disconnect
    if (text === '/disconnect') {
      // Ищем профиль по chat_id
      const profileRes = await supabaseFetch(
        `profiles?select=id,notification_settings&telegram_chat_id=eq.${chatId}&limit=1`
      )
      const profiles: Profile[] = await profileRes.json()

      if (!profiles || profiles.length === 0) {
        await sendTelegramMessage(telegramBotToken, chatId,
          `❌ Ваш Telegram не привязан к аккаунту.`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const profile = profiles[0]

      // Отключаем Telegram
      const currentSettings = profile.notification_settings || {}
      const newSettings = {
        ...currentSettings,
        telegramBot: false,
        telegramChatId: ''
      }

      await supabaseFetch(
        `profiles?id=eq.${profile.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ 
            telegram_chat_id: null,
            notification_settings: newSettings
          })
        }
      )

      await sendTelegramMessage(telegramBotToken, chatId,
        `✅ Telegram отключен от вашего аккаунта.\n\n` +
        `Вы больше не будете получать уведомления в Telegram.\n\n` +
        `Для повторного подключения используйте /start`
      )

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Обработка команды /status
    if (text === '/status') {
      const profileRes = await supabaseFetch(
        `profiles?select=email,notification_settings&telegram_chat_id=eq.${chatId}&limit=1`
      )
      const profiles: Profile[] = await profileRes.json()

      if (!profiles || profiles.length === 0) {
        await sendTelegramMessage(telegramBotToken, chatId,
          `ℹ️ Ваш Telegram не привязан к аккаунту.\n\n` +
          `Используйте /start для подключения.`
        )
      } else {
        const profile = profiles[0]
        const settings = profile.notification_settings || {}
        const status = settings.telegramBot ? '✅ Включены' : '❌ Выключены'
        
        await sendTelegramMessage(telegramBotToken, chatId,
          `📋 Статус уведомлений:\n\n` +
          `Email: ${profile.email}\n` +
          `Telegram: ${status}\n` +
          `Уведомлять за: ${settings.notifyBeforeHours || 24} час.\n\n` +
          `Изменить настройки можно на сайте в разделе "Профиль".`
        )
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Обработка команды /help
    if (text === '/help') {
      await sendTelegramMessage(telegramBotToken, chatId,
        `📖 Справка по боту ur_sud_bot:\n\n` +
        `/start - Начать работу с ботом\n` +
        `/connect email - Подключить аккаунт\n` +
        `/disconnect - Отключить Telegram\n` +
        `/status - Проверить статус\n` +
        `/help - Показать эту справку`
      )

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Неизвестная команда
    await sendTelegramMessage(telegramBotToken, chatId,
      `Я не понимаю эту команду.\n\n` +
      `Используйте /help для списка доступных команд.`
    )

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Telegram webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
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
