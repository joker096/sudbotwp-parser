/**
 * Edge Function: monitor-companies
 * Автоматический мониторинг отслеживаемых компаний
 * Запускается через pg_cron раз в сутки
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface MonitoredCompany {
  id: string;
  user_id: string;
  inn: string;
  name: string;
  last_egrul_data?: any;
  last_fssp_count?: number;
  last_efrsb_count?: number;
  last_check_at?: string;
}

interface CheckResult {
  egrul?: any;
  fssp?: { count: number };
  efrsb?: { hasBankruptcy: boolean; cases: any[] };
}

export default async function handler(req: Request) {
  // Проверка на cron-trigger (или manual trigger)
  const authHeader = req.headers.get('Authorization');
  const isCron = authHeader?.includes('Bearer') || req.method === 'POST';

  if (!isCron) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Получаем компании для проверки (которые не проверялись > 24 часов)
    const { data: companies, error: fetchError } = await supabase
      .from('monitored_companies')
      .select('*')
      .or('last_check_at.is.null,last_check_at.lt.' + getYesterdayIso());

    if (fetchError) throw fetchError;
    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Нет компаний для проверки' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const company of companies as MonitoredCompany[]) {
      const changes = await checkCompany(company);

      if (changes.length > 0) {
        // Сохраняем события
        for (const change of changes) {
          await supabase.from('company_events').insert({
            company_id: company.id,
            event_type: change.type,
            event_data: change.data,
            created_at: new Date().toISOString(),
          });
        }

        // Отправляем уведомления
        await sendNotifications(company.user_id, company.name, changes);
      }

      // Обновляем время проверки
      await supabase
        .from('monitored_companies')
        .update({ last_check_at: new Date().toISOString() })
        .eq('id', company.id);

      results.push({
        company: company.name,
        inn: company.inn,
        changes: changes.length,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: companies.length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('monitor-companies error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function checkCompany(company: MonitoredCompany): Promise<Array<{ type: string; data: any }>> {
  const changes = [];

  // Проверяем ЕГРЮЛ
  try {
    const egrulRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-egrul`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
      body: JSON.stringify({ inn: company.inn }),
    });

    if (egrulRes.ok) {
      const egrul = await egrulRes.json();
      const prev = company.last_egrul_data;

      if (prev) {
        // Проверяем изменения
        if (prev.data?.director !== egrul.data?.director) {
          changes.push({
            type: 'director_changed',
            data: { from: prev.data?.director, to: egrul.data?.director },
          });
        }
        if (prev.data?.status !== egrul.data?.status) {
          changes.push({
            type: 'status_changed',
            data: { from: prev.data?.status, to: egrul.data?.status },
          });
        }
        if (prev.data?.address !== egrul.data?.address) {
          changes.push({
            type: 'address_changed',
            data: { from: prev.data?.address, to: egrul.data?.address },
          });
        }
      }

      // Сохраняем текущие данные
      await supabase
        .from('monitored_companies')
        .update({ last_egrul_data: egrul })
        .eq('id', company.id);
    }
  } catch (e) {
    console.warn('EGRUL check failed:', e);
  }

  // Проверяем ФССП
  try {
    const fsspRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-fssp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
      body: JSON.stringify({ inn: company.inn }),
    });

    if (fsspRes.ok) {
      const fssp = await fsspRes.json();
      const prevCount = company.last_fssp_count || 0;

      if (fssp.count > prevCount) {
        changes.push({
          type: 'new_fssp',
          data: { newCount: fssp.count, prevCount, productions: fssp.productions?.slice(0, 3) },
        });
      }

      await supabase
        .from('monitored_companies')
        .update({ last_fssp_count: fssp.count })
        .eq('id', company.id);
    }
  } catch (e) {
    console.warn('FSSP check failed:', e);
  }

  // Проверяем ЕФРСБ
  try {
    const efrsbRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-efrsb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
      body: JSON.stringify({ inn: company.inn }),
    });

    if (efrsbRes.ok) {
      const efrsb = await efrsbRes.json();
      const prevCount = company.last_efrsb_count || 0;
      const currentCount = efrsb.cases?.length || 0;

      if (currentCount > prevCount) {
        changes.push({
          type: 'new_bankruptcy',
          data: { newCount: currentCount, prevCount, cases: efrsb.cases?.slice(0, 2) },
        });
      }

      await supabase
        .from('monitored_companies')
        .update({ last_efrsb_count: currentCount })
        .eq('id', company.id);
    }
  } catch (e) {
    console.warn('EFRSB check failed:', e);
  }

  return changes;
}

async function sendNotifications(userId: string, companyName: string, changes: any[]) {
  try {
    // Получаем профиль пользователя
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, telegram_chat_id, notification_settings')
      .eq('id', userId)
      .single();

    if (!profile) return;

    const changeTexts = changes.map(c => {
      switch (c.type) {
        case 'director_changed': return `Сменился директор: ${c.data.from} → ${c.data.to}`;
        case 'status_changed': return `Изменился статус: ${c.data.from} → ${c.data.to}`;
        case 'address_changed': return `Изменился адрес`;
        case 'new_fssp': return `Новые исполнительные производства: +${c.data.newCount - c.data.prevCount}`;
        case 'new_bankruptcy': return `Новые дела о банкротстве: +${c.data.newCount - c.data.prevCount}`;
        default: return 'Изменения в компании';
      }
    });

    const message = `🔔 <b>Изменения в компании «${companyName}»</b>\n\n${changeTexts.join('\n')}`;

    // Telegram
    if (profile.telegram_chat_id) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-telegram-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
        body: JSON.stringify({ chat_id: profile.telegram_chat_id, text: message }),
      });
    }

    // Email (можно подключить через send-report-email)
    if (profile.email && profile.notification_settings?.emailDigest) {
      // Email отправляется через отдельный сервис
      console.log(`Email notification would be sent to ${profile.email}`);
    }

    // Web Push (только для критичных событий)
    const criticalTypes = ['new_bankruptcy', 'liquidation', 'status_changed'];
    const hasCritical = changes.some((c) => criticalTypes.includes(c.type));

    if (hasCritical) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            user_id: userId,
            title: `⚠️ ${companyName}: критичные изменения`,
            body: changeTexts.join('; ').slice(0, 100),
            url: 'https://sud.cvr.name/monitoring',
          }),
        });
      } catch (e) {
        console.warn('Push notification failed:', e);
      }
    }

  } catch (e) {
    console.error('Notification error:', e);
  }
}

function getYesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

// Для запуска через cron или HTTP trigger
if (Deno.env.get('DENO_DEPLOYMENT_ID')) {
  // Deno Deploy / Edge Function mode
} else {
  // Local testing
}
