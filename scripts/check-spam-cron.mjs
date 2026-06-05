// scripts/check-spam-cron.mjs
// Periodic AI spam check - runs every 10 minutes
// Usage: node scripts/check-spam-cron.mjs
// Schedule: crontab -e -> */10 * * * * cd /path/to/project && node scripts/check-spam-cron.mjs

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set in environment');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Supabase credentials not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50');

// ========================
// Format lead data for Gemini
// ========================
function formatLeadForAI(lead) {
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
// Check one lead with Gemini
// ========================
async function checkSpamWithGemini(leadText) {
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

Return ONLY JSON: {"isSpam":true/false,"reason":"brief reason"}
If unsure and it looks legitimate, return {"isSpam":false,"reason":"ok"}.`;

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
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { isSpam: parsed.isSpam === true, reason: parsed.reason || 'AI detected spam' };
    }
  } catch (e) {
    console.error('Gemini error:', e.message);
  }
  return { isSpam: false, reason: 'Check error - not flagged' };
}

// ========================
// Main cron job
// ========================
async function runCheck() {
  console.log(`[${new Date().toISOString()}] Starting spam check...`);

  // Fetch new leads that haven't been checked yet
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .is('checked_for_spam', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  if (!leads || leads.length === 0) {
    console.log('No unchecked leads to process.');
    return;
  }

  console.log(`Processing ${leads.length} leads...`);

  let spamCount = 0;
  let errorCount = 0;

  for (const lead of leads) {
    try {
      const leadText = formatLeadForAI(lead);
      const { isSpam, reason } = await checkSpamWithGemini(leadText);

      // Mark as checked
      await supabase.from('leads').update({ checked_for_spam: new Date().toISOString() }).eq('id', lead.id);

      if (isSpam) {
        // Mark as spam (don't delete - keep for review)
        await supabase.from('leads').update({ status: 'spam' }).eq('id', lead.id);
        spamCount++;
        console.log(`[SPAM] Lead ${lead.id}: ${reason}`);
      } else {
        console.log(`[OK] Lead ${lead.id}`);
      }

      // Small delay between checks
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      errorCount++;
      console.error(`Error processing lead ${lead.id}:`, err.message);
    }
  }

  console.log(`[DONE] Checked: ${leads.length}, Spam: ${spamCount}, Errors: ${errorCount}`);
}

// Run once
runCheck();
