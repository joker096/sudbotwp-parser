/**
 * Сервер парсинга судебных дел
 * Запускается как отдельный процесс и проксируется через nginx
 * Использует cheerio для парсинга HTML (windows-1251 кодировка)
 */

import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

// Parse court case from URL
async function parseCase(url) {
  console.log('[Parse] Fetching:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      timeout: 60000,
      responseType: 'arraybuffer',
    });

    // Суды возвращают windows-1251
    const buffer = Buffer.from(response.data);
    const html = iconv.decode(buffer, 'win1251');

    return parseHtml(html, url);
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Превышен таймаут ожидания. Сайт суда работает медленно.');
    }
    if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    }
    throw error;
  }
}

function parseHtml(html, url) {
  const $ = cheerio.load(html);

  let number = 'Неизвестный номер';
  let court = detectCourt(url);

  // Название суда из страницы
  const heading = $('.heading.heading_caps.heading_title').text().trim();
  if (heading && heading.length > 5) {
    court = heading;
  }

  let status = 'Статус не указан';
  let date = 'Дата не указана';
  let category = 'Категория не указана';
  let judge = 'Судья не указан';
  let plaintiff = 'Информация скрыта';
  let defendant = 'Информация скрыта';
  let judicial_uid = undefined;

  // Номер дела
  const caseNum = $('.casenumber').text().trim();
  if (caseNum) {
    number = caseNum;
  } else {
    const m = html.match(/№\s*([\d\-\/\(\)\w~]+)/i) || html.match(/ДЕЛО №\s*([^<\n]+)/i);
    if (m) number = m[1].trim();
  }

  // Таблица #cont1 — основная информация
  $('#cont1 #tablcont tr, #cont1 table tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length >= 2) {
      const label = cells.eq(0).text().trim();
      const value = cells.eq(1).text().trim();
      if (label.includes('Дата поступления')) date = value;
      if (label.includes('Категория')) category = value.replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
      if (label.includes('Судья')) judge = value;
      if (label.includes('Результат')) status = value;
      if (label.includes('Уникальный идентификатор')) {
        const link = cells.eq(1).find('a');
        if (link.length) {
          const m = link.attr('href')?.match(/judicial_uid=([^&]+)/i);
          if (m) judicial_uid = m[1];
        }
        if (!judicial_uid) {
          const m = value.match(/^\d{2}[A-Z0-9]+-\d{4}-\d+$/i);
          if (m) judicial_uid = value;
        }
      }
    }
  });

  // Стороны #cont3
  $('#cont3 #tablcont tr, #cont3 table tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length >= 2) {
      const type = cells.eq(0).text().trim().toUpperCase();
      const name = cells.eq(1).text().trim();
      if (type.includes('ИСТЕЦ') && !name.toUpperCase().includes('ИСТЕЦ')) plaintiff = name;
      if (type.includes('ОТВЕТЧИК') && !name.toUpperCase().includes('ОТВЕТЧИК')) defendant = name;
    }
  });

  // События #cont2
  const events = [];
  $('#cont2 #tablcont tr, #cont2 table tr').each((index, el) => {
    const cells = $(el).find('td');
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

  // Обжалования #cont4
  const appeals = [];
  $('#cont4 #tablcont tr, #cont4 table tr').each((_, el) => {
    const cells = $(el).find('td');
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
    judicial_uid,
    events: events.length > 0 ? events : [{
      date: date || 'Дата не указана',
      time: '',
      name: 'Судебное событие',
      result: status,
    }],
    appeals: appeals.length > 0 ? appeals : [{
      id: 1,
      type: 'Нет данных об обжаловании',
      applicant: 'Информация скрыта',
      court: '',
      date: '',
      result: '',
    }],
  };
}

function detectCourt(url) {
  const courtMap = {
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

  try {
    const hostname = new URL(url).hostname;
    const sub = hostname.split('.')[0].replace(/[-]+/g, '-').toLowerCase();
    if (courtMap[sub]) return courtMap[sub];
    if (sub.includes('oblsud')) return 'Ленинградский областной суд';
  } catch (e) {
    console.error('Court detection error:', e);
  }
  return 'Неизвестный суд';
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Main parse endpoint
app.post('/parse-case', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`[${new Date().toISOString()}] Parsing: ${url}`);
    const data = await parseCase(url);
    console.log(`[${new Date().toISOString()}] Success: ${data.number} (${data.events.length} events)`);
    res.json(data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Parse error:`, error.message);

    let status = 500;
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      status = 502;
    } else if (error.message.includes('timeout') || error.message.includes('таймаут')) {
      status = 504;
    } else if (error.message.includes('404')) {
      status = 404;
    }

    res.status(status).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Sud Parser Server] Running on port ${PORT}`);
  console.log(`[Sud Parser Server] Endpoint: http://localhost:${PORT}/parse-case`);
});