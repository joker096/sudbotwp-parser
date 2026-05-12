// supabase/functions/send-lead-notification/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

serve(async (req) => {
  try {
    const body = await req.json();
    const leadId = body.lead_id || body.id || body.data?.id;

    if (!leadId) {
      return new Response(JSON.stringify({ error: 'No lead_id provided' }), { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        lawyers:lawyer_id (
          name,
          notify_new_leads,
          notify_telegram,
          user_id
        )
      `)
      .eq('id', leadId)
      .first();

    if (leadError) throw leadError;
    if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });

    const lawyer = lead.lawyers as any;

    if (!lawyer?.notify_new_leads || !lawyer?.notify_telegram) {
      return new Response(JSON.stringify({ ok: true, reason: 'Notifications disabled' }), { status: 200 });
    }

    const message = `
🔔 *Новая заявка!*
👤 *Клиент:* ${lead.client_name || 'Не указан'}
📞 *Телефон:* ${lead.client_phone || 'Не указан'}
📋 *Тип дела:* ${lead.case_type || 'Не указан'}
💰 *Бюджет:* ${lead.budget ? lead.budget + ' ₽' : 'Не указан'}
📝 *Описание:*
${lead.case_description || 'Не указано'}
    `.trim();

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
      console.error('Telegram API error:', errorText);
    }

    return new Response(JSON.stringify({ ok: true, sent: true }), { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
