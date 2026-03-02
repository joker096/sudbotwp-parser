import * as cheerio from 'cheerio';

function testCourtDetection() {
  // Create test data for different URL variations
  const testCases = [
    {
      url: 'https://oblsud--lo.sudrf.ru/modules.php?name=sud_delo&case_id=123',
      expectedCourt: 'Ленинградский областной суд',
      description: 'Double hyphen URL'
    },
    {
      url: 'https://oblsud-lo.sudrf.ru/modules.php?name=sud_delo&case_id=123',
      expectedCourt: 'Ленинградский областной суд',
      description: 'Single hyphen URL'
    },
    {
      url: 'https://oblsud.sudrf.ru/modules.php?name=sud_delo&case_id=123',
      expectedCourt: 'Ленинградский областной суд',
      description: 'No hyphen URL'
    },
    {
      url: 'https://lo.sudrf.ru/modules.php?name=sud_delo&case_id=123',
      expectedCourt: 'Ленинградский областной суд',
      description: 'Short URL'
    },
    {
      url: 'https://spb.sudrf.ru/modules.php?name=sud_delo&case_id=123',
      expectedCourt: 'Санкт-Петербургский городской суд',
      description: 'SPB court'
    },
    {
      url: 'https://msk.sudrf.ru/modules.php?name=sud_delo&case_id=123',
      expectedCourt: 'Московский городской суд',
      description: 'Moscow court'
    },
    {
      url: 'https://vsevgorsud--lo.sudrf.ru/modules.php?name=sud_delo&case_id=123',
      expectedCourt: 'Всеволожский городской суд Ленинградской области',
      description: 'Vsevolozhsk court'
    },
    {
      url: 'https://krasnogorsk--mo.sudrf.ru/modules.php?name=sud_delo&case_id=123',
      expectedCourt: 'Красногорский городской суд Московской области',
      description: 'Krasnogorsk court'
    }
  ];

  console.log('=== Court Detection Test ===\n');
  let passed = 0;

  testCases.forEach((test, index) => {
    try {
      const hostname = new URL(test.url).hostname;
      const sub = hostname.split('.')[0];
      
      const courtMap = {
        'vsevgorsud--lo': 'Всеволожский городской суд Ленинградской области',
        'vsevgorsud-lo': 'Всеволожский городской суд Ленинградской области',
        'vsevgorsud': 'Всеволожский городской суд',
        'krasnogorsk--mo': 'Красногорский городской суд Московской области',
        'krasnogorsk-mo': 'Красногорский городской суд Московской области',
        'krasnogorsk': 'Красногорский городской суд',
        'nvs--spb': 'Новгородский областной суд',
        'nvs-spb': 'Новгородский областной суд',
        'novgorod': 'Новгородский областной суд',
        'nnov': 'Нижегородский областной суд',
        'spb': 'Санкт-Петербургский городской суд',
        'msk': 'Московский городской суд',
        'oblsud--lo': 'Ленинградский областной суд',
        'oblsud-lo': 'Ленинградский областной суд',
        'oblsud': 'Ленинградский областной суд',
        'lo': 'Ленинградский областной суд',
      };
      
      const normalizedSub = sub.replace(/[-]+/g, '-').toLowerCase();
      
      let court = "Неизвестный суд";
      
      if (courtMap[normalizedSub]) {
        court = courtMap[normalizedSub];
      } else if (normalizedSub.includes('oblsud')) {
        court = 'Ленинградский областной суд';
      } else if (normalizedSub.includes('sud')) {
        const cleanName = normalizedSub.replace(/-/g, ' ').replace(/sud$/i, '').trim();
        if (cleanName.length > 2) {
          court = cleanName.charAt(0).toUpperCase() + cleanName.slice(1) + ' суд';
        }
      }

      const isPassed = court === test.expectedCourt;
      
      if (isPassed) {
        passed++;
      }
      
      console.log(`${index + 1}. ${test.description}: ${isPassed ? '✓ PASSED' : '✗ FAILED'}`);
      if (!isPassed) {
        console.log(`   Expected: ${test.expectedCourt}`);
        console.log(`   Got: ${court}\n`);
      }
      
    } catch (error) {
      console.log(`${index + 1}. ${test.description}: ✗ FAILED (${error.message})\n`);
    }
  });

  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${passed} / ${testCases.length}`);
  console.log(`Failed: ${testCases.length - passed}`);
  
  if (passed === testCases.length) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed!');
  }
}

testCourtDetection();
