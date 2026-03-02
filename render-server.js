import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Decode windows-1251 to utf-8
function decodeWindows1251(buffer) {
  const decoder = new TextDecoder('windows-1251');
  return decoder.decode(buffer);
}

// Court name mapping
const courtMap = {
  'vsevgorsud--lo': 'Всеволожский городской суд Ленинградской области',
  'vsevgorsud-lo': 'Всеволожский городской суд Ленинградской области',
  'vsevgorsud': 'Всеволожский городской суд',
  'krasnogorsk--mo': 'Красногорский городской суд Московской области',
  'lenobl': 'Ленинградский областной суд',
  'oblsud--lo': 'Ленинградский областной суд',
  'oblsud-lo': 'Ленинградский областной суд',
  'oblsud': 'Ленинградский областной суд',
  'lo': 'Ленинградский областной суд',
  'mosobl': 'Московский областной суд',
  'nvs--spb': 'Новгородский областной суд',
  'nvs-spb': 'Новгородский областной суд',
  'novgorod': 'Новгородский областной суд',
  'nnov': 'Нижегородский областной суд',
  'spb': 'Санкт-Петербургский городской суд',
  'msk': 'Московский городской суд',
  'mo': 'Московский областной суд',
};

// Parse HTML directly
function parseSudrfHtml(html, url) {
  const $ = cheerio.load(html);
  
  let number = 'Неизвестный номер';
  let court = 'Неизвестный суд';
  let status = 'Статус не указан';
  let date = 'Дата не указана';
  let category = 'Категория не указана';
  let judge = 'Судья не указан';
  let plaintiff = 'Информация скрыта';
  let defendant = 'Информация скрыта';
  let judicialUid = undefined;

  // Get court from URL
  try {
    const hostname = new URL(url).hostname;
    const sub = hostname.split('.')[0];
    const normalizedSub = sub.replace(/[-]+/g, '-').toLowerCase();
    
    if (courtMap[normalizedSub]) {
      court = courtMap[normalizedSub];
    } else if (normalizedSub.includes('oblsud')) {
      court = 'Ленинградский областной суд';
    }
  } catch (e) {}

  // Get court from heading (overrides URL)
  const headingElement = $('.heading.heading_caps.heading_title');
  if (headingElement.length) {
    const headingText = headingElement.text().trim();
    if (headingText && headingText.length > 5) {
      court = headingText;
    }
  }

  // Parse case number
  const caseNumberElement = $('.casenumber');
  if (caseNumberElement.length) {
    number = caseNumberElement.text().trim();
  }

  // Parse main info (cont1)
  $('#cont1 #tablcont tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2) {
      const label = cells.eq(0).text().trim();
      const value = cells.eq(1).text().trim();
      
      if (label.includes('Дата поступления')) date = value;
      if (label.includes('Категория дела')) category = value.replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
      if (label.includes('Судья')) judge = value;
      if (label.includes('Результат рассмотрения')) status = value;
      
      // Get judicialUid from link
      if (label.includes('Уникальный идентификатор')) {
        const link = cells.eq(1).find('a');
        if (link.length) {
          const href = link.attr('href') || '';
          const match = href.match(/judicial_uid=([^&]+)/i);
          if (match) judicialUid = match[1];
        }
        if (!judicialUid) {
          const uidMatch = value.match(/^\d{2}[A-Z0-9]+-\d{4}-\d+$/i);
          if (uidMatch) judicialUid = value;
        }
      }
    }
  });

  // Parse parties (cont3)
  $('#cont3 #tablcont tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2) {
      const type = cells.eq(0).text().trim().toUpperCase();
      const name = cells.eq(1).text().trim();
      if (type.includes('ИСТЕЦ') && !name.toUpperCase().includes('ИСТЕЦ')) plaintiff = name;
      if (type.includes('ОТВЕТЧИК') && !name.toUpperCase().includes('ОТВЕТЧИК')) defendant = name;
    }
  });

  // Parse events (cont2)
  const events = [];
  $('#cont2 #tablcont tr').each((index, element) => {
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

  return {
    number, court, status, date, category, judge, plaintiff, defendant, judicialUid, link: url,
    events: events.length > 0 ? events : [{ date: date, time: '', name: 'Судебное событие', result: status }],
    appeals: [{ id: 1, type: 'Нет данных об обжаловании', applicant: 'Информация скрыта', court: '', date: '', result: '' }]
  };
}

// Main parser with fallback to puppeteer
async function parseCase(url) {
  console.log('Parsing:', url);
  
  // Try direct fetch first
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      }
    });
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const html = decodeWindows1251(new Uint8Array(buffer));
      
      // Check if we got valid data
      if (html.includes('cont1') || html.includes('tablcont')) {
        console.log('Direct fetch successful');
        return parseSudrfHtml(html, url);
      }
    }
  } catch (e) {
    console.log('Direct fetch failed:', e.message);
  }
  
  // Fallback to puppeteer
  console.log('Using Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for content
    await page.waitForSelector('#cont1, .casenumber', { timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
    
    const html = await page.content();
    await browser.close();
    
    return parseSudrfHtml(html, url);
  } catch (e) {
    await browser.close();
    throw e;
  }
}

// POST /parse-case endpoint
app.post('/parse-case', async (req, res) => {
  req.setTimeout(120000);
  
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    if (!url.includes('sudrf.ru')) {
      return res.status(400).json({ error: 'Only sudrf.ru courts supported' });
    }
    
    console.log('Received:', url);
    const data = await parseCase(url);
    
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('POST /parse-case - Parse court case');
});
