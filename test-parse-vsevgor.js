import fs from 'fs';
import { JSDOM } from 'jsdom';
import iconv from 'iconv-lite';

// Parse case data - Vsevgorsk format
function parseCaseData(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    let result = {
        number: "Неизвестный номер",
        court: "Неизвестный суд",
        status: "Статус не указан",
        date: "Дата не указана",
        category: "Категория не указана",
        judge: "Судья не указан",
        plaintiff: "Информация скрыта",
        defendant: "Информация скрыта",
        judicialUid: undefined,
        events: []
    };

    // Parse case number
    const caseNumberEl = document.querySelector('.casenumber');
    if (caseNumberEl) {
        result.number = caseNumberEl.textContent.trim();
    }

    // Parse court name from header
    const headingEl = document.querySelector('.heading.heading_caps.heading_title');
    if (headingEl) {
        result.court = headingEl.textContent.trim();
    }

    // Parse case info from cont1 (first tab - main info)
    const cont1 = document.getElementById('cont1');
    if (cont1) {
        const rows = cont1.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const label = cells[0].textContent.trim();
                const value = cells[1].textContent.trim();
                
                if (label.includes('Уникальный идентификатор')) {
                    const link = cells[1].querySelector('a');
                    if (link) {
                        const href = link.getAttribute('href') || '';
                        const match = href.match(/judicial_uid=([^&]+)/i);
                        if (match) {
                            result.judicialUid = match[1];
                        }
                    }
                } else if (label.includes('Дата поступления')) {
                    result.date = value;
                } else if (label.includes('Категория дела')) {
                    result.category = value.replace(/→/g, ' → ').replace(/\s+/g, ' ').trim();
                } else if (label.includes('Судья')) {
                    result.judge = value;
                } else if (label.includes('Результат рассмотрения')) {
                    result.status = value;
                }
            }
        });
    }

    // Parse events from cont2 (history tab)
    const cont2 = document.getElementById('cont2');
    if (cont2) {
        const rows = cont2.querySelectorAll('#tablcont tr');
        rows.forEach((row, index) => {
            if (index > 0) { // Skip header
                const cells = row.querySelectorAll('td');
                if (cells.length >= 7) {
                    const name = cells[0].textContent.trim();
                    const date = cells[1].textContent.trim();
                    const time = cells[2].textContent.trim();
                    const location = cells[3].textContent.trim();
                    const eventResult = cells[4].textContent.trim();
                    const reason = cells[5].textContent.trim();
                    
                    if (date.match(/\d{2}\.\d{2}\.\d{4}/)) {
                        result.events.push({
                            date,
                            time,
                            name,
                            location: location || undefined,
                            result: eventResult || undefined,
                            reason: reason || undefined
                        });
                    }
                }
            }
        });
    }

    // Parse parties from cont3 (participants tab)
    const cont3 = document.getElementById('cont3');
    if (cont3) {
        const rows = cont3.querySelectorAll('#tablcont tr');
        rows.forEach((row, index) => {
            if (index > 0) { // Skip header
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const type = cells[0].textContent.trim().toUpperCase();
                    const name = cells[1].textContent.trim();
                    
                    if (type.includes('ИСТЕЦ') || type.includes('ЗАЯВИТЕЛЬ')) {
                        result.plaintiff = name || 'Информация скрыта';
                    } else if (type.includes('ОТВЕТЧИК')) {
                        result.defendant = name || 'Информация скрыта';
                    }
                }
            }
        });
    }

    return result;
}

// Main - read as buffer and decode from windows-1251
const htmlBuffer = fs.readFileSync('./test-data-vsevgor.html');
const html = iconv.decode(htmlBuffer, 'win1251');

console.log('=== PARSING VSEVGORSK CASE ===\n');

const result = parseCaseData(html);

console.log('Parsed result:');
console.log(JSON.stringify(result, null, 2));

console.log('\n=== EXTRACTED DATA ===');
console.log('Case Number:', result.number);
console.log('Court:', result.court);
console.log('Date Received:', result.date);
console.log('Category:', result.category);
console.log('Judge:', result.judge);
console.log('Judicial UID:', result.judicialUid);
console.log('Plaintiff:', result.plaintiff);
console.log('Defendant:', result.defendant);

console.log('\nEvents:');
result.events.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.date} ${e.time || ''} - ${e.name}`);
    if (e.result) console.log(`     Result: ${e.result}`);
});
