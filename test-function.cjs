const testUrl = 'https://oblsud--lo.sudrf.ru/modules.php?name=sud_delo&srv_num=1&name_op=case&case_id=32674250&case_uid=289d2299-7d0a-447c-8ed8-9ca554915ed2&delo_id=5&new=5';

fetch('https://qhiietjvfuekfaehddox.supabase.co/functions/v1/parse-case', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaWlldGp2ZnVla2ZhZWhkZG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNDY3MTAsImV4cCI6MjA2NTcyMjcxMH0.Ae-xBpuSnLcQpWGC8COR3N_5BAjdJ6cqkzP4rnCJAzA'
  },
  body: JSON.stringify({ url: testUrl })
})
  .then(async (r) => {
    console.log('Status:', r.status);
    const text = await r.text();
    console.log('Body:', text.substring(0, 500));
  })
  .catch(e => console.log('Error:', e.message));
