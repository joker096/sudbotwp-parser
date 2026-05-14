# ✅ FIXED: Daily Court Cases Auto-Refresh Cron

## Completed Fixes

### 1. auto-refresh.cjs script fixed (b09d0be)
- Removed broken `require('node-fetch')` import
- Node.js v22 has native global `fetch` — script now works correctly
- Script finds cases and calls edge functions properly

### 2. Calendar event date split vulnerabilities fixed (96d0734)
Fixed all vulnerable `.split('-')` calls on date strings:
- `Profile.tsx` line 331: `event.event_date.split('-')` → wrapped with try/catch IIFE
- `Profile.tsx` line 785: `newDate.split('-')` → wrapped with try/catch IIFE
- `Profile.tsx` line 932: `eventDate.split('-')` → wrapped with try/catch IIFE
- `EventModal.tsx` line 65: `date.split('-')` → wrapped with try/catch IIFE

## Manual Verification Required (User Action Needed)

### Step 1: Check Cron Jobs in Supabase SQL Editor
```sql
SELECT * FROM cron.job ORDER BY jobname;
```
Look for 'daily-cases-refresh' job.

### Step 2: Check Cron Run Logs
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

### Step 3: Get FUNCTION_SECRET
Supabase Dashboard → Edge Functions → auto-refresh-cases → Settings
→ Copy FUNCTION_SECRET value

### Step 4: Test Edge Function
```bat
curl -X POST https://qhiietjvfuekfaehddox.supabase.co/functions/v1/auto-refresh-cases ^
  -H "Authorization: Bearer YOUR_FUNCTION_SECRET_HERE" ^
  -H "Content-Type: application/json"
```

### Step 5: Check Edge Function Logs
Supabase → Edge Functions → auto-refresh-cases → Logs

### Step 6: Verify Cases Updated
```sql
SELECT COUNT(*) FROM cases WHERE updated_at > NOW() - INTERVAL '1 hour';
```

## Known Issues
- parse-case edge function returning 504/546 errors (timeout from court websites or API issues)
- FUNCTION_SECRET not set in local .env (needs Supabase dashboard access)
- SCRAPINGBEE_API_KEY not set in local .env (edge function may need this for JS rendering)

## Files Changed
- `scripts/auto-refresh.cjs` — Fixed fetch import
- `src/pages/Profile.tsx` — Added 3 defensive date split guards
- `src/components/EventModal.tsx` — Added 1 defensive date split guard

## Next Steps if Cron Job Not Working
If cron job exists but returns 401 errors:
```sql
SELECT cron.unschedule('daily-cases-refresh');
-- Then recreate with correct FUNCTION_SECRET
```