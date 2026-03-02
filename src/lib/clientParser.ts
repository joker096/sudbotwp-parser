/**
 * Клиентский парсер судебных дел
 * Выполняется в браузере пользователя — обходит блокировки IP серверов
 */

import * as cheerio from 'cheerio';

// Decode windows-1251 to utf-8
function decodeWindows1251(buffer: Uint8Array): string {
  const decoder = new TextDecoder('windows-1251');
  return decoder.decode(buffer);
}

export interface ParsedCaseData {
  number: string;
  court: string;
  status: string;
  date: string;
  category: string;
  judge: string;
  plaintiff: string;
  defendant: string;
  link: string;
  judicialUid?: string;
  events: Array<{
    date: string;
    time: string;
    name: string;
    location?: string;
    result?: string;
    reason?: string;
    datePosted?: string;
  }>;
  appeals: Array<{
    id: number;
    type: string;
    applicant: string;
    court: string;
    date: string;
    result: string;
  }>;
}

// Map subdomain to court name
const courtMap: Record<string, string> = {
  'vsevgorsud--lo': 'Всеволожский городской суд Ленинградской области',
  'vsevgorsud': 'Всеволожский городской суд',
  'krasnogorsk--mo': 'Красногорский городской суд Московской области',
  'lyubercy--mo': 'Люберецкий городской суд Московской области',
  'balashiha--mo': 'Балашихинский городской суд Московской области',
  'himki--mo': 'Химкинский городской суд Московской области',
  'podolsk--mo': 'Подольский городской суд Московской области',
  'odintsovo--mo': 'Одинцовский городской суд Московской области',
  'lenobl': 'Ленинградский областной суд',
  'oblsud--lo': 'Ленинградский областной суд',
  'oblsud-lo': 'Ленинградский областной суд',
  'oblsud': 'Ленинградский областной суд',
  'lo': 'Ленинградский областной суд',
  'mosobl': 'Московский областной суд',
  'mos-sud': 'Московский городской суд',
  'gorod--saratov': 'Саратовский городской суд',
  'krasnodar--ap': 'Краснодарский краевой суд',
  'rostov--ap': 'Ростовский областной суд',
  'novosibirsk--ap': 'Новосибирский областной суд',
  'ekb--so': 'Свердловский областной суд',
  'perm--ap': 'Пермский краевой суд',
  'voronezh--ob': 'Воронежский областной суд',
  'kazan--ob': 'Верховный суд Республики Татарстан',
  'samara--ob': 'Самарский областной суд',
};

function detectCourtFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const sub = hostname.split('.')[0];
    const normalizedSub = sub.replace(/[-]+/g, '-').toLowerCase();
    const normalizedSub2 = sub.replace(/-/g, ' ').toLowerCase();
    
    if (courtMap[normalizedSub]) {
      return courtMap[normalizedSub];
    } else if (courtMap[normalizedSub2]) {
      return courtMap[normalizedSub2];
    } else if (normalizedSub.includes('oblsud')) {
      return 'Ленинградский областной суд';
    } else if (normalizedSub.includes('sud')) {
      const courtName = normalizedSub
        .replace(/-/g, ' ')
        .replace(/^\s*\S+\s+/, '')
        .replace(/sud$/i, 'суд')
        .trim();
      return courtName ? courtName.toUpperCase() : 'Суд Российской Федерации';
    }
  } catch (e) {
    console.error('Error detecting court:', e);
  }
  return 'Неизвестный суд';
}

export async function parseCaseClient(url: string): Promise<ParsedCaseData> {
  console.log('Client-side parsing:', url);
  
  try {
    // Пробуем сделать запрос с браузера пользователя
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const html = decodeWindows1251(new Uint8Array(buffer));
    
    return parseCaseHtml(html, url);
    
  } catch (error: any) {
    console.error('Client parsing failed:', error);
    
    // Если ошибка CORS — пробрасываем специальную ошибку
    if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
      throw new Error('CORS_BLOCKED');
    }
    
    throw error;
  }
}

