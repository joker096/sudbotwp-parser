import fetch from 'node-fetch';

const url = 'https://spb.sudrf.ru/modules.php?name=sud_delo&srv_num=1&name_op=case&case_id=32674250&case_uid=289d2299-7d0a-447c-8ed8-9ca554915ed2&delo_id=5&new=5';

async function testParse() {
  try {
    console.log('Testing URL:', url);
    
    const response = await fetch('http://localhost:3000/parse-case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Parsed data:', JSON.stringify(data, null, 2));
    
    // Check if court name is correct
    if (data.court === 'Санкт-Петербургский городской суд') {
      console.log('\n✓ Court name parsing successful');
    } else {
      console.log(`\n✗ Court name parsing failed. Expected 'Санкт-Петербургский городской суд', got '${data.court}'`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testParse();
