// supabase/functions/check-spam-leads/index.ts
// AI-based spam detection for leads using Google Gemini API
// 
// Deploy: supabase functions deploy check-spam-leads --project <project-id>
// Environment: GEMINI_API_KEY (set via: supabase secrets set GEMINI_API_KEY=xxx)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash';

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required. Set it via: supabase secrets set GEMINI_API_KEY=xxx');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MAX_LEADS_PER_RUN = 100;

// ========================
// Gemini API Call
// ========================
async function checkSpamWithGemini(leadText: string): Promise<{ isSpam: boolean; reason: string }> {
  try {
    const prompt = `Ты - модератор лидов юридической платформы. Твоя задача - определить, является ли лид СПАМОМ (фейковым).

Лид: ${leadText}

КРИТЕРИИ СПАМА (любой критерий = спам):
1. Телефон: example.com, test, 123, или явно несуществующий формат
2. Email: example.com, test@, некорректный формат
3. Имя: пустое, односимвольное, бессмысленное
4. Регион: не является реальным регионом/городом РФ
5. Описание: пустое или бессмысленный набор символов
6. Любой номер телефона состоит из повторяющихся цифр (11111111111, 9999999999)

Если спам - верни {"isSpam":true,"reason":"причина"}. Если нормальный - {"isSpam":false,"reason":"ok"}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 150,
            response_schema: {
              type: 'object',
              properties: {
                isSpam: { type: 'boolean' },
                reason: { type: 'string' },
              },
              required: ['isSpam', 'reason'],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { isSpam: parsed.isSpam === true, reason: parsed.reason || 'AI detected spam' };
    }
  } catch (e) {
    console.error('Gemini check error:', e);
    return { isSpam: false, reason: 'Check error - not flagged' };
  }
}

// ========================
// Format lead for Gemini
// ========================
function formatLeadForAI(lead: any): string {
  return [
    `Имя: "${lead.client_name || ''}"`,
    `Телефон: "${lead.client_phone || ''}"`,
    `Email: "${lead.client_email || ''}"`,
    `Регион: "${lead.region || ''}"`,
    `Тип дела: "${lead.case_type || ''}"`,
    `Описание: "${lead.case_description || ''}"`,
    `Бюджет: "${lead.budget || ''}"`,
    `Срочность: "${lead.urgency || ''}"`,
  ].join(' | ');
}

// ========================
// Main Handler
// ========================
serve(async (req) => {
  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Get new leads
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: true })
      .limit(MAX_LEADS_PER_RUN);

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ message: 'No new leads', checked: 0 }));
    }

    console.log(`[check-spam] Checking ${leads.length} new leads...`);

    let spamCount = 0;
    let errorCount = 0;

    for (const lead of leads) {
      try {
        const leadText = formatLeadForAI(lead);
        const { isSpam, reason } = await checkSpamWithGemini(leadText);

        if (isSpam) {
          await supabase.from('leads').update({ status: 'spam' }).eq('id', lead.id);
          spamCount++;
          console.log(`[SPAM] Lead ${lead.id}: ${reason}`);
        } else {
          console.log(`[OK] Lead ${lead.id}`);
        }
      } catch (leadError) {
        errorCount++;
        console.error(`[ERROR] Lead ${lead.id}:`, leadError);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(JSON.stringify({
      message: 'Spam check completed',
      checked: leads.length,
      spamFound: spamCount,
      errors: errorCount,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[check-spam] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500 }
    );
  }
});
