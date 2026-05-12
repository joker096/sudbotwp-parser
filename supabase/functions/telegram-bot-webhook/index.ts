// supabase/functions/telegram-bot-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

function sendText(chatId: string, text: string) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
  });
}

function escapeMarkdown(text: string): string {
  return text.replace(/_/g, '\\_').replace(/`/g, '\\`').replace(/\*/g, '\\*').replace(/-/g, '\\-').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

serve(async (req) => {
  try {
    const update = await req.json();

    // Handle callback queries (inline buttons)
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      const chatId = update.callback_query.chat.id.toString();

      if (callbackData.startsWith('status_')) {
        await sendText(chatId, 'Статус подключен ✅');
        await update.callback_query.answer({ text: 'Статус' });
      } else if (callbackData.startsWith('connect_')) {
        await sendText(chatId, 'Для подключения используйте команду /connect ваш@email');
        await update.callback_query.answer({ text: 'Подключить' });
      } else if (callbackData.startsWith('help_')) {
        await sendText(chatId, getHelpMessage());
        await update.callback_query.answer({ text: 'Помощь' });
      }
      return new Response('OK', { status: 200 });
    }

    const message = update.message;
    if (!message?.text) return new Response('OK', { status: 200 });

    const chatId = message.chat.id.toString();
    const text = message.text;

    if (text === '/start') {
      await sendText(chatId, `👋 *Добро пожаловать в Sud!*

Ваш Chat ID: \`${chatId}\`

Используйте команды:
/connect - подключить аккаунт
/status - проверить подключение
/help - помощь`);
      return new Response('OK', { status: 200 });
    }

    if (text === '/help') {
      await sendText(chatId, getHelpMessage());
      return new Response('OK', { status: 200 });
    }

    if (text === '/status') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_settings, telegram_chat_id')
        .eq('id', chatId)
        .or(`notification_settings.telegram_chat_id.eq.${chatId},telegram_chat_id.eq.${chatId}`)
        .first();

      if (profile) {
        const isLinked = profile.id === chatId || 
          profile.notification_settings?.telegramChatId || 
          profile.telegram_chat_id;
        await sendText(chatId, isLinked ? '✅ Аккаунт подключен' : '❌ Аккаунт не найден');
      } else {
        await sendText(chatId, '❌ Аккаунт не найден');
      }
      return new Response('OK', { status: 200 });
    }

    // /connect email
    if (text.startsWith('/connect ')) {
      const email = text.replace('/connect ', '').trim();
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .first();

      if (profilesData) {
        await supabase
          .from('profiles')
          .update({
            telegram_chat_id: chatId,
            notification_settings: {
              ...(profilesData as any).notification_settings || {},
              telegramChatId: chatId,
              telegramBot: true,
            },
          })
          .eq('id', (profilesData as any).id);

        await sendText(chatId, `✅ Подключено!\n\nВаш Chat ID: \`${chatId}\`\n\nТеперь вы получаете уведомления о делах.`);
      } else {
        await sendText(chatId, `❌ Профиль с email "${email}" не найден.\n\nПроверьте правиль email или подключите вручную.`);
      }
      return new Response('OK', { status: 200 });
    }

    // /disconnect
    if (text === '/disconnect') {
      await supabase
        .from('profiles')
        .update({
          telegram_chat_id: null,
          notification_settings: {
            telegramChatId: null,
            telegramBot: false,
          },
        })
        .or(`id.eq.${chatId},notification_settings.telegram_chat_id.eq.${chatId}`);

      await sendText(chatId, '❌ Аккаунт отключен.');
      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Error', { status: 500 });
  }
});

function getHelpMessage(): string {
  return `📖 *Команды бота:*

*/start* - Начать работу
*/connect email* - Подключить аккаунт
*/disconnect* - Отключить аккаунт
*/status* - Проверить подключение
*/help* - Эта помощь

💡 *Подключите аккаунт через /connect ваш@email, чтобы получать уведомления о делах через Telegram.*`;
}
