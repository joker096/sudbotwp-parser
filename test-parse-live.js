// Test script for parsing case via Supabase Edge Function
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://qhiietjvfuekfaehddox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaWlldGp2ZnVla2ZhZWhkZG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNDY3MTAsImV4cCI6MjA2NTcyMjcxMH0.Ae-xBpuSnLcQpWGC8COR3N_5BAjdJ6cqkzP4rnCJAzA';

// Test case URLs
const testUrls = [
  'https://vsevgorsud--lo.sudrf.ru/modules.php?name=sud_delo&srv_num=1&name_op=case&case_id=256537282&delo_id=1540005',
  'https://oblsud--lo.sudrf.ru/modules.php?name=sud_delo&srv_num=1&name_op=case&case_id=12345&delo_id=1540005',
];

async function testParseCase(url) {
  console.log(`\n=== Testing URL: ${url.substring(0, 80)}... ===`);
  console.time('Request time');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-case`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.timeEnd('Request time');
    
    console.log(`Response status: ${response.status}`);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error:', data.error || `HTTP ${response.status}`);
      return { success: false, error: data.error };
    }
    
    console.log('\n✅ Parsing successful!');
    console.log('Case number:', data.number);
    console.log('Court:', data.court);
    console.log('Status:', data.status);
    console.log('Date:', data.date);
    console.log('Category:', data.category);
    console.log('Judge:', data.judge);
    console.log('Plaintiff:', data.plaintiff);
    console.log('Defendant:', data.defendant);
    console.log('Events count:', data.events?.length || 0);
    console.log('Appeals count:', data.appeals?.length || 0);
    console.log('Judicial UID:', data.judicialUid || 'Not found');
    
    return { success: true, data };
  } catch (error) {
    console.timeEnd('Request time');
    console.error('Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('=== Testing Case Parser on LIVE site ===');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Function: parse-case');
  
  for (const url of testUrls) {
    await testParseCase(url);
  }
  
  console.log('\n=== Tests completed ===');
}

main();
