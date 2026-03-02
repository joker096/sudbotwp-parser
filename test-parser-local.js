import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

// Мок для cheerio (в браузере используется через CDN)
function mockCheerio(html) {
    const dom = new JSDOM(html);
    const $ = (selector, context = dom.window.document) => {
        const elements = context.querySelectorAll(selector);
        const wrapped = {
            length: elements.length,
            text: () => Array.from(elements).map(el => el.textContent).join(''),
            find: (sel) => {
                const results = [];
                elements.forEach(el => {
                    const found = el.querySelectorAll(sel);
                    results.push(...found);
                });
                return $(sel, results);
            },
            each: (callback) => {
                elements.forEach(callback);
                return wrapped;
            },
            eq: (index) => $(selector, [elements[index]]),
            attr: (name) => {
                if (elements.length > 0) {
                    return elements[0].getAttribute(name);
                }
                return null;
            },
            trim: () => wrapped
        };
        return wrapped;
    };
    return $;
}

// Функция для парсинга, адаптированная под Node.js
function parseCaseData(html) {
    const $ = mockCheerio(html);
    let number = "Неизвестный номер";
    let court = "Неизвестный суд";
    let status = "Статус не указан";
    let date = "Дата не указана";
    let category = "Категория не указана";
    let judge = "Судья не указан";
    let plaintiff = "Информация скрыта";
    let defendant = "Информация скрыта";
    let judicialUid = undefined;

    // Парсинг номера дела
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

    // Парсинг суда из HTML
    const courtFromHtml = $('.heading.heading_caps.heading_title, .heading_caps.heading_title, .court-name, h1.court, .sud-info .name');
    if (courtFromHtml.length) {
        let htmlCourt = courtFromHtml.text().trim();
        htmlCourt = htmlCourt.replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>').replace(/\s+/g, ' ').trim();
        if (htmlCourt && htmlCourt.length > 5) {
            court = htmlCourt;
        }
    }

    // Поиск контейнеров contX
    const containers = [];
    const dom = new JSDOM(html);
    const document = dom.window.document;
    document.querySelectorAll('[id^="cont"]').forEach(el => {
        containers.push(el);
    });

    // Функция для определения типа контейнера
    const getContainerType = (container) => {
        const text = container.textContent.toLowerCase();
        if (text.includes('рассмотрение в нижестоящем суде')) {
            return 'lowerCourt';
        } else if (text.includes('дело') && (text.includes('уникальный идентификатор') || text.includes('дата поступления') || text.includes('категория дела'))) {
            return 'caseInfo';
        } else if (text.includes('движение дела')) {
            return 'events';
        } else if (text.includes('обжалование') || text.includes('жалобы')) {
            return 'appeals';
        } else if (text.includes('стороны по делу') || text.includes('участники') || text.includes('истец') || text.includes('ответчик')) {
            return 'parties';
        }
        return 'unknown';
    };

    // Парсинг информации о деле из контейнера caseInfo
    const caseInfoContainer = containers.find(el => getContainerType(el) === 'caseInfo');
    if (caseInfoContainer) {
        const tables = caseInfoContainer.querySelectorAll('#tablcont');
        if (tables.length > 0) {
            const caseInfoTable = tables[0];
            const rows = caseInfoTable.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const label = cells[0].textContent.trim();
                    const value = cells[1].textContent.trim();
                    
                    if (label.includes('Дата поступления')) {
                        date = value;
                    } else if (label.includes('Категория дела')) {
                        category = value.replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
                    } else if (label.includes('Судья')) {
                        judge = value;
                    } else if (label.includes('Результат рассмотрения')) {
                        status = value;
                    } else if (label.includes('Уникальный идентификатор')) {
                        const uidLink = cells[1].querySelector('a');
                        if (uidLink) {
                            const uidMatch = uidLink.getAttribute('href').match(/judicial_uid=([^&]+)/i);
                            if (uidMatch) {
                                judicialUid = uidMatch[1];
                            }
                        }
                        if (!judicialUid) {
                            const uidText = cells[1].textContent.trim();
                            if (uidText && uidText.match(/^\d{2}[A-Z0-9]+-\d{4}-\d+$/i)) {
                                judicialUid = uidText;
                            }
                        }
                    }
                }
            });
        }
    }

    // Парсинг событий
    const events = [];
    const eventsContainer = containers.find(el => getContainerType(el) === 'events');
    if (eventsContainer) {
        const tables = eventsContainer.querySelectorAll('#tablcont');
        if (tables.length > 0) {
            const rows = tables[0].querySelectorAll('tr');
            rows.forEach((row, index) => {
                if (index > 0) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const dateText = cells[1].textContent.trim();
                        if (dateText.match(/\d{2}\.\d{2}\.\d{4}/)) {
                            events.push({
                                date: dateText,
                                time: cells[2].textContent.trim(),
                                name: cells[0].textContent.trim(),
                                location: cells[3].textContent.trim() || undefined,
                                result: cells[4].textContent.trim() || undefined,
                                reason: cells[5].textContent.trim() || undefined
                            });
                        }
                    }
                }
            });
        }
    }

    // Парсинг сторон дела
    const partiesContainer = containers.find(el => getContainerType(el) === 'parties');
    if (partiesContainer) {
        const tables = partiesContainer.querySelectorAll('#tablcont');
        if (tables.length > 0) {
            const rows = tables[0].querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const type = cells[0].textContent.trim().toUpperCase();
                    const name = cells[1].textContent.trim();
                    
                    if (type.includes('ИСТЕЦ')) {
                        if (name && name !== 'ИСТЕЦ' && !name.toUpperCase().includes('ИСТЕЦ') && name !== 'Информация скрыта' && name.trim() !== '') {
                            plaintiff = name;
                        } else {
                            plaintiff = 'Информация скрыта';
                        }
                    } else if (type.includes('ОТВЕТЧИК')) {
                        if (name && name !== 'ОТВЕТЧИК' && !name.toUpperCase().includes('ОТВЕТЧИК') && name !== 'Информация скрыта' && name.trim() !== '') {
                            defendant = name;
                        } else {
                            defendant = 'Информация скрыта';
                        }
                    } else if (type.includes('ЗАЯВИТЕЛЬ')) {
                        if (name && name !== 'ЗАЯВИТЕЛЬ' && !name.toUpperCase().includes('ЗАЯВИТЕЛЬ') && name !== 'Информация скрыта' && name.trim() !== '') {
                            plaintiff = name;
                        } else {
                            plaintiff = 'Информация скрыта';
                        }
                    }
                }
            });
        }
    }

    // Парсинг обжалования
    const appeals = [];
    const appealsContainer = containers.find(el => getContainerType(el) === 'appeals');
    if (appealsContainer) {
        const tables = appealsContainer.querySelectorAll('#tablcont');
        if (tables.length > 0) {
            const appealBlocks = [];
            
            tables[0].querySelectorAll('table').forEach(table => {
                if (table.textContent.includes('ЖАЛОБА') || table.textContent.includes('Вид жалобы')) {
                    appealBlocks.push(table);
                }
            });
            
            if (appealBlocks.length === 0) {
                appealBlocks.push(tables[0]);
            }
            
            appealBlocks.forEach(block => {
                const currentAppeal = { type: '', applicant: '', court: '', date: '', result: '' };
                
                block.querySelectorAll('tr').forEach(row => {
                    const cells = row.querySelectorAll('td');
                    
                    if (cells.length >= 2) {
                        const label = cells[0].textContent.trim().toLowerCase();
                        const value = cells[1].textContent.trim();
                        
                        if (label.includes('вид жалобы') || label.includes('тип')) {
                            currentAppeal.type = value;
                        } else if (label.includes('заявитель')) {
                            currentAppeal.applicant = value;
                        } else if (label.includes('вышестоящий суд')) {
                            currentAppeal.court = value;
                        } else if (label.includes('дата подачи') || (label.includes('дата') && /\d{2}\.\d{2}\.\d{4}/.test(value))) {
                            currentAppeal.date = value;
                        } else if (label.includes('результат') && value.length > 2 && !value.toLowerCase().includes('событие')) {
                            currentAppeal.result = value;
                        }
                    }
                });
                
                if (currentAppeal.type || currentAppeal.applicant || currentAppeal.court || currentAppeal.date) {
                    appeals.push({
                        id: appeals.length + 1,
                        type: currentAppeal.type || "Жалоба",
                        applicant: currentAppeal.applicant || "Информация скрыта",
                        court: currentAppeal.court || "Вышестоящий суд",
                        date: currentAppeal.date || "",
                        result: currentAppeal.result || "В рассмотрении"
                    });
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
        link: 'local-test',
        judicialUid,
        events: events.length > 0 ? events : [
            { 
                date: "Дата не указана", 
                time: "Время не указано", 
                name: "Судебное событие", 
                result: "" 
            }
        ],
        appeals: appeals.length > 0 ? appeals : [
            { 
                id: 1, 
                type: "Жалоба", 
                applicant: "Информация скрыта", 
                court: "Неизвестный суд", 
                date: "Дата не указана", 
                result: "Результат не указан" 
            }
        ]
    };
}

// Примеры HTML для тестирования
const testHtml1 = fs.readFileSync('test-data1.html', 'utf8');
const testHtml2 = fs.readFileSync('test-data2.html', 'utf8');

console.log('=== Тестирование HTML 1 ===');
const result1 = parseCaseData(testHtml1);
console.log(JSON.stringify(result1, null, 2));

console.log('\n=== Тестирование HTML 2 ===');
const result2 = parseCaseData(testHtml2);
console.log(JSON.stringify(result2, null, 2));
