const testUrl = 'https://oblsud--lo.sudrf.ru/modules.php?name=sud_delo&srv_num=1&name_op=case&case_id=32674250&case_uid=289d2299-7d0a-447c-8ed8-9ca554915ed2&delo_id=5&new=5';

fetch('http://localhost:3000/parse-case', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ url: testUrl })
})
  .then(async (r) => {
    console.log('Status:', r.status);
    const text = await r.text();
    console.log('Body:', text.substring(0, 500));
  })
  .catch(e => console.log('Error:', e.message));
