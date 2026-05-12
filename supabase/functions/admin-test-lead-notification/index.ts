// supabase/functions/admin-test-lead-notification/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

serve(async (req) => {
  try {
    const { lawyer_id } = await req.json();
    
    if (!lawyer_id) {
      return new Response(JSON.stringify({ error: 'lawyer_id is required' }), { status: 400 });
    }

    // Проверяем админ
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('*, profiles(notification_settings, telegram_chat_id)')
      .eq('id', lawyer_id)
      .first();

    if (!lawyer) {
      return new Response(JSON.stringify({ error: 'Lawyer not found' }), { status: 404 });
    }

    // Отправляем тестовое сообщение
    const message = `🧪 *Тестовое уведомление*\n\nЭто тест от администратора. Убедитесь, что уведомления работают.`;

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: lawyer.notify_telegram,
        text: message,
        parse_mode: 'MarkdownV2',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: 'Telegram API error', 
        details: errorText 
      }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Test notification sent' 
    }), { status: 200 });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
