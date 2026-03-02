import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase configuration
const SUPABASE_URL = 'https://qhiietjvfuekfaehddox.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaWlldGp2ZnVla2ZhZWhkZG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNDY3MTAsImV4cCI6MjA2NTcyMjcxMH0.Ae-xBpuSnLcQpWGC8COR3N_5BAjdJ6cqkzP4rnCJAzA';

// Create Supabase client for server-side operations
const supabase = SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

app.use(express.json());
app.use(cors());

// Настройки из .env
const PAYMENTO_CONFIG = {
  shopId: process.env.PAYMENTO_SHOP_ID || '3b42850b',
  apiKey: process.env.PAYMENTO_API_KEY || 'MzFGNTdBOTcxNDREQzA2NDZCOEQ3OTJCNzI1NkI1QjE=',
  apiUrl: process.env.PAYMENTO_API_URL || 'https://api.paymento.io/v1',
  secretKey: process.env.PAYMENTO_SECRET_KEY || 'MzEwOTdCNzY4NDE4RTc2OUEwMTM5NEExNDBGODA2MTE=',
  priceCurrency: process.env.PAYMENTO_PRICE_CURRENCY || 'USD',
  serverUrl: process.env.SERVER_URL || 'https://cvr.name/?wc-api=NPWC_Gateway',
};

// In-memory storage for demo (в production использовать БД)
const payments = new Map();

import { TextDecoder } from 'util';
function decodeWindows1251(buffer) {
  const decoder = new TextDecoder('windows-1251');
  return decoder.decode(buffer);
}

import puppeteer from 'puppeteer';

// Функция для повторных попыток с экспоненциальной задержкой
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isRetryable = error.message.includes('timeout') || 
                         error.message.includes('ECONNREFUSED') ||
                         error.message.includes('ETIMEDOUT') ||
                         error.message.includes('network') ||
                         error.message.includes('Connection');
      
      if (isLastAttempt || !isRetryable) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Парсинг дела с мос-суда
async function parseMosSudCase(url) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let number = 'Неизвестный номер';
    let court = 'Московский городской суд';
    let category = 'Гражданское дело';
    let judge = 'Не указан';
    let date = 'Не указана';
    let status = 'В рассмотрении';
    let plaintiff = 'Информация скрыта';
    let defendant = 'Информация скрыта';
    
    const caseInfo = $('.case-info, .b-case_info');
    if (caseInfo.length) {
      const text = caseInfo.text();
      const match = text.match(/№\s*([\d\-\/]+)/);
      if (match) number = `Дело № ${match[1]}`;
    }
    
    $('[class*="judge"], .judge').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Судья')) {
        judge = text.replace('Судья', '').trim();
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
      events: [{ date: date, time: '', name: 'Информация о движении дела недоступна', result: '' }],
      appeals: [{ id: 1, type: 'Нет данных об обжаловании', applicant: 'Информация скрыта', court: '', date: '', result: '' }]
    };
    
  } catch (error) {
    console.error('Error parsing mos-sud.ru:', error.message);
    throw error;
  }
}

