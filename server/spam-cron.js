// spam-cron.js - Periodic spam check module for server
// Can be imported by server.js or run standalone

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { blockIP, isIPBlocked } from './spam-ip-tracker.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '600000'); // 10 minutes

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[spam-cron] Supabase credentials not found. Run periodically with: node scripts/check-spam-cron.mjs');
}

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ========================
// Format lead for Gemini
// ========================
export function formatLeadForAI(lead) {
  return [
    `Name: "${lead.client_name || ''}"`,
    `Phone: "${lead.client_phone || ''}"`,
    `Email: "${lead.client_email || ''}"`,
    `Region: "${lead.region || ''}"`,
    `Case type: "${lead.case_type || ''}"`,
    `Description: "${lead.case_description || ''}"`,
    `Budget: "${lead.budget || ''}"`,
    `Urgency: "${lead.urgency || ''}"`,
  ].join(' | ');
}

// ========================
// Check lead with Gemini
// ========================
export async function checkSpamWithGemini(leadText) {
  if (!GEMINI_API_KEY) {
    return { isSpam: false, reason: 'No API key configured' };
  }

  try {
    const prompt = `You are a lead quality moderator for a Russian legal platform. Determine if this lead is SPAM.

LEAD DATA: ${leadText}

SPAM CRITERIA (if ANY apply, it's spam):
1. Phone: example.com, test, 123, or obviously fake format
2. Email: example.com, test@, invalid format
3. Name: empty, single character, meaningless
4. Region: not a real Russian region/city
5. Description: empty or random characters
6. Phone with repeating digits (11111111111, 9999999999)

Return ONLY JSON: {"isSpam":true/false,"reason":"brief reason"}`;

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
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { isSpam: parsed.isSpam === true, reason: parsed.reason || 'AI detected spam' };
    }
  } catch (e) {
    console.error('[spam-cron] Gemini error:', e.message);
  }
  return { isSpam: false, reason: 'Check error' };
}

// ========================
// Run one check cycle
// ========================
export async function runCheckCycle() {
  if (!supabase) {
    console.log('[spam-cron] Supabase not configured. Run manually with scripts/check-spam-cron.mjs');
    return;
  }

  console.log(`[${new Date().toISOString()}] Checking for new leads...`);

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .is('checked_for_spam', null)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[spam-cron] Error fetching leads:', error);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('[spam-cron] No unchecked leads');
    return;
  }

  console.log(`[spam-cron] Processing ${leads.length} leads...`);

  for (const lead of leads) {
    try {
      const leadText = formatLeadForAI(lead);
      const { isSpam, reason } = await checkSpamWithGemini(leadText);

      await supabase.from('leads').update({ checked_for_spam: new Date().toISOString() }).eq('id', lead.id);

      if (isSpam) {
        await supabase.from('leads').update({ status: 'spam' }).eq('id', lead.id);
        console.log(`[SPAM] Lead ${lead.id}: ${reason}`);
      } else {
        console.log(`[OK] Lead ${lead.id}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[spam-cron] Error: ${err.message}`);
    }
  }
}

// ========================
// Start periodic checking
// ========================
export function cron() {
  if (!supabase) {
    console.log('[spam-cron] Not running - Supabase credentials not configured');
    return;
  }

  console.log(`[spam-cron] Starting periodic checks (every ${CHECK_INTERVAL / 1000}s)...`);

  // Run immediately
  runCheckCycle();

  // Then every CHECK_INTERVAL ms
  setInterval(runCheckCycle, CHECK_INTERVAL);
}