export function parseCaseHtml(html: string, url: string): ParsedCaseData {
  const $ = cheerio.load(html);
  
  let number = 'Неизвестный номер';
  let court = detectCourtFromUrl(url);
  
  // Parse court name from page heading (overrides URL detection)
  const headingElement = $('.heading.heading_caps.heading_title');
  if (headingElement.length) {
    const headingText = headingElement.text().trim();
    if (headingText && headingText.length > 5) {
      court = headingText;
    }
  }
  
  let status = 'Статус не указан';
  let date = 'Дата не указана';
  let category = 'Категория не указана';
  let judge = 'Судья не указан';
  let plaintiff = 'Информация скрыта';
  let defendant = 'Информация скрыта';
  let judicialUid = undefined;

  // Parse case number
  const caseNumberElement = $('.casenumber');
  if (caseNumberElement.length) {
    number = caseNumberElement.text().trim();
  } else {
    const caseNumberMatch = html.match(/№\s*([\d\-\/\(\)\w~]+)/i) || 
                            html.match(/ДЕЛО №\s*([^<\n]+)/i);
    if (caseNumberMatch) {
      number = caseNumberMatch[1].trim();
    }
  }

  // Parse from main info table
  $('#cont1 #tablcont tr, #cont1 table tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2) {
      const label = cells.eq(0).text().trim();
      const value = cells.eq(1).text().trim();
      if (label.includes('Дата поступления')) date = value;
      if (label.includes('Категория дела')) category = value.replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
      if (label.includes('Судья')) judge = value;
      if (label.includes('Результат рассмотрения')) status = value;
      if (label.includes('Уникальный идентификатор')) {
        // Try to get from link href
        const link = cells.eq(1).find('a');
        if (link.length) {
          const href = link.attr('href') || '';
          const uidMatch = href.match(/judicial_uid=([^&]+)/i);
          if (uidMatch) judicialUid = uidMatch[1];
        }
        // Fallback to text content
        if (!judicialUid) {
          const uidMatch = value.match(/^\d{2}[A-Z0-9]+-\d{4}-\d+$/i);
          if (uidMatch) judicialUid = value;
        }
      }
    }
  });

  // Parse parties
  $('#cont3 #tablcont tr, #cont3 table tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2) {
      const type = cells.eq(0).text().trim().toUpperCase();
      const name = cells.eq(1).text().trim();
      if (type.includes('ИСТЕЦ') && !name.toUpperCase().includes('ИСТЕЦ')) plaintiff = name;
      if (type.includes('ОТВЕТЧИК') && !name.toUpperCase().includes('ОТВЕТЧИК')) defendant = name;
    }
  });

  // Parse events
  const events: ParsedCaseData['events'] = [];
  $('#cont2 #tablcont tr, #cont2 table tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2 && index > 0) {
      const dateText = cells.eq(1).text().trim();
      if (dateText.match(/\d{2}\.\d{2}\.\d{4}/)) {
        events.push({
          date: dateText,
          time: cells.eq(2).text().trim() || '',
          name: cells.eq(0).text().trim() || 'Судебное событие',
          location: cells.eq(3).text().trim() || undefined,
          result: cells.eq(4).text().trim() || undefined,
        });
      }
    }
  });

  // Parse appeals
  const appeals: ParsedCaseData['appeals'] = [];
  $('#cont4 #tablcont tr, #cont4 table tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2) {
      const label = cells.eq(0).text().trim().toLowerCase();
      const value = cells.eq(1).text().trim();
      
      if (label.includes('вид жалобы')) {
        appeals.push({
          id: appeals.length + 1,
          type: value || 'Жалоба',
          applicant: 'Информация скрыта',
          court: 'Вышестоящий суд',
          date: '',
          result: 'В рассмотрении',
        });
      }
    }
  });

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
    events: events.length > 0 ? events : [{ 
      date: date || 'Дата не указана', 
      time: '', 
      name: 'Судебное событие', 
      result: status 
    }],
    appeals: appeals.length > 0 ? appeals : [{ 
      id: 1, 
      type: 'Нет данных об обжаловании', 
      applicant: 'Информация скрыта', 
      court: '', 
      date: '', 
      result: '' 
    }],
  };
}
