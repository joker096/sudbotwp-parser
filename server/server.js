/**
 * Сервер парсинга судебных дел
 * Запускается как отдельный процесс и проксируется через nginx
 * Использует cheerio для парсинга HTML (windows-1251 кодировка)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import axios from 'axios';
import { execSync } from 'child_process';
import { isIPBlocked, blockIP, cleanupExpired } from './spam-ip-tracker.js';
import { cron } from './spam-cron.js';

const app = express();
const PORT = process.env.PORT || 3007;

// Enable rate limiting and IP blocking middleware
app.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || 'unknown';
  
  if (isIPBlocked(clientIP)) {
    return res.status(429).json({
      error: 'IP temporarily blocked due to spam detection',
      blocked_until: new Date(Date.now() + 3600000).toISOString(),
    });
  }
  
  next();
});

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

// =====================================================
// COUNTERPARTY CHECKS — Проверка контрагентов (РФ API)
// Сервер в РФ обходит блокировку иностранных IP
// =====================================================

// ЕГРЮЛ / ЕГРИП (ФНС)
app.post('/api/check-egrul', async (req, res) => {
  const { inn } = req.body;
  if (!inn || (inn.length !== 10 && inn.length !== 12)) {
    return res.status(400).json({ error: 'ИНН должен содержать 10 (ЮЛ) или 12 (физлицо/ИП) цифр' });
  }

  try {
    // Шаг 1: получаем токен
    const tokenRes = await axios.post('https://egrul.nalog.ru/', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    let token = '';
    const setCookie = tokenRes.headers['set-cookie'];
    if (setCookie) {
      const m = setCookie.join(';').match(/token=([^;]+)/);
      if (m) token = m[1];
    }
    if (!token && typeof tokenRes.data === 'object') {
      token = tokenRes.data.t || '';
    }

    // Шаг 2: поиск по ИНН
    const searchUrl = new URL('https://egrul.nalog.ru/');
    searchUrl.searchParams.set('token', token);
    searchUrl.searchParams.set('b', 'true');
    searchUrl.searchParams.set('type', 'all');
    searchUrl.searchParams.set('q', inn);

    const searchRes = await axios.get(searchUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': `token=${token}`,
      },
      timeout: 15000,
    });

    const searchData = searchRes.data;
    if (!searchData.items || searchData.items.length === 0) {
      return res.status(404).json({ error: 'Компания или ИП с указанным ИНН не найдены' });
    }

    const item = searchData.items[0];
    const result = {
      inn: item.i || inn,
      ogrn: item.o || '',
      name: item.c || '',
      fullName: item.n || item.c || '',
      address: item.a || '',
      director: item.g || '',
      founder: item.f || '',
      capital: item.capital || '',
      okved: item.k || '',
      okpo: item.p || '',
      oktmo: item.r || '',
      status: item.s || '',
      regDate: item.dt || '',
      kpp: item.kpp || '',
      ogrnDate: item.ogrndt || '',
    };

    res.json({ success: true, data: result, raw: item });
  } catch (error) {
    console.error('[check-egrul error]', error.message);
    res.status(502).json({ error: 'Сервис ФНС временно недоступен. Попробуйте позже.' });
  }
});

// ФССП
app.post('/api/check-fssp', async (req, res) => {
  const { inn } = req.body;
  if (!inn || (inn.length !== 10 && inn.length !== 12)) {
    return res.status(400).json({ error: 'ИНН должен содержать 10 или 12 цифр' });
  }

  try {
    const isCompany = inn.length === 10;
    const endpoint = isCompany ? 'legal' : 'physical';
    const apiUrl = `https://api-ip.fssprus.ru/api/v1.0/search/${endpoint}`;

    const searchRes = await axios.post(apiUrl, {
      token: '',
      inn,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 20000,
    });

    const searchData = searchRes.data;
    const task = searchData.response?.result?.[0];

    if (!task) {
      return res.json({ status: 'not_found', count: 0, productions: [] });
    }

    const statusUrl = `https://api-ip.fssprus.ru/api/v1.0/status/${task}`;
    const statusRes = await axios.get(statusUrl, { timeout: 20000 });
    const statusData = statusRes.data;
    const results = statusData.response?.result || [];

    const productions = results.map((item) => ({
      number: item.number || '',
      date: item.date || '',
      debtor: item.debtor?.name || '',
      type: item.exe_production_type || '',
      subject: item.subject_type || '',
      department: item.department || '',
      bailiff: item.bailiff || '',
      endDate: item.end_date || undefined,
      sum: item.exe_amount || undefined,
    }));

    res.json({
      status: productions.length > 0 ? 'found' : 'not_found',
      count: productions.length,
      productions,
    });
  } catch (error) {
    console.error('[check-fssp error]', error.message);
    res.json({ status: 'error', error: 'Сервис ФССП временно недоступен', count: 0, productions: [] });
  }
});

// Росстат (bo.nalog.ru)
app.post('/api/check-rosstat', async (req, res) => {
  const { inn } = req.body;
  if (!inn || (inn.length !== 10 && inn.length !== 12)) {
    return res.status(400).json({ error: 'ИНН должен содержать 10 или 12 цифр' });
  }

  try {
    const searchRes = await axios.get(`https://bo.nalog.ru/nbo/organizations/?inn=${inn}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const searchData = searchRes.data;
    if (!searchData.data || searchData.data.length === 0) {
      return res.status(404).json({ error: 'Организация не найдена в бухгалтерской базе' });
    }

    const org = searchData.data[0];
    const orgId = org.id;

    const reportsRes = await axios.get(`https://bo.nalog.ru/nbo/organizations/${orgId}/bfo/`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const reportsData = reportsRes.data;
    const reports = (reportsData.data || []).map((report) => ({
      year: report.year,
      period: report.period || 'годовой',
      assets: getIndicator(report, '1600'),
      liabilities: getIndicator(report, '1700'),
      capital: getIndicator(report, '1300'),
      revenue: getIndicator(report, '2110'),
      profit: getIndicator(report, '2400'),
      expenses: getIndicator(report, '2120'),
      receivables: getIndicator(report, '1230'),
      payables: getIndicator(report, '1520'),
    }));

    res.json({
      success: true,
      company: { name: org.name, inn: org.inn, ogrn: org.ogrn },
      reports: reports.sort((a, b) => b.year - a.year),
    });
  } catch (error) {
    console.error('[check-rosstat error]', error.message);
    res.status(502).json({ error: String(error), success: false });
  }
});

function getIndicator(report, code) {
  const indicator = report.indicators?.find((i) => i.code === code);
  return indicator ? parseFloat(indicator.value) : null;
}

// ЕФРСБ
app.post('/api/check-efrsb', async (req, res) => {
  const { inn } = req.body;
  if (!inn || (inn.length !== 10 && inn.length !== 12)) {
    return res.status(400).json({ error: 'ИНН должен содержать 10 или 12 цифр' });
  }

  try {
    const searchRes = await axios.get(`https://bankrot.fedresurs.ru/backend/prsnbankrupts?searchString=${encodeURIComponent(inn)}&isActive=true`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const searchData = searchRes.data;
    const bankrupts = searchData.pageData || [];
    const cases = [];

    for (const bankrupt of bankrupts) {
      try {
        const caseRes = await axios.get(`https://bankrot.fedresurs.ru/backend/prsnbankrupts/${bankrupt.guid}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        });
        const caseData = caseRes.data;
        cases.push({
          number: caseData.number || '',
          type: caseData.caseType || '',
          date: caseData.startDate || '',
          court: caseData.courtName || '',
          judge: caseData.judgeName || '',
          status: caseData.status || '',
        });
      } catch (e) {
        console.warn('EFRSB case detail failed:', e.message);
      }
    }

    res.json({
      hasBankruptcy: cases.length > 0,
      cases,
      registry: [],
    });
  } catch (error) {
    console.error('[check-efrsb error]', error.message);
    res.json({ hasBankruptcy: false, cases: [], registry: [], error: 'Сервис ЕФРСБ временно недоступен' });
  }
});

function getPidOnPort(port) {
  try {
    return execSync(`lsof -ti :${port}`).toString().trim();
  } catch (e) {
    try {
      return execSync(`fuser ${port}/tcp 2>/dev/null`).toString().trim();
    } catch (e2) {
      return null;
    }
  }
}

// =====================================================
const server = app.listen(PORT, () => {
  console.log(`[Sud Parser Server] Running on port ${PORT}`);
  console.log(`[Sud Parser Server] Endpoint: http://localhost:${PORT}/parse-case`);
  console.log(`[Sud Parser Server] Counterparty checks: /api/check-egrul, /api/check-fssp, /api/check-rosstat, /api/check-efrsb`);
});

// Start periodic spam checks
cron();

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const pid = getPidOnPort(PORT);
    if (pid) {
      console.error(`[FATAL] Port ${PORT} is already in use by process PID ${pid}. Stop that process before starting this server.`);
    } else {
      console.error(`[FATAL] Port ${PORT} is already in use by another process.`);
    }
    process.exit(1);
  }
  console.error('[FATAL] Server error:', err);
  process.exit(1);
});