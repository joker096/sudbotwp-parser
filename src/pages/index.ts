import { corsHeaders } from '../_shared/cors.ts'

// This is a placeholder for a real email sending service like Resend.
// Supabase has built-in email sending for auth, but for transactional emails,
// you'd typically use a dedicated service and its API key from Deno.env.
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  console.log(`--- EMAIL SENDING (SIMULATED) ---`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`--- This would be sent via a service like Resend in production ---`);

  // In a real app, you would use your email provider's SDK here.
  // Example with Resend:
  /*
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'SudBot <noreply@yourdomain.com>',
      to: [to],
      subject: subject,
      html: html,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to send email: ${errorBody.message}`);
  }
  */

  // Simulate success for demo purposes
  return await Promise.resolve({ error: null });
}

// Re-use the HTML generation logic from the frontend
function generateReportHtml(caseData: any): string {
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path></svg>`;
  const html = `
    <!DOCTYPE html><html lang="ru"><head><title>Отчёт по делу ${caseData?.number || ''}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; background-color: #f8f9fa; color: #212529; }
      .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 16px; }
      .header { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #dee2e6; padding-bottom: 20px; margin-bottom: 20px; }
      .logo { color: #5856d6; } h1 { font-size: 28px; font-weight: 700; margin: 0; }
      h2 { font-size: 20px; font-weight: 600; margin-top: 40px; margin-bottom: 16px; color: #495057; border-bottom: 1px solid #e9ecef; padding-bottom: 8px; }
      .case-number-label { font-size: 14px; color: #6c757d; margin-bottom: 4px; }
      .case-number { font-size: 18px; font-weight: 600; background-color: #e9ecef; padding: 8px 12px; border-radius: 8px; display: inline-block; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .info-item { background-color: #f8f9fa; padding: 16px; border-radius: 12px; border: 1px solid #e9ecef; }
      .info-item.full-width { grid-column: span 2; }
      .label { font-size: 12px; color: #6c757d; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
      .value { font-size: 15px; font-weight: 600; color: #212529; margin-top: 6px; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .party { background-color: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e9ecef; }
      .timeline { position: relative; padding-left: 30px; border-left: 2px solid #e9ecef; }
      .timeline-item { position: relative; margin-bottom: 20px; padding: 16px; background-color: #f8f9fa; border-radius: 12px; }
      .timeline-item:last-child { margin-bottom: 0; }
      .timeline-dot { position: absolute; left: -39px; top: 18px; width: 16px; height: 16px; border-radius: 50%; background-color: #ffffff; border: 3px solid #5856d6; }
      .timeline-date { font-weight: 600; color: #212529; margin-bottom: 4px; }
      .timeline-name { font-size: 14px; color: #495057; }
      .timeline-result { font-size: 13px; font-weight: 600; color: #198754; margin-top: 8px; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center; }
    </style></head><body><div class="container">
      <header class="header"><div class="logo">${logoSvg}</div><h1>Судебный отчёт</h1></header>
      <main>
        <div class="case-number-label">Номер дела</div><p class="case-number">${caseData?.number || '—'}</p>
        <section><h2>Основная информация</h2><div class="info-grid">
          <div class="info-item"><div class="label">Суд</div><div class="value">${caseData?.court || '—'}</div></div>
          <div class="info-item"><div class="label">Категория</div><div class="value">${caseData?.category || '—'}</div></div>
          <div class="info-item"><div class="label">Судья</div><div class="value">${caseData?.judge || '—'}</div></div>
          <div class="info-item"><div class="label">Дата регистрации</div><div class="value">${caseData?.date || '—'}</div></div>
          <div class="info-item full-width"><div class="label">Результат рассмотрения</div><div class="value">${caseData?.status || '—'}</div></div>
        </div></section>
        <section><h2>Стороны</h2><div class="parties">
          <div class="party"><div class="label">Истец</div><div class="value">${caseData?.plaintiff || '—'}</div></div>
          <div class="party"><div class="label">Ответчик</div><div class="value">${caseData?.defendant || '—'}</div></div>
        </div></section>
        ${caseData?.events?.length ? `<section><h2>Движение дела</h2><div class="timeline">
          ${caseData.events.map((event: any) => `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-date">${event.date} ${event.time || ''}</div><div class="timeline-name">${event.name}</div>${event.result ? `<div class="timeline-result">✓ ${event.result}</div>` : ''}${event.reason ? `<div style="font-size: 12px; color: #6c757d; margin-top: 4px;">Причина: ${event.reason}</div>` : ''}${event.location ? `<div style="font-size: 12px; color: #6c757d; margin-top: 4px;">Место: ${event.location}</div>` : ''}</div>`).join('')}
        </div></section>` : ''}
      </main>
      <footer class="footer"><p>Отчёт сгенерирован сервисом SudBot. Дата: ${new Date().toLocaleDateString('ru-RU')}</p><p>Информация носит справочный характер и не является официальным документом.</p></footer>
    </div></body></html>`;
  return html;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { caseData, toEmail } = await req.json();

    if (!caseData || !toEmail) {
      throw new Error('Missing caseData or toEmail');
    }

    const reportHtml = generateReportHtml(caseData);

    const { error: emailError } = await sendEmail({
      to: toEmail,
      subject: `Ваш судебный отчёт по делу №${caseData.number}`,
      html: reportHtml,
    });

    if (emailError) {
      throw emailError;
    }

    return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});