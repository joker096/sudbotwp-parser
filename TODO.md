# TODO: Fix Daily Court Cases Auto-Refresh Cron

## Current Status:
- pg_cron active (5 jobs)
- 5 eligible cases (>24h old)
- No recent updates detected

## Step 1: Check Existing Cron Jobs [IN PROGRESS]
Run in Supabase SQL Editor:
```sql
SELECT * FROM cron.job ORDER BY jobname;
```
Expected: Look for 'daily-cases-refresh' or 'auto-refresh-cases-schedule' calling auto-refresh-cases function.

## Step 2: Check Cron Run Logs
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC LIMIT 20;
```
Look for recent runs, status=success, return_message.

## Step 3: Get FUNCTION_SECRET
- Supabase Dashboard → Edge Functions → auto-refresh-cases → Settings
- Copy FUNCTION_SECRET value

## Step 4: Test Edge Function Manually
Save as test-cron.bat (Windows):
```bat
curl -X POST https://qhiietjvfuekfaehddox.supabase.co/functions/v1/auto-refresh-cases ^
  -H "Authorization: Bearer YOUR_FUNCTION_SECRET_HERE" ^
  -H "Content-Type: application/json"
```
YOUR_FUNCTION_SECRET_HERE = Step 3 value

## Step 5: Check Edge Function Logs
Supabase → Edge Functions → auto-refresh-cases → Logs (recent runs)

## Step 6: Run Local Test (Alternative)
```bash
node scripts/auto-refresh.js
```
Requires .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

## Step 7: Fix if FUNCTION_SECRET Wrong in Cron
If cron job exists but 401 errors:
1. Delete: SELECT cron.unschedule('daily-cases-refresh');
2. Recreate:
```sql
SELECT cron.schedule(
  'daily-cases-refresh',
  '0 6 * * *',
  $$SELECT net.http_post(
    'https://qhiietjvfuekfaehddox.supabase.co/functions/v1/auto-refresh-cases',
    '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_REAL_SECRET"}'::jsonb
  );$$
);
```

## Step 8: Verify Fix
Check: SELECT COUNT(*) FROM cases WHERE updated_at > NOW() - INTERVAL '1 hour';

Report back Step 1-2 outputs + FUNCTION_SECRET status.

