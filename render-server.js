import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ScrapingBee API - free tier 100 requests/month
const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY || '';

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
  let judicial_uid = undefined;

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
      
      // Get judicial_uid from link
      if (label.includes('Уникальный идентификатор')) {
        const link = cells.eq(1).find('a');
        if (link.length) {
          const href = link.attr('href') || '';
          const match = href.match(/judicial_uid=([^&]+)/i);
          if (match) judicial_uid = match[1];
        }
        if (!judicial_uid) {
          const uidMatch = value.match(/^\d{2}[A-Z0-9]+-\d{4}-\d+$/i);
          if (uidMatch) judicial_uid = value;
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
    number, court, status, date, category, judge, plaintiff, defendant, judicial_uid, link: url,
    events: events.length > 0 ? events : [{ date: date, time: '', name: 'Судебное событие', result: status }],
    appeals: [{ id: 1, type: 'Нет данных об обжаловании', applicant: 'Информация скрыта', court: '', date: '', result: '' }]
  };
}

// Fetch with ScrapingBee (renders JS)
async function fetchWithScrapingBee(url) {
  // Add wait parameter for slow court sites and premium_proxy for reliability
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(url)}&render_js=true&wait=8000&premium_proxy=true`;
  
  // Add timeout for the fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 100000); // 100 second timeout
  
  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`ScrapingBee error: ${response.status}`);
    }
    
    // Use arrayBuffer to properly handle windows-1251 encoding
    const buffer = await response.arrayBuffer();
    return decodeWindows1251(new Uint8Array(buffer));
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Main parser
async function parseCase(url) {
  console.log('Parsing:', url);

  let html;
  let lastError;

  // Try direct fetch first (fastest if it works)
  try {
    console.log('Trying direct fetch...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for direct fetch

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    html = decodeWindows1251(new Uint8Array(buffer));
    console.log('Direct fetch successful');
  } catch (e) {
    console.log('Direct fetch failed:', e.message);
    lastError = e;
  }

  // Try ScrapingBee if direct fetch failed
  if (!html && SCRAPINGBEE_API_KEY) {
    try {
      html = await fetchWithScrapingBee(url);
      console.log('ScrapingBee successful');
    } catch (e) {
      console.log('ScrapingBee failed:', e.message);
      lastError = e;
    }
  }
  
  // If all methods failed, throw error
  if (!html) {
    if (lastError && lastError.name === 'AbortError') {
      throw new Error('Превышен таймаут ожидания. Судный сайт работает очень медленно. Попробуйте повторить запрос позже.');
    }
    throw new Error(lastError?.message || 'Failed to fetch case data from all sources');
  }

  // Check if we got valid data
  if (!html.includes('cont1') && !html.includes('tablcont') && !html.includes('casenumber')) {
    console.log('Warning: Response may not contain case data markers');
  }

  console.log('Parsing successful');
  return parseSudrfHtml(html, url);
}

// POST /parse-case endpoint
app.post('/parse-case', async (req, res) => {
  // Set timeout to 180 seconds for very slow court sites
  req.setTimeout(180000);
  res.setTimeout(180000);
  
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
  res.json({
    status: 'ok',
    scrapingbee: !!SCRAPINGBEE_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Serve static files from dist folder (Vite build)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('Warning: dist folder not found. Run "npm run build" first.');
  
  // Fallback for development - serve a simple message
  app.get('*', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Судовой Бот</title></head>
      <body>
        <h1>Судовой Бот</h1>
        <p>Приложение не собрано. Запустите: npm run build</p>
        <p>API работает: <a href="/health">/health</a></p>
      </body>
      </html>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('POST /parse-case - Parse court case');
  console.log('ScrapingBee:', SCRAPINGBEE_API_KEY ? 'Configured' : 'Not configured');
});
