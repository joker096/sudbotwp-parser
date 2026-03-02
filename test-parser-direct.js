// Direct parser test with local HTML data
import * as cheerio from 'cheerio';
import fs from 'fs';
import { TextDecoder } from 'util';

function decodeWindows1251(buffer) {
  const decoder = new TextDecoder('windows-1251');
  return decoder.decode(buffer);
}

// Parse case data from HTML
function parseCaseData(html, url) {
  const $ = cheerio.load(html);
  let number = "Неизвестный номер";
  let court = "Неизвестный суд";
  let status = "Статус не указан";
  let date = "Дата не указана";
  let category = "Категория не указана";
  let judge = "Судья не указан";
  let plaintiff = "Информация скрыта";
  let defendant = "Информация скрыта";
  let judicialUid = undefined;

  // Parse case number
  const caseNumberElement = $('.casenumber');
  if (caseNumberElement.length) {
    number = caseNumberElement.text().trim();
  } else {
    const caseNumberMatch = html.match(/№\s*(\d+[-/]?\d*[-/]?\d*)/i) || 
                            html.match(/ДЕЛО №\s*([^<\n]+)/i) ||
                            html.match(/case_num=(\d+)/i);
    if (caseNumberMatch) {
      number = caseNumberMatch[1].trim();
    }
  }

  // Parse court from URL
  if (url.includes('sudrf.ru')) {
    try {
      const hostname = new URL(url).hostname;
      const sub = hostname.split('.')[0];
      const courtMap = {
        'vsevgorsud--lo': 'Всеволожский городской суд Ленинградской области',
        'vsevgorsud': 'Всеволожский городской суд',
        'oblsud--lo': 'Ленинградский областной суд',
        'oblsud-lo': 'Ленинградский областной суд',
        'oblsud': 'Ленинградский областной суд',
      };
      const normalizedSub = sub.replace(/[-]+/g, '-').toLowerCase();
      if (courtMap[normalizedSub]) {
        court = courtMap[normalizedSub];
      } else if (normalizedSub.includes('oblsud')) {
        court = 'Ленинградский областной суд';
      }
    } catch (e) {}
  }

  // Find containers
  const containers = $('[id^="cont"], .sud-block, .case-section, .info-block, #cont, #cont1, #cont2, #cont3, #cont4');
  
  const getContainerType = (container) => {
    const text = container.text().toLowerCase();
    const htmlLower = container.html()?.toLowerCase() || '';
    
    if (htmlLower.includes('наименование события') || 
        htmlLower.includes('дата размещения') ||
        (htmlLower.includes('дата') && htmlLower.includes('время'))) {
      return 'events';
    }
    
    if (text.includes('рассмотрение в нижестоящем суде')) return 'lowerCourt';
    if (text.includes('дело') && (text.includes('уникальный идентификатор') || text.includes('дата поступления'))) return 'caseInfo';
    if (text.includes('движение дела') || text.includes('история дела')) return 'events';
    if (text.includes('обжалование') || text.includes('жалобы')) return 'appeals';
    if (text.includes('стороны по делу') || text.includes('истец') || text.includes('ответчик')) return 'parties';
    return 'unknown';
  };

  // Parse case info
  const caseInfoContainer = containers.filter((i, el) => getContainerType($(el)) === 'caseInfo');
  if (caseInfoContainer.length > 0) {
    let caseInfoTable = caseInfoContainer.find('#tablcont');
    if (caseInfoTable.length === 0) caseInfoTable = caseInfoContainer.find('table');
    if (caseInfoTable.length > 0) {
      caseInfoTable.find('tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 2) {
          const label = cells.eq(0).text().trim();
          const value = cells.eq(1).text().trim();
          
          if (label.includes('Дата поступления')) date = value;
          else if (label.includes('Категория дела')) category = value.replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
          else if (label.includes('Судья')) judge = value;
          else if (label.includes('Результат рассмотрения')) status = value;
          else if (label.includes('Уникальный идентификатор')) {
            const uidLink = cells.eq(1).find('a').attr('href');
            if (uidLink) {
              const uidMatch = uidLink.match(/judicial_uid=([^&]+)/i);
              if (uidMatch) judicialUid = uidMatch[1];
            }
            if (!judicialUid) {
              const uidText = cells.eq(1).text().trim();
              if (uidText && uidText.match(/^\d{2}[A-Z0-9]+-\d{4}-\d+$/i)) {
                judicialUid = uidText;
              }
            }
          }
        }
      });
    }
  }

  // Parse parties
  const partiesContainer = containers.filter((i, el) => getContainerType($(el)) === 'parties');
  if (partiesContainer.length > 0) {
    let partiesTable = partiesContainer.find('#tablcont');
    if (partiesTable.length === 0) partiesTable = partiesContainer.find('table');
    if (partiesTable.length > 0) {
      partiesTable.find('tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 2) {
          const type = cells.eq(0).text().trim().toUpperCase();
          const name = cells.eq(1).text().trim();
          if (type.includes('ИСТЕЦ') && name !== 'ИСТЕЦ') plaintiff = name;
          if (type.includes('ОТВЕТЧИК') && name !== 'ОТВЕТЧИК') defendant = name;
        }
      });
    }
  }

  // Parse events using header detection
  const events = [];
  $('table').each((tableIdx, tableEl) => {
    const tableHtml = $(tableEl).html()?.toLowerCase() || '';
    const tableText = $(tableEl).text();
    
    if (tableHtml.includes('наименование события') || 
        (tableHtml.includes('дата') && tableHtml.includes('время') && tableHtml.includes('событие'))) {
      
      let headerIndices = {};
      let headerRowFound = false;
      
      $(tableEl).find('tr').each((rowIdx, rowEl) => {
        if (headerRowFound) return;
        const headerCells = $(rowEl).find('th, td');
        if (headerCells.length >= 3) {
          headerCells.each((cellIdx, cellEl) => {
            const headerText = $(cellEl).text().trim().toLowerCase();
            if (headerText.includes('наименование') || headerText.includes('событие')) {
              headerIndices['name'] = cellIdx;
              headerRowFound = true;
            } else if (headerText.includes('дата') && !headerText.includes('размещения')) {
              headerIndices['date'] = cellIdx;
              headerRowFound = true;
            } else if (headerText.includes('время')) {
              headerIndices['time'] = cellIdx;
              headerRowFound = true;
            } else if (headerText.includes('место')) {
              headerIndices['location'] = cellIdx;
            } else if (headerText.includes('результат')) {
              headerIndices['result'] = cellIdx;
            }
          });
        }
      });
      
      if (headerRowFound && Object.keys(headerIndices).length > 0) {
        let headerRowIdx = -1;
        $(tableEl).find('tr').each((rowIdx, rowEl) => {
          const headerCells = $(rowEl).find('th, td');
          let hasHeaderKeyword = false;
          headerCells.each((cellIdx, cellEl) => {
            const headerText = $(cellEl).text().trim().toLowerCase();
            if (headerText.includes('наименование') || headerText.includes('дата') || 
                headerText.includes('время') || headerText.includes('результат')) {
              hasHeaderKeyword = true;
              return false;
            }
          });
          if (hasHeaderKeyword) {
            headerRowIdx = rowIdx;
            return false;
          }
        });
        
        $(tableEl).find('tr').each((rowIdx, rowEl) => {
          if (rowIdx <= headerRowIdx) return;
          const cells = $(rowEl).find('td');
          if (cells.length >= 2) {
            const dateText = headerIndices['date'] !== undefined 
              ? cells.eq(headerIndices['date']).text().trim() 
              : cells.eq(1).text().trim();
            if (dateText && dateText.match(/\d{2}\.\d{2}\.\d{4}/)) {
              events.push({
                date: dateText,
                time: headerIndices['time'] !== undefined 
                  ? cells.eq(headerIndices['time']).text().trim() 
                  : cells.eq(2).text().trim() || '',
                name: headerIndices['name'] !== undefined 
                  ? cells.eq(headerIndices['name']).text().trim() 
                  : cells.eq(0).text().trim() || 'Судебное событие',
                location: headerIndices['location'] !== undefined 
                  ? cells.eq(headerIndices['location']).text().trim() || undefined 
                  : undefined,
                result: headerIndices['result'] !== undefined 
                  ? cells.eq(headerIndices['result']).text().trim() || undefined 
                  : undefined,
              });
            }
          }
        });
      }
    }
  });

  // Parse appeals
  const appeals = [];
  const appealsContainer = containers.filter((i, el) => getContainerType($(el)) === 'appeals');
  if (appealsContainer.length > 0) {
    const appealsTable = appealsContainer.find('#tablcont');
    if (appealsTable.length > 0) {
      let currentAppeal = { type: '', applicant: '', court: '', date: '', result: '' };
      
      appealsTable.find('tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 2) {
          const label = cells.eq(0).text().trim().toLowerCase();
          const value = cells.eq(1).text().trim();
          
          if (label.includes('вид жалобы')) currentAppeal.type = value;
          else if (label.includes('заявитель')) currentAppeal.applicant = value;
          else if (label.includes('вышестоящий суд')) currentAppeal.court = value;
          else if (label.includes('дата подачи')) currentAppeal.date = value;
          else if (label.includes('результат') && value.length > 2) currentAppeal.result = value;
        }
        
        if (currentAppeal.type && currentAppeal.applicant) {
          appeals.push({
            id: appeals.length + 1,
            type: currentAppeal.type,
            applicant: currentAppeal.applicant,
            court: currentAppeal.court || "Вышестоящий суд",
            date: currentAppeal.date || "",
            result: currentAppeal.result || "В рассмотрении"
          });
          currentAppeal = { type: '', applicant: '', court: '', date: '', result: '' };
        }
      });
    }
  }

  return {
    number,
    court,
    status,
    date,
    category,
    judge,
    plaintiff,
    defendant,
    link: url,
    judicialUid,
    events: events.length > 0 ? events : [{ date: "Дата не указана", time: "", name: "Судебное событие", result: "" }],
    appeals: appeals.length > 0 ? appeals : [{ id: 1, type: "Жалоба", applicant: "Информация скрыта", court: "Неизвестный суд", date: "", result: "" }]
  };
}