// Функция парсинга HTML напрямую (без Puppeteer)
function parseSudrfHtml(html, url) {
  const $ = cheerio.load(html);
  
  let number = 'Неизвестный номер';
  let court = "Неизвестный суд";
  let status = "Статус не указан";
  let date = "Дата не указана";
  let category = "Категория не указана";
  let judge = "Судья не указан";
  let plaintiff = "Информация скрыта";
  let defendant = "Информация скрыта";

  // 1. Получаем название суда из URL
  try {
    const hostname = new URL(url).hostname;
    const sub = hostname.split('.')[0];
    const courtMap = {
      'vsevgorsud--lo': 'Всеволожский городской суд Ленинградской области',
      'vsevgorsud-lo': 'Всеволожский городской суд Ленинградской области',
      'vsevgorsud': 'Всеволожский городской суд',
      'krasnogorsk-mo': 'Красногорский городской суд Московской области',
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
    const normalizedSub = sub.replace(/[-]+/g, '-').toLowerCase();
    console.log('Direct fetch - hostname:', hostname, 'sub:', normalizedSub);
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
  } catch (e) {}

  // Parse case number
  const caseNumberElement = $('.casenumber');
  if (caseNumberElement.length) {
    number = caseNumberElement.text().trim();
  } else {
    const caseNumberMatch = html.match(/№\s*([\d\-\/\(\)\w~]+)/i) || 
                            html.match(/ДЕЛО №\s*([^<\n]+)/i) ||
                            html.match(/case_num=(\d+)/i);
    if (caseNumberMatch) {
      number = caseNumberMatch[1].trim();
    } else {
      try {
        const urlObj = new URL(url);
        const caseId = urlObj.searchParams.get('case_id');
        const deloId = urlObj.searchParams.get('delo_id');
        if (caseId && deloId) number = `№ ${caseId}/${deloId}`;
      } catch (e) {}
    }
  }

  // Parse from main info table (cont1)
  $('#cont1 #tablcont tr, #cont1 table tr, #tablcont tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2) {
      const label = cells.eq(0).text().trim();
      const value = cells.eq(1).text().trim();
      if (label.includes('Дата поступления')) date = value;
      if (label.includes('Категория дела')) category = value.replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
      if (label.includes('Судья')) judge = value;
      if (label.includes('Результат рассмотрения')) status = value;
    }
  });

  // Post-processing for status if not found in table
  if (status === "Статус не указан") {
    const statusMatchGeneral = html.match(/(?:Статус дела|Результат рассмотрения|ДЕЛО)\s*:\s*([^<\n]+)/i);
    if (statusMatchGeneral) {
      status = statusMatchGeneral[1].trim();
    }
  }

  // Parse parties (cont3)
  $("#cont3 #tablcont tr, #cont3 table tr").each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2) {
      const type = cells.eq(0).text().trim().toUpperCase();
      const name = cells.eq(1).text().trim();
      if (type.includes('ИСТЕЦ') && plaintiff === "Информация скрыта") plaintiff = name;
      if (type.includes('ОТВЕТЧИК') && defendant === "Информация скрыта") defendant = name;
    }
  });

  // Parse events (cont2)
  const events = [];
  $("#cont2 #tablcont tr, #cont2 table tr").each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2 && index > 0) {
      let dateText = '', timeText = '', nameText = '', locationText = '', resultText = '', reasonText = '';
      
      if (cells.length >= 6) {
        dateText = cells.eq(1).text().trim();
        timeText = cells.eq(2).text().trim();
        nameText = cells.eq(0).text().trim();
        locationText = cells.eq(3).text().trim();
        resultText = cells.eq(4).text().trim();
        reasonText = cells.eq(5).text().trim();
      } else if (cells.length >= 4) {
        dateText = cells.eq(1).text().trim();
        timeText = cells.eq(2).text().trim();
        nameText = cells.eq(0).text().trim();
        resultText = cells.eq(3).text().trim();
      } else {
        dateText = cells.eq(0).text().trim();
        nameText = cells.eq(1).text().trim();
      }
      
      if (dateText.match(/\d{2}\.\d{2}\.\d{4}/)) {
        events.push({
          date: dateText,
          time: timeText || '',
          name: nameText,
          location: locationText || undefined,
          result: resultText || undefined,
          reason: reasonText || undefined
        });
      }
    }
  });

  // Parse appeals (cont4)
  const appeals = [];
  $("#cont4 #tablcont tr, #cont4 table tr").each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 2) {
      const typeCell = cells.filter((i, el) => $(el).text().includes('Вид жалобы') || $(el).text().includes('Тип'));
      const applicantCell = cells.filter((i, el) => $(el).text().includes('Заявитель'));
      
      if (typeCell.length > 0 || applicantCell.length > 0) {
        const typeText = typeCell.next().text().trim();
        const applicantText = applicantCell.next().text().trim();
        
        if ((typeText || applicantText) && !typeText.includes('---===')) {
          appeals.push({
            id: appeals.length + 1,
            type: typeText || "Жалоба",
            applicant: applicantText || "Информация скрыта",
            court: "Вышестоящий суд",
            date: "",
            result: "В рассмотрении"
          });
        }
      }
    }
  });

  return {
    number, court, status, date, category, judge, plaintiff, defendant, link: url,
    events: events.length > 0 ? events : [{ date: date, time: "", name: "Дата не указана", result: status }],
    appeals: appeals.length > 0 ? appeals : [{ id: 1, type: "Нет данных об обжаловании", applicant: "Информация скрыта", court: "", date: "", result: "" }]
  };
}

