# Telegram Bot Setup Guide

## Problem
`api.telegram.org` is not accessible from China, so you can't set the webhook directly.

## Solution: Use GitHub Actions to Set Webhook

### Step 1: Add Bot Token as Repository Secret
1. Go to your GitHub repository settings
2. Go to "Secrets and variables" → "Actions"
3. Add a new secret:
   - Name: `TELEGRAM_BOT_TOKEN`
   - Value: `6470229842:AAHM2hn5G0EBm0yXOX18V6OLkH-rF90zRbw` (replace with your actual bot token)

### Step 2: Trigger the Workflow
1. Go to the "Actions" tab in your GitHub repository
2. Click on "Set Telegram Webhook" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow" again

### Step 3: Verify
Check the workflow logs to confirm the webhook was set.

## Alternative: Set Webhook via Supabase CLI
If you have access to a server outside China, you can run:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<PROJECT>.supabase.co/functions/v1/telegram-bot-webhook"
```

## Functions
- `telegram-bot-webhook` - Handles Telegram bot commands (/start, /getid)
- `send-lead-notification` - Sends notifications to lawyers about new lead applications
- `telegram-webhook` - Alternative webhook with CORS support

## Secrets Required
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (for all functions)
- `SUPABASE_URL` - Supabase project URL (for send-lead-notification)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for send-lead-notification)

Set secrets in Supabase Dashboard:
Settings → Edge Functions → Add secret