// Test with local HTML file
async function testParseLocal() {
  console.log('=== Testing Parser with Local HTML Data ===\n');
  
  try {
    const html = fs.readFileSync('test-data1.html', 'utf8');
    const testUrl = 'https://vsevgorsud--lo.sudrf.ru/modules.php?name=sud_delo&case_id=256537282&delo_id=1540005';
    
    console.time('Parse time');
    const result = parseCaseData(html, testUrl);
    console.timeEnd('Parse time');
    
    console.log('\n=== Parsed Case Data ===');
    console.log('Case Number:', result.number);
    console.log('Court:', result.court);
    console.log('Status:', result.status);
    console.log('Date:', result.date);
    console.log('Category:', result.category);
    console.log('Judge:', result.judge);
    console.log('Plaintiff:', result.plaintiff);
    console.log('Defendant:', result.defendant);
    console.log('Judicial UID:', result.judicialUid);
    console.log('\nEvents count:', result.events.length);
    result.events.slice(0, 3).forEach((e, i) => {
      console.log(`  ${i+1}. ${e.date} ${e.time} - ${e.name.substring(0, 50)}...`);
    });
    console.log('\nAppeals count:', result.appeals.length);
    result.appeals.slice(0, 3).forEach((a, i) => {
      console.log(`  ${i+1}. ${a.type} - ${a.applicant}`);
    });
    
    // Validation
    console.log('\n=== Validation ===');
    const checks = [
      ['Case number exists', result.number && result.number !== 'Неизвестный номер'],
      ['Court detected', result.court && result.court !== 'Неизвестный суд'],
      ['Date parsed', result.date && result.date !== 'Дата не указана'],
      ['Category parsed', result.category && result.category !== 'Категория не указана'],
      ['Judge parsed', result.judge && result.judge !== 'Судья не указан'],
      ['Judicial UID parsed', result.judicialUid !== undefined],
      ['Events parsed', result.events.length > 0],
      ['Appeals parsed', result.appeals.length > 0],
    ];
    
    let passed = 0;
    checks.forEach(([name, check]) => {
      const status = check ? '✅' : '❌';
      console.log(`${status} ${name}`);
      if (check) passed++;
    });
    console.log(`\n${passed}/${checks.length} checks passed`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testParseLocal();