// Главный парсер
async function parseCase(url) {
  if (url.includes('mos-sud.ru')) {
    return parseMosSudCase(url);
  }
  
  if (!url.includes('sudrf.ru')) {
    throw new Error('Поддерживаются только суды РФ (sudrf.ru, mos-sud.ru)');
  }
  
  console.log('Starting case parsing for:', url);
  
  // Сначала пробуем получить HTML напрямую
  try {
    console.log('Trying direct fetch first...');
    
    const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };
    
    const response = await retryWithBackoff(
      () => fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        }
      }, 30000),
      3,
      2000
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const html = decodeWindows1251(new Uint8Array(buffer));
    
    // Проверяем, есть ли нужные данные в HTML
    const hasCaseInfo = html.includes('tablcont') || html.includes('cont1') || html.includes('case_id');
    const hasEvents = html.includes('cont2') || html.includes('ДВИЖЕНИЕ') || html.includes('движение');
    const hasParties = html.includes('cont3') || html.includes('СТОРОН');
    const hasAppeals = html.includes('cont4') || html.includes('ОБЖАЛОВАН');
    
    if (hasCaseInfo) {
      console.log('Direct fetch successful, parsing HTML...');
      const parsed = parseSudrfHtml(html, url);
      
      const hasRealEvents = parsed.events && parsed.events.length > 0 && 
        !parsed.events[0].name.includes('недоступна') && 
        !parsed.events[0].name.includes('не указана');
      const hasRealParties = parsed.plaintiff !== 'Информация скрыта' || parsed.defendant !== 'Информация скрыта';
      const hasRealAppeals = parsed.appeals && parsed.appeals.length > 0 && 
        !parsed.appeals[0].type.includes('Нет данных');
      
      if (hasRealEvents || hasRealParties || hasRealAppeals) {
        console.log('Parsed successfully:', parsed.number);
        return parsed;
      }
      
      console.log('Direct fetch returned incomplete data, trying Puppeteer with retries...');
    }
  } catch (fetchError) {
    console.log('Direct fetch failed:', fetchError.message, '- trying Puppeteer with retries');
  }
  
  // Fallback: используем Puppeteer для динамических сайтов
  console.log('Using Puppeteer for sudrf.ru URL:', url);
  let browser;
  
  try {
    const parsedResult = await retryWithBackoff(
      async () => {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        try {
          await page.waitForSelector('#cont1 table#tablcont, #cont1 table, .case-info', { timeout: 30000 });
          console.log('Main content loaded');
        } catch (e) {
          console.log('Main content not fully loaded, proceeding with available content');
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const html = await page.content();
        const pageTitle = await page.title();
        await browser.close();
        browser = null;

        const $ = cheerio.load(html);

        let number = 'Неизвестный номер';
        let court = "Неизвестный суд";
        let status = "Статус не указан";
        let date = "Дата не указана";
        let category = "Категория не указана";
        let judge = "Судья не указан";
        let plaintiff = "Информация скрыта";
        let defendant = "Информация скрыта";

        // Court detection
        try {
            const hostname = new URL(url).hostname;
            const sub = hostname.split('.')[0];
            const courtMap = {
                'vsevgorsud--lo': 'Всеволожский городской суд Ленинградской области',
                'vsevgorsud-lo': 'Всеволожский городской суд Ленинградской области',
                'vsevgorsud': 'Всеволожский городской суд',
                'krasnogorsk--mo': 'Красногорский городской суд Московской области',
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
        } catch (e) {}
        
        if (court === "Неизвестный суд" && pageTitle && pageTitle.toLowerCase().includes('суд')) {
            court = pageTitle.split('|')[0].trim();
        }
        
        console.log('Final court:', court);

        // Parse case number
        const caseNumberElement = $('.casenumber');
        if (caseNumberElement.length) {
          number = caseNumberElement.text().trim();
        } else {
          const caseNumberMatch = html.match(/№\s*(\d+[-/]?\d*[-/]?\d*)/i) || 
                                  html.match(/ДЕЛО №\s*([^<\n]+)/i);
          if (caseNumberMatch) {
            number = caseNumberMatch[1].trim();
          } else {
            try {
              const urlObj = new URL(url);
              const caseId = urlObj.searchParams.get('case_id');
              const deloId = urlObj.searchParams.get('delo_id');
              if (caseId && deloId) number = `№ ${caseId}/${deloId}`;
            } catch (e) {}
          }
        }

        // Parse main info
        $('#cont1 #tablcont tr').each((index, element) => {
          const cells = $(element).find('td');
          if (cells.length >= 2) {
            const label = cells.eq(0).text().trim();
            const value = cells.eq(1).text().trim();
            if (label.includes('Дата поступления')) date = value;
            if (label.includes('Категория дела')) category = value.replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
            if (label.includes('Судья')) judge = value;
            if (label.includes('Результат рассмотрения')) status = value;
          }
        });

        // Parse parties
        $("#cont3 #tablcont tr").each((index, element) => {
          const cells = $(element).find('td');
          if (cells.length >= 2) {
            const type = cells.eq(0).text().trim().toUpperCase();
            const name = cells.eq(1).text().trim();
            if (type.includes('ИСТЕЦ') && plaintiff === "Информация скрыта") plaintiff = name;
            if (type.includes('ОТВЕТЧИК') && defendant === "Информация скрыта") defendant = name;
          }
        });

        // Parse events
        const events = [];
        $("#cont2 #tablcont tr").each((index, element) => {
          const cells = $(element).find('td');
          if (cells.length >= 2 && index > 0) {
            const dateText = cells.eq(1).text().trim();
            if (dateText.match(/\d{2}\.\d{2}\.\d{4}/)) {
              events.push({
                date: dateText,
                time: cells.eq(2).text().trim(),
                name: cells.eq(0).text().trim(),
                location: cells.eq(3).text().trim() || undefined,
                result: cells.eq(4).text().trim() || undefined,
                reason: cells.eq(5).text().trim() || undefined
              });
            }
          }
        });

        // Parse appeals
        const appeals = [];
        $("#cont4 #tablcont tr").each((index, element) => {
          const cells = $(element).find('td');
          if (cells.length >= 2) {
            const typeCell = cells.filter((i, el) => $(el).text().includes('Вид жалобы'));
            if (typeCell.length > 0) {
              const typeText = typeCell.next().text().trim();
              appeals.push({
                id: appeals.length + 1,
                type: typeText || "Жалоба",
                applicant: "Информация скрыта",
                court: "Вышестоящий суд",
                date: "",
                result: "В рассмотрении"
              });
            }
          }
        });

        return {
          number, court, status, date, category, judge, plaintiff, defendant, link: url,
          events: events.length > 0 ? events : [{ date: date, time: "", name: "Дата не указана", result: status }],
          appeals: appeals.length > 0 ? appeals : [{ id: 1, type: "Нет данных об обжаловании", applicant: "Информация скрыта", court: "", date: "", result: "" }]
        };
      },
      3,
      3000
    );
    
    console.log('Puppeteer parsing successful:', parsedResult.number);
    return parsedResult;
    
  } catch (error) {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    console.error('Puppeteer parsing failed:', error.message);
    throw error;
  }
}

// ==================== PAYMENTO PAYMENTS ====================

app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, currency, description, orderId, callbackUrl } = req.body;
    
    const paymentData = {
      shop_id: PAYMENTO_CONFIG.shopId,
      amount: amount,
      currency: currency || PAYMENTO_CONFIG.priceCurrency,
      description: description || 'Оплата услуг',
      order_id: orderId || `order_${Date.now()}`,
      callback_url: callbackUrl || `${PAYMENTO_CONFIG.serverUrl}/webhook`,
    };
    
    const response = await fetch(`${PAYMENTO_CONFIG.apiUrl}/invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYMENTO_CONFIG.apiKey}`,
      },
      body: JSON.stringify(paymentData),
    });
    
    const result = await response.json();
    
    if (result.status === 'success' || result.invoice_url) {
      payments.set(result.invoice_id, {
        ...paymentData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      
      res.json({
        success: true,
        invoiceId: result.invoice_id,
        invoiceUrl: result.invoice_url,
        payUrl: result.pay_url || result.invoice_url,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message || 'Failed to create payment'
      });
    }
    
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const { invoice_id, status, amount, currency, sign } = req.body;
    
    const signature = crypto
      .createHash('sha256')
      .update(`${invoice_id}${status}${PAYMENTO_CONFIG.secretKey}`)
      .digest('hex');
    
    if (sign !== signature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    console.log(`Payment webhook: ${invoice_id} - ${status}`);
    
    const payment = payments.get(invoice_id);
    if (payment) {
      payment.status = status === 'paid' ? 'completed' : status;
      payment.paidAt = new Date().toISOString();
      payments.set(invoice_id, payment);
      console.log(`Payment ${invoice_id} status updated to: ${payment.status}`);
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/payment-status/:invoiceId', (req, res) => {
  const { invoiceId } = req.params;
  const payment = payments.get(invoiceId);
  
  if (payment) {
    res.json({
      success: true,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Payment not found'
    });
  }
});

// ==================== CASE PARSER ====================

app.post('/add-case-manual', async (req, res) => {
  try {
    const { 
      number, 
      court, 
      category, 
      judge, 
      date, 
      hearingDate,
      status, 
      plaintiff, 
      defendant, 
      link,
      uniqueId
    } = req.body;
    
    if (!number || !link) {
      return res.status(400).json({ error: 'Требуются номер дела и ссылка' });
    }
    
    const caseData = {
      number,
      court: court || 'Всеволожский городской суд Ленинградской области',
      category: category || 'Не указана',
      judge: judge || 'Не указан',
      date: date || 'Не указана',
      hearingDate: hearingDate || '',
      status: status || 'В рассмотрении',
      plaintiff: plaintiff || 'Информация скрыта',
      defendant: defendant || 'Информация скрыта',
      link,
      uniqueId: uniqueId || '',
      events: [
        {
          date: date || 'Не указана',
          time: '',
          name: hearingDate ? `Рассмотрение назначено на ${hearingDate}` : 'Дело принято к производству',
          result: status
        }
      ],
      appeals: [
        {
          id: 1,
          type: 'Информация об обжаловании недоступна',
          applicant: 'Информация скрыта',
          court: 'Неизвестно',
          date: '',
          result: ''
        }
      ]
    };
    
    console.log('Manual case added:', caseData.number);
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('cases')
          .insert([
            {
              number: caseData.number,
              court: caseData.court,
              category: caseData.category,
              judge: caseData.judge,
              date: caseData.date,
              status: caseData.status,
              plaintiff: caseData.plaintiff,
              defendant: caseData.defendant,
              link: caseData.link,
              events: JSON.stringify(caseData.events),
              appeals: JSON.stringify(caseData.appeals),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ])
          .select()
          .single();
        
        if (error) {
          console.error('Error saving to Supabase:', error);
        } else {
          console.log('Case saved to Supabase:', data.id);
          return res.json({ ...caseData, saved: true, id: data.id });
        }
      } catch (err) {
        console.error('Supabase error:', err);
      }
    }
    
    res.json({ ...caseData, saved: false });
    
  } catch (error) {
    console.error('Error adding manual case:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/parse-case', async (req, res) => {
  console.log('Received request:', req.body);
  
  req.setTimeout(120000, () => {
    console.error('Request timeout');
    res.status(504).json({ error: 'Превышен таймаут запроса. Судный сайт работает медленно, попробуйте позже.' });
  });
  
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }
    
    console.log('Parsing URL:', url);
    
    if (!url.includes('sudrf.ru') && !url.includes('mos-sud.ru')) {
      return res.status(400).json({ error: 'Поддерживаются только суды РФ (sudrf.ru, mos-sud.ru)' });
    }
    
    const caseData = await parseCase(url);
    console.log('Parsed successfully:', caseData.number);
    res.json(caseData);
    
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.name === 'AbortError' || error.message.includes('aborted')) {
      return res.status(504).json({ error: 'Превышен таймаут при загрузке страницы суда. Сайт суда работает медленно. Попробуйте повторить запрос через несколько минут.' });
    }
    
    if (error.message.includes('network') || error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      return res.status(503).json({ error: `Ошибка соединения с сайтом суда (${error.message}). Сайт суда может быть временно недоступен. Попробуйте повторить запрос позже.` });
    }
    
    res.status(500).json({ error: error.message || "Failed to parse case" });
  }
});

// ==================== DADATA COMPANY SEARCH ====================

app.post('/api/search-company', async (req, res) => {
  try {
    const { inn } = req.body;
    
    if (!inn) {
      return res.status(400).json({ error: 'ИНН обязателен' });
    }
    
    const companyDataApiKey = process.env.COMPANY_DATA_API_KEY;
    const dadataApiKey = companyDataApiKey || process.env.DADATA_API_KEY;
    const dadataApiUrl = process.env.DADATA_API_URL || 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party';
    
    if (!dadataApiKey || dadataApiKey === 'your_dadata_api_key_here') {
      return res.json({
        source: 'mock',
        suggestions: [
          {
            value: 'ООО "Ромашка"',
            data: {
              inn: inn,
              ogrn: '1234567890123',
              address: { value: 'г. Москва, ул. Примерная, д. 1' },
              management: { name: 'Иванов Иван Иванович', post: 'Генеральный директор' },
              state: { status: 'ACTIVE' },
              finances: { revenue: null },
              employees: null
            }
          }
        ]
      });
    }
    
    const response = await fetch(dadataApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${dadataApiKey}`,
      },
      body: JSON.stringify({
        query: inn,
        count: 1
      }),
    });
    
    console.log('DaData request sent, status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('DaData error response:', errorText);
      throw new Error(`DaData API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    res.json({
      source: 'dadata',
      suggestions: data.suggestions || []
    });
    
  } catch (error) {
    console.error('DaData search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SELF-EMPLOYED CHECK (NPD) ====================

app.post('/api/check-self-employed', async (req, res) => {
  try {
    const { inn } = req.body;
    
    if (!inn) {
      return res.status(400).json({ error: 'ИНН обязателен' });
    }
    
    if (!/^\d{12}$/.test(inn)) {
      return res.status(400).json({ error: 'ИНН физлица должен содержать 12 цифр' });
    }
    
    const today = new Date().toISOString().substring(0, 10);
    const url = 'https://statusnpd.nalog.ru/api/v1/tracker/taxpayer_status';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inn: inn,
        requestDate: today,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('NPD API error:', response.status, errorText);
      throw new Error(`NPD API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    res.json({
      inn: inn,
      isSelfEmployed: result.status === true,
      message: result.message || '',
      checkedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Self-employed check error:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка при проверке статуса самозанятого' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    paymento: {
      shopId: PAYMENTO_CONFIG.shopId ? 'configured' : 'not configured',
      apiUrl: PAYMENTO_CONFIG.apiUrl
    },
    dadata: {
      apiKey: (process.env.COMPANY_DATA_API_KEY || (process.env.DADATA_API_KEY && process.env.DADATA_API_KEY !== 'your_dadata_api_key_here')) ? 'configured' : 'not configured'
    }
  });
});

// ==================== RATINGS API ====================

app.get('/api/ratings/:targetType/:targetId', async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    
    if (!['lawyer', 'court'].includes(targetType)) {
      return res.status(400).json({ error: 'Неверный тип объекта' });
    }
    
    if (!supabase) {
      return res.json({
        target_type: targetType,
        target_id: targetId,
        average_rating: 4.2,
        total_ratings: Math.floor(Math.random() * 50) + 10,
        rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    }
    
    const { data, error } = await supabase
      .from('ratings_summary')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single();
    
    if (error || !data) {
      return res.json({
        target_type: targetType,
        target_id: targetId,
        average_rating: 0,
        total_ratings: 0,
        rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    }
    
    return res.json({
      target_type: targetType,
      target_id: targetId,
      average_rating: parseFloat(data.average_rating) || 0,
      total_ratings: data.total_ratings,
      rating_distribution: {
        5: data.count_5,
        4: data.count_4,
        3: data.count_3,
        2: data.count_2,
        1: data.count_1
      }
    });
  } catch (error) {
    console.error('Error fetching rating:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ratings/check/:targetType/:targetId', async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const userId = req.headers['x-user-id'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!supabase) {
      return res.json({ can_rate: true, message: 'Можно голосовать' });
    }
    
    const { data, error } = await supabase.rpc('can_user_rate', {
      p_user_id: userId,
      p_target_type: targetType,
      p_target_id: targetId,
      p_ip_address: ipAddress
    });
    
    if (error) {
      return res.json({ can_rate: true, message: 'Можно голосовать' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error checking rating permission:', error.message);
    res.json({ can_rate: true, message: 'Можно голосовать' });
  }
});

app.post('/api/ratings', async (req, res) => {
  try {
    const { targetType, targetId, rating } = req.body;
    const userId = req.headers['x-user-id'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const captchaToken = req.body.captcha_token || null;
    
    if (!targetType || !targetId || !rating) {
      return res.status(400).json({ error: 'Требуются: targetType, targetId, rating' });
    }
    
    if (!['lawyer', 'court'].includes(targetType)) {
      return res.status(400).json({ error: 'Неверный тип объекта' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }
    
    if (!supabase) {
      return res.json({
        success: true,
        message: 'Спасибо за ваш голос!',
        rating: rating,
        total_votes: 1
      });
    }
    
    const { data, error } = await supabase.rpc('add_or_update_rating', {
      p_user_id: userId,
      p_target_type: targetType,
      p_target_id: targetId,
      p_rating: rating,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_captcha_token: captchaToken
    });
    
    if (error) {
      console.error('Rating error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error adding rating:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEO API ====================

// Generic handler for any SEO path
app.get('/api/seo/*', async (req, res) => {
  try {
    // Extract path from URL, removing '/api/seo' prefix
    let pagePath = req.params[0] || '';
    
    // Normalize path - ensure it starts with /
    const normalizedPath = pagePath.startsWith('/') ? pagePath : '/' + pagePath;
    
    console.log('SEO request for path:', normalizedPath);
    
    if (!supabase) {
      return res.json({
        meta_title: 'Судовой Бот',
        meta_description: 'Мониторинг судебных дел',
        noindex: false
      });
    }
    
    const { data, error } = await supabase
      .from('page_seo')
      .select('*')
      .eq('page_path', normalizedPath)
      .single();
    
    if (error || !data) {
      return res.json({
        meta_title: 'Судовой Бот',
        meta_description: 'Мониторинг судебных дел',
        noindex: false
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching SEO:', error.message);
    res.json({
      meta_title: 'Судовой Бот',
      meta_description: 'Мониторинг судебных дел',
      noindex: false
    });
  }
});

// Handle /api/seo and /api/seo/ - default to home page
app.get(['/api/seo', '/api/seo/'], async (req, res) => {
  try {
    console.log('SEO request for home page');
    
    if (!supabase) {
      return res.json({
        meta_title: 'Судовой Бот',
        meta_description: 'Мониторинг судебных дел',
        noindex: false
      });
    }
    
    const { data, error } = await supabase
      .from('page_seo')
      .select('*')
      .eq('page_path', '/')
      .single();
    
    if (error || !data) {
      return res.json({
        meta_title: 'Судовой Бот',
        meta_description: 'Мониторинг судебных дел',
        noindex: false
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching SEO:', error.message);
    res.json({
      meta_title: 'Судовой Бот',
      meta_description: 'Мониторинг судебных дел',
      noindex: false
    });
  }
});

app.put('/api/seo/:pagePath(*)', async (req, res) => {
  try {
    const { pagePath } = req.params;
    const normalizedPath = '/' + pagePath.replace(/^\//, '');
    const seoData = req.body;
    
    if (!supabase) {
      return res.json({ success: true, message: 'SEO настройки сохранены (mock)' });
    }
    
    const { data, error } = await supabase
      .from('page_seo')
      .upsert({
        page_path: normalizedPath,
        ...seoData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating SEO:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SITEMAP & ROBOTS.TXT ====================

app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SERVER_URL || 'https://cvr.name';
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    const pages = [
      { path: '/', priority: '1.0', frequency: 'daily' },
      { path: '/lawyers', priority: '0.9', frequency: 'daily' },
      { path: '/cases', priority: '0.9', frequency: 'daily' },
      { path: '/blog', priority: '0.8', frequency: 'weekly' },
      { path: '/monitoring', priority: '0.8', frequency: 'daily' },
      { path: '/leads', priority: '0.7', frequency: 'daily' },
      { path: '/calculator', priority: '0.7', frequency: 'monthly' },
      { path: '/help', priority: '0.6', frequency: 'monthly' },
      { path: '/profile', priority: '0.5', frequency: 'weekly' },
      { path: '/login', priority: '0.3', frequency: 'yearly' }
    ];
    
    for (const page of pages) {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}${page.path}</loc>\n`;
      sitemap += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      sitemap += `    <changefreq>${page.frequency}</changefreq>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += `  </url>\n`;
    }
    
    sitemap += '</urlset>';
    
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error.message);
    res.status(500).send('Error generating sitemap');
  }
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.SERVER_URL || 'https://cvr.name';
  
  const robots = `# Robots.txt for cvr.name
User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow sensitive pages
Disallow: /api/
Disallow: /profile
Disallow: /monitoring
Disallow: /leads
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(robots);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /parse-case - парсинг дела');
  console.log('  POST /api/create-payment - создать платёж');
  console.log('  POST /webhook - вебхук Paymento');
  console.log('  GET  /api/payment-status/:id - статус платежа');
  console.log('  POST /api/search-company - поиск компании по ИНН');
  console.log('  GET  /health - проверка работы');
});

export default app;
