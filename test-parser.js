import fetch from 'node-fetch';

const testUrl = 'https://vsevgorsud--lo.sudrf.ru/modules.php?name=sud_delo&srv_num=1&name_op=case&case_id=297983800&case_uid=38ee4250-0857-4aed-bb67-a5f45cf26211&delo_id=1540005';

async function test() {
  console.log('Testing parser with URL:', testUrl);
  console.log('Starting test...');
  
  try {
    const response = await fetch('http://localhost:3000/parse-case', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
