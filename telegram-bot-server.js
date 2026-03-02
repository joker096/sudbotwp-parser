import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const SUPABASE_URL = 'https://qhiietjvfuekfaehddox.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaWlldGp2ZnVla2ZhZWhkZG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE0NjcxMCwiZXhwIjoyMDY1NzIyNzEwfQ.32QgnbqwNQHaJ3Mq5pAaHYQlZ1x2tTbNUEG5bvtuX8I';

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8062305676:AAGVlika2UYuScFPdHSBmlOFFtz2F-J7Cw8';

// Create Supabase client
const supabase = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

console.log('🤖 Telegram Bot Server Starting...');
console.log('Supabase:', supabase ? '✅ Connected' : '❌ Not connected');
console.log('Bot Token:', TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not set');

// Функция с повторными попытками
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

// Функция отправки сообщения в Telegram
async function sendTelegramMessage(chatId, text) {
  try {
    const response = await retryWithBackoff(() =>
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      })
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending telegram message:', error);
    return false;
  }
}

// Функция для выполнения запросов к Supabase
async function supabaseFetch(endpoint, options = {}) {
  return retryWithBackoff(() =>
    fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': options.prefer || 'return=representation',
        ...options.headers
      }
    })
  );
}

// Обработка команды /start
async function handleStart(chatId) {
  console.log(`Processing /start for chat ${chatId}`);

  try {
    const profileRes = await supabaseFetch(
      `profiles?select=id,email,notification_settings,telegram_chat_id&telegram_chat_id=eq.${chatId}&limit=1`
    );

    if (!profileRes.ok) {
      throw new Error(`Supabase API error: ${profileRes.status}`);
    }

    const existingProfiles = await profileRes.json();

    if (existingProfiles && existingProfiles.length > 0) {
      const existingProfile = existingProfiles[0];
      await sendTelegramMessage(chatId,
        `✅ Вы уже подключены к боту!\n\n` +
        `Ваш email: ${existingProfile.email}\n\n` +
        `Для отключения используйте /disconnect`
      );
    } else {
      await sendTelegramMessage(chatId,
        `👋 Добро пожаловать в @ur_sud_bot!\n\n` +
        `Для подключения уведомлений о ваших делах:\n\n` +
        `1. Введите ваш email в формате:\n` +
        `/connect ваш@email.ru\n\n` +
        `Например: /connect user@example.com\n\n` +
        `После этого вы будете получать уведомления о заседаниях и результатах дел в Telegram.`
      );
    }
  } catch (error) {
    console.error('Error handling /start:', error);
    await sendTelegramMessage(chatId, '❌ Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

// Обработка команды /connect с email
async function handleConnect(chatId, text) {
  const email = text.substring(9).trim().toLowerCase();
  console.log(`Processing /connect for chat ${chatId} with email ${email}`);

  try {
    // Валидация email
    if (!email || !email.includes('@')) {
      await sendTelegramMessage(chatId,
        `❌ Неверный формат email.\n\n` +
        `Используйте: /connect ваш@email.ru`
      );
      return;
    }

    const profileRes = await supabaseFetch(
      `profiles?select=id,email,notification_settings,telegram_chat_id&email=eq.${encodeURIComponent(email)}&limit=1`
    );

    if (!profileRes.ok) {
      throw new Error(`Supabase API error: ${profileRes.status}`);
    }

    const profiles = await profileRes.json();

    if (!profiles || profiles.length === 0) {
      await sendTelegramMessage(chatId,
        `❌ Пользователь с email ${email} не найден.\n\n` +
        `Пожалуйста, зарегистрируйтесь на сайте sudbotwp.ru`
      );
      return;
    }

    const profile = profiles[0];

    if (!profile) {
      await sendTelegramMessage(chatId,
        `❌ Произошла ошибка при получении профиля.\n\n` +
        `Пожалуйста, попробуйте позже.`
      );
      return;
    }

    if (profile.telegram_chat_id && profile.telegram_chat_id.toString() !== chatId.toString()) {
      await sendTelegramMessage(chatId,
        `❌ Этот email уже привязан к другому Telegram аккаунту.\n\n` +
        `Свяжитесь с поддержкой для решения проблемы.`
      );
      return;
    }

    const currentSettings = profile.notification_settings || {};
    const newSettings = {
      ...currentSettings,
      telegramChatId: chatId,
      telegramBot: true
    };

    const updateRes = await supabaseFetch(
      `profiles?id=eq.${profile.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          telegram_chat_id: chatId,
          notification_settings: newSettings
        })
      }
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error('Error updating profile:', errorText);
      await sendTelegramMessage(chatId,
        `❌ Произошла ошибка при подключении.\n\n` +
        `Пожалуйста, попробуйте позже.`
      );
    } else {
      await sendTelegramMessage(chatId,
        `✅ Успешно подключено!\n\n` +
        `Email: ${email}\n\n` +
        `Теперь вы будете получать уведомления о:\n` +
        `• Заседаниях по вашим делам\n` +
        `• Сроках обжалования\n` +
        `• Результатах рассмотрения\n\n` +
        `Управлять настройками можно на сайте в разделе "Профиль".\n\n` +
        `Для отключения используйте /disconnect`
      );
    }
  } catch (error) {
    console.error('Error handling /connect:', error);
    await sendTelegramMessage(chatId, '❌ Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

// Обработка команды /disconnect
async function handleDisconnect(chatId) {
  console.log(`Processing /disconnect for chat ${chatId}`);

  try {
    const profileRes = await supabaseFetch(
      `profiles?select=id,notification_settings&telegram_chat_id=eq.${chatId}&limit=1`
    );

    if (!profileRes.ok) {
      throw new Error(`Supabase API error: ${profileRes.status}`);
    }

    const profiles = await profileRes.json();

    if (!profiles || profiles.length === 0) {
      await sendTelegramMessage(chatId,
        `❌ Ваш Telegram не привязан к аккаунту.`
      );
      return;
    }

    const profile = profiles[0];

    const currentSettings = profile.notification_settings || {};
    const newSettings = {
      ...currentSettings,
      telegramBot: false,
      telegramChatId: ''
    };

    await supabaseFetch(
      `profiles?id=eq.${profile.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          telegram_chat_id: null,
          notification_settings: newSettings
        })
      }
    );

    await sendTelegramMessage(chatId,
      `✅ Telegram отключен от вашего аккаунта.\n\n` +
      `Вы больше не будете получать уведомления в Telegram.\n\n` +
      `Для повторного подключения используйте /start`
    );
  } catch (error) {
    console.error('Error handling /disconnect:', error);
    await sendTelegramMessage(chatId, '❌ Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

// Обработка команды /status
async function handleStatus(chatId) {
  console.log(`Processing /status for chat ${chatId}`);

  try {
    const profileRes = await supabaseFetch(
      `profiles?select=email,notification_settings&telegram_chat_id=eq.${chatId}&limit=1`
    );

    if (!profileRes.ok) {
      throw new Error(`Supabase API error: ${profileRes.status}`);
    }

    const profiles = await profileRes.json();

    if (!profiles || profiles.length === 0) {
      await sendTelegramMessage(chatId,
        `ℹ️ Ваш Telegram не привязан к аккаунту.\n\n` +
        `Используйте /start для подключения.`
      );
    } else {
      const profile = profiles[0];
      const settings = profile.notification_settings || {};
      const status = settings.telegramBot ? '✅ Включены' : '❌ Выключены';

      await sendTelegramMessage(chatId,
        `📋 Статус уведомлений:\n\n` +
        `Email: ${profile.email}\n` +
        `Telegram: ${status}\n` +
        `Уведомлять за: ${settings.notifyBeforeHours || 24} час.\n\n` +
        `Изменить настройки можно на сайте в разделе "Профиль".`
      );
    }
  } catch (error) {
    console.error('Error handling /status:', error);
    await sendTelegramMessage(chatId, '❌ Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

// Обработка команды /help
async function handleHelp(chatId) {
  await sendTelegramMessage(chatId,
    `📖 Справка по боту ur_sud_bot:\n\n` +
    `/start - Начать работу с ботом\n` +
    `/connect email - Подключить аккаунт\n` +
    `/disconnect - Отключить Telegram\n` +
    `/status - Проверить статус\n` +
    `/help - Показать эту справку`
  );
}

// Обработка неизвестной команды
async function handleUnknown(chatId) {
  await sendTelegramMessage(chatId,
    `Я не понимаю эту команду.\n\n` +
    `Используйте /help для списка доступных команд.`
  );
}

// Получение обновлений через getUpdates (polling)
let lastUpdateId = 0;

async function getUpdates() {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&limit=10&timeout=10`;
    const response = await retryWithBackoff(() => fetch(url), 3, 2000);

    if (!response.ok) {
      console.error('Failed to get updates:', response.status);
      return;
    }

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return;
    }

    for (const update of data.result) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id);

      if (!update.message) continue;

      const message = update.message;
      const chatId = message.chat.id.toString();
      const text = message.text || '';

      console.log(`Message from ${chatId}: ${text}`);

      if (text === '/start') {
        await handleStart(chatId);
      } else if (text.startsWith('/connect ')) {
        await handleConnect(chatId, text);
      } else if (text === '/disconnect') {
        await handleDisconnect(chatId);
      } else if (text === '/status') {
        await handleStatus(chatId);
      } else if (text === '/help') {
        await handleHelp(chatId);
      } else if (text.startsWith('/')) {
        await handleUnknown(chatId);
      }
    }
  } catch (error) {
    console.error('Error in getUpdates:', error);
  }
}

// Удаление webhook (чтобы polling работал)
async function deleteWebhook() {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`;
    const response = await retryWithBackoff(() => fetch(url), 3, 2000);
    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook удален, polling активирован');
    } else {
      console.log('Webhook status:', data);
    }
  } catch (error) {
    console.error('Error deleting webhook:', error);
  }
}

// Проверка информации о боте
async function getMe() {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
    const response = await retryWithBackoff(() => fetch(url), 3, 2000);
    const data = await response.json();

    if (data.ok) {
      console.log('🤖 Bot info:', `@${data.result.username}`);
      return data.result;
    }
  } catch (error) {
    console.error('Error getting bot info:', error);
  }
}

// Основной цикл polling
async function startPolling() {
  console.log('\n🚀 Starting Telegram Bot...\n');

  const botInfo = await getMe();
  if (!botInfo) {
    console.error('❌ Failed to connect to Telegram Bot. Check your token.');
    process.exit(1);
  }

  await deleteWebhook();

  console.log('📡 Starting polling for messages...\n');

  while (true) {
    await getUpdates();
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

startPolling().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
