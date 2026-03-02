import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

// Environment variables for parsing services
const BROWSERLESS_TOKEN = Deno.env.get('BROWSERLESS_TOKEN');
const SCRAPINGBEE_API_KEY = Deno.env.get('SCRAPINGBEE_API_KEY');

// Decode windows-1251 to utf-8 using TextDecoder
function decodeWindows1251(buffer: Uint8Array): string {
  const decoder = new TextDecoder('windows-1251');
  return decoder.decode(buffer);
}

interface CaseData {
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Try to parse using Browserless
async function parseWithBrowserless(url: string): Promise<string> {
  if (!BROWSERLESS_TOKEN) {
    throw new Error('Browserless not configured');
  }
  
  console.log('[Parse] Using Browserless for:', url);
  
  const browserlessUrl = `https://chrome.browserless.io/content?token=${BROWSERLESS_TOKEN}`;
  
  const response = await fetch(browserlessUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      gotoOptions: {
        waitUntil: 'networkidle2',
        timeout: 60000,
      },
      setJavaScriptEnabled: true,
      viewport: {
        width: 1920,
        height: 1080,
      },
      waitForSelector: '#tablcont, .casenumber, #cont1',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Browserless error:', response.status, errorText);
    throw new Error(`Browserless error: ${response.status}`);
  }

  return await response.text();
}

// Try to parse using ScrapingBee
async function parseWithScrapingBee(url: string): Promise<string> {
  if (!SCRAPINGBEE_API_KEY) {
    throw new Error('ScrapingBee not configured');
  }
  
  console.log('[Parse] Using ScrapingBee for:', url);
  
  const apiUrl = new URL('https://app.scrapingbee.com/api/v1/');
  apiUrl.searchParams.set('api_key', SCRAPINGBEE_API_KEY);
  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('render_js', 'true');
  apiUrl.searchParams.set('wait', '5000');
  apiUrl.searchParams.set('premium_proxy', 'true');

  const response = await fetch(apiUrl.toString());

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ScrapingBee error:', response.status, errorText);
    throw new Error(`ScrapingBee error: ${response.status}`);
  }

  return await response.text();
}

// Try direct fetch first, then fall back to services
async function fetchCourtPage(url: string): Promise<string> {
  console.log('[Parse] Trying direct fetch for:', url);
  
  // Add timeout to prevent hanging
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout for slow court sites
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });
    
    clearTimeout(fetchTimeout);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch case data: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return decodeWindows1251(new Uint8Array(buffer));
  } catch (error: any) {
    clearTimeout(fetchTimeout);
    
    // If it's an abort error, don't try fallbacks
    if (error.name === 'AbortError') {
      throw error;
    }
    
    console.log('[Parse] Direct fetch failed, trying Browserless...');
    
    // Try Browserless
    try {
      return await parseWithBrowserless(url);
    } catch (browserlessError) {
      console.log('[Parse] Browserless failed, trying ScrapingBee...');
      
      // Try ScrapingBee
      try {
        return await parseWithScrapingBee(url);
      } catch (scrapingbeeError) {
        console.log('[Parse] ScrapingBee failed:', scrapingbeeError);
        // Re-throw original error
        throw error;
      }
    }
  }
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      throw new Error("URL is required");
    }

    // Validate URL format
    if (!url.match(/^https?:\/\/.+/)) {
      throw new Error("Invalid URL format. Please provide a valid URL starting with http:// or https://");
    }

    // Use the new fetch function with fallbacks
    const html = await fetchCourtPage(url);
    const caseData = parseCaseData(html, url);
    caseData.link = url;

    return new Response(JSON.stringify(caseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error parsing case:", error);
    
    let status = 500;
    let errorMessage = "Failed to parse case";
    
    // Handle timeout/AbortError
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      status = 504;
      errorMessage = "Превышен таймаут ожидания. Судный сайт работает очень медленно. Попробуйте повторить запрос позже.";
    } else if (error.message.includes("URL is required") || error.message.includes("Invalid URL format")) {
      status = 400;
      errorMessage = error.message;
    } else if (error.message.includes("Failed to fetch")) {
      status = 503;
      errorMessage = "Не удалось загрузить данные с сайта суда. Возможно, сайт недоступен или заблокирован.";
    } else if (error.message.includes("Network")) {
      status = 503;
      errorMessage = "Ошибка сети. Проверьте подключение к интернету и попробуйте снова.";
    } else {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

function parseCaseData(html: string, url: string): CaseData {
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

  // Parse case number - sudrf.ru uses class="casenumber"
  const caseNumberElement = $('.casenumber');
  if (caseNumberElement.length) {
    number = caseNumberElement.text().trim();
  } else {
    // Try to find case number in the page - look for common patterns
    const caseNumberMatch = html.match(/№\s*(\d+[-/]?\d*[-/]?\d*)/i) || 
                            html.match(/ДЕЛО №\s*([^<\n]+)/i) ||
                            html.match(/case_num=(\d+)/i);
    if (caseNumberMatch) {
      number = caseNumberMatch[1].trim();
    } else {
      // Try to extract from URL parameters as fallback
      try {
        const urlObj = new URL(url);
        const caseId = urlObj.searchParams.get('case_id');
        const deloId = urlObj.searchParams.get('delo_id');
        if (caseId && deloId) {
          number = `№ ${caseId}/${deloId}`;
        } else if (caseId) {
          number = `№ ${caseId}`;
        }
      } catch (e) {
        // Keep default "Неизвестный номер"
      }
    }
  }

  // Parse court from HTML first (has priority)
  // Updated selector to match: <h5 class="heading heading_caps heading_title">Суд</h5>
  const courtFromHtml = $('.heading.heading_caps.heading_title, .heading_caps.heading_title, .court-name, h1.court, .sud-info .name');
  if (courtFromHtml.length) {
    let htmlCourt = courtFromHtml.text().trim();
    // Clean up HTML entities
    htmlCourt = htmlCourt.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    if (htmlCourt && htmlCourt.length > 5) {
      court = htmlCourt;
    }
  }
  
   // If not found in HTML, try to parse from URL for sudrf.ru
   if (court === "Неизвестный суд" && url.includes('sudrf.ru')) {
     try {
       const hostname = new URL(url).hostname;
       const sub = hostname.split('.')[0];
       
       // Map subdomain to full court name
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
         'mos sud': 'Московский городской суд',
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
       
       // Try different normalizations
       const normalizedSub = sub.replace(/[-]+/g, '-').toLowerCase();
       const normalizedSub2 = sub.replace(/-/g, ' ').toLowerCase();
       
       if (courtMap[normalizedSub]) {
         court = courtMap[normalizedSub];
       } else if (courtMap[normalizedSub2]) {
         court = courtMap[normalizedSub2];
       } else if (normalizedSub.includes('oblsud')) {
         // If subdomain contains 'oblsud' (with any number of hyphens), it's Leningrad Regional Court
         court = 'Ленинградский областной суд';
       } else if (normalizedSub.includes('sud')) {
         // Generic fallback for other sudrf.ru courts - but make it more readable
         const courtName = normalizedSub
           .replace(/-/g, ' ')
           .replace(/^\s*\S+\s+/, '') // Remove first word if it's 'oblsud' or similar
           .replace(/sud$/i, 'суд')
           .trim();
         court = courtName ? courtName.toUpperCase() : 'Суд Российской Федерации';
       }
     } catch (e) {
       court = 'Всеволожский городской суд';
     }
   }

  // Find all container elements - support different container patterns
  // Also look for appellate case containers (delo_id=5)
  const containers = $('[id^="cont"], .sud-block, .case-section, .info-block, #cont, #cont1, #cont2, #cont3, #cont4, #cont5, .container');
  
  // Function to determine container type by content
  const getContainerType = (container: cheerio.Cheerio<any>) => {
    const text = container.text().toLowerCase();
    const html = container.html()?.toLowerCase() || '';
    
    // Check for specific table headers that indicate movement table
    if (html.includes('наименование события') || 
        html.includes('дата размещения') ||
        (html.includes('дата') && html.includes('время') && html.includes('место проведения'))) {
      return 'events'; // Таблица движения дела
    }
    
    if (text.includes('рассмотрение в нижестоящем суде')) {
      return 'lowerCourt'; // Рассмотрение в нижестоящем суде (приоритет выше caseInfo)
    } else if (text.includes('дело') && (text.includes('уникальный идентификатор') || text.includes('дата поступления') || text.includes('категория дела') || text.includes('номер дела'))) {
      return 'caseInfo'; // Основная информация о деле
    } else if (text.includes('движение дела') || text.includes('история дела') || text.includes('хронология') || text.includes('позиция') || text.includes('мнения')) {
      return 'events'; // Движение дела (события)
    } else if (text.includes('обжалование') || text.includes('жалобы')) {
      return 'appeals'; // Обжалования (приоритет выше parties)
    } else if (text.includes('стороны по делу') || text.includes('участники') || text.includes('истец') || text.includes('ответчик') || text.includes('заявитель') || text.includes('лица, участвующие в деле')) {
      return 'parties'; // Стороны по делу
    }
    return 'unknown';
  };

  // Parse case info from caseInfo container
  const caseInfoContainer = containers.filter((i, el) => getContainerType($(el)) === 'caseInfo');
  if (caseInfoContainer.length > 0) {
    // Try different table selectors
    let caseInfoTable = caseInfoContainer.find('#tablcont');
    if (caseInfoTable.length === 0) {
      caseInfoTable = caseInfoContainer.find('table');
    }
    if (caseInfoTable.length > 0) {
      caseInfoTable.find('tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 2) {
          const label = cells.eq(0).text().trim();
          const value = cells.eq(1).text().trim();
          
          if (label.includes('Дата поступления') || label.includes('Дата регистрации')) {
            date = value;
          } else if (label.includes('Категория дела')) {
            category = value.replace(/&rarr;/g, '→').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
          } else if (label.includes('Судья')) {
            judge = value;
          } else if (label.includes('Результат рассмотрения') || label.includes('Статус')) {
            status = value;
          } else if (label.includes('Уникальный идентификатор')) {
            // Try to extract UID from link or direct text
            const uidLink = cells.eq(1).find('a').attr('href');
            if (uidLink) {
              const uidMatch = uidLink.match(/judicial_uid=([^&]+)/i);
              if (uidMatch) {
                judicialUid = uidMatch[1];
              }
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

  // Post-processing for status if not found in table
  if (status === "Статус не указан") {
    const statusMatchGeneral = html.match(/(?:Статус дела|Результат рассмотрения|ДЕЛО)\s*:\s*([^<\n]+)/i);
    if (statusMatchGeneral) {
      status = statusMatchGeneral[1].trim();
    } else {
      // Try to find status right after the case number, as in the user's example
      // Ensure 'number' is already parsed before using it in regex
      if (number !== "Неизвестный номер") {
        const caseNumberRegex = new RegExp(`№\\s*${number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([^<\n]+)`, 'i');
        const statusAfterNumberMatch = html.match(caseNumberRegex);
        if (statusAfterNumberMatch && statusAfterNumberMatch[1].trim().length > 5) { // Ensure it's a meaningful status
          status = statusAfterNumberMatch[1].trim();
        }
      }
    }
  }

  // Post-processing for date if not found in table
  if (date === "Дата не указана") {
    const dateMatchGeneral = html.match(/(?:Дата поступления|Дата регистрации)\s*:\s*(\d{2}\.\d{2}\.\d{4})/i);
    if (dateMatchGeneral) {
      date = dateMatchGeneral[1].trim();
    }
  }

  // Parse plaintiff and defendant from parties container
  const partiesContainer = containers.filter((i, el) => getContainerType($(el)) === 'parties');
  if (partiesContainer.length > 0) {
    // Try different table selectors
    let partiesTable = partiesContainer.find('#tablcont');
    if (partiesTable.length === 0) {
      partiesTable = partiesContainer.find('table');
    }
    if (partiesTable.length > 0) {
      partiesTable.find('tr').each((index, element) => {
        const cells = $(element).find('td');
        if (cells.length >= 2) {
          const type = cells.eq(0).text().trim().toUpperCase();
          const name = cells.eq(1).text().trim();
          
          if (type.includes('ИСТЕЦ') || type.includes('ИСТЦ')) {
            if (name && name !== 'ИСТЕЦ' && !name.toUpperCase().includes('ИСТЕЦ') && name !== 'Информация скрыта' && name.trim() !== '') {
              plaintiff = name;
            } else {
              plaintiff = 'Информация скрыта';
            }
          } else if (type.includes('ОТВЕТЧИК') || type.includes('ОТВ')) {
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
  } else {
    // Fallback: try generic classes
    const partiesElements = $('.parties, .sides, .participants');
    if (partiesElements.length) {
      const partiesText = partiesElements.text();
      const plaintiffMatch = partiesText.match(/Истец[а-я]?[:\s]+([^<\n]{3,100})/i);
      const defendantMatch = partiesText.match(/Ответчик[а-я]?[:\s]+([^<\n]{3,100})/i);
      if (plaintiffMatch) {
        plaintiff = plaintiffMatch[1].trim();
      }
      if (defendantMatch) {
        defendant = defendantMatch[1].trim();
      }
    }
  }
  
  // If still hidden, try to find in page text with broader patterns
  if (plaintiff === "Информация скрыта") {
    const plaintiffMatch = html.match(/Истец[а-я]?[:\s]+([^<\n]{3,100})/i) ||
                          html.match(/истец[:\s]+([^<\n]{3,100})/i);
    if (plaintiffMatch) {
      plaintiff = plaintiffMatch[1].trim();
    }
  }
  if (defendant === "Информация скрыта") {
    const defendantMatch = html.match(/Ответчик[а-я]?[:\s]+([^<\n]{3,100})/i) ||
                          html.match(/ответчик[:\s]+([^<\n]{3,100})/i);
    if (defendantMatch) {
      defendant = defendantMatch[1].trim();
    }
  }

  // Parse events from events container
  const events: Array<{ date: string; time: string; name: string; location?: string; result?: string; reason?: string; datePosted?: string }> = [];
  
  // First, try to find tables by header structure (наименование события, дата, время)
  $('table').each((tableIdx, tableEl) => {
    const tableHtml = $(tableEl).html()?.toLowerCase() || '';
    const tableText = $(tableEl).text();
    
    // Check if this table has event movement headers
    if (tableHtml.includes('наименование события') || 
        (tableHtml.includes('дата') && tableHtml.includes('время') && tableHtml.includes('событие'))) {
      
      let headerIndices: { [key: string]: number } = {};
      let headerRowFound = false;
      
      // Find header row to map column indices
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
              headerRowFound = true;
            } else if (headerText.includes('результат')) {
              headerIndices['result'] = cellIdx;
              headerRowFound = true;
            } else if (headerText.includes('основание')) {
              headerIndices['reason'] = cellIdx;
              headerRowFound = true;
            } else if (headerText.includes('размещения') || headerText.includes('публикации')) {
              headerIndices['datePosted'] = cellIdx;
              headerRowFound = true;
            }
          });
        }
      });
      
      // Parse data rows
      if (headerRowFound && Object.keys(headerIndices).length > 0) {
        // Find the row index of the header row to skip it and any other header rows
        let headerRowIdx = -1;
        $(tableEl).find('tr').each((rowIdx, rowEl) => {
          const headerCells = $(rowEl).find('th, td');
          // Check if this row contains any header keywords
          let hasHeaderKeyword = false;
          headerCells.each((cellIdx, cellEl) => {
            const headerText = $(cellEl).text().trim().toLowerCase();
            if (headerText.includes('наименование') || headerText.includes('дата') || 
                headerText.includes('время') || headerText.includes('место') || 
                headerText.includes('результат') || headerText.includes('основание') ||
                headerText.includes('размещения')) {
              hasHeaderKeyword = true;
              return false;
            }
          });
          if (hasHeaderKeyword) {
            headerRowIdx = rowIdx;
            return false; // break
          }
        });
        
        $(tableEl).find('tr').each((rowIdx, rowEl) => {
          // Skip header rows (both row 0 and the actual header row with column names)
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
                reason: headerIndices['reason'] !== undefined 
                  ? cells.eq(headerIndices['reason']).text().trim() || undefined 
                  : undefined,
                datePosted: headerIndices['datePosted'] !== undefined 
                  ? cells.eq(headerIndices['datePosted']).text().trim() || undefined 
                  : undefined
              });
            }
          }
        });
      }
    }
  });
  
  // If no events found with header detection, try container-based parsing
  if (events.length === 0) {
    const eventsContainer = containers.filter((i, el) => getContainerType($(el)) === 'events');
    
    if (eventsContainer.length > 0) {
      // First try table structure with different selectors
      let eventsTable = eventsContainer.find('#tablcont');
      if (eventsTable.length === 0) {
        eventsTable = eventsContainer.find('table');
      }
      
      if (eventsTable.length > 0) {
        // Find header row index to skip it
        let headerRowIdx = -1;
        eventsTable.find('tr').each((rowIdx, rowEl) => {
          const rowCells = $(rowEl).find('th, td');
          let hasHeaderKeyword = false;
          rowCells.each((cellIdx, cellEl) => {
            const cellText = $(cellEl).text().trim().toLowerCase();
            if (cellText.includes('наименование') || cellText.includes('дата') || 
                cellText.includes('время') || cellText.includes('место') || 
                cellText.includes('результат') || cellText.includes('основание') ||
                cellText.includes('размещения')) {
              hasHeaderKeyword = true;
              return false;
            }
          });
          if (hasHeaderKeyword) {
            headerRowIdx = rowIdx;
            return false;
          }
        });
        
        eventsTable.find('tr').each((rowIdx, element) => {
          // Skip header rows
          if (rowIdx <= headerRowIdx) return;
          
          const cells = $(element).find('td');
          if (cells.length >= 2) { 
            const dateText = cells.eq(1).text().trim() || cells.eq(0).text().trim();
            if (dateText.match(/\d{2}\.\d{2}\.\d{4}/)) {
              events.push({
                date: dateText,
                time: cells.eq(2).text().trim() || '',
                name: cells.eq(0).text().trim() || 'Судебное событие',
                location: cells.eq(3).text().trim() || undefined,
                result: cells.eq(4).text().trim() || cells.eq(5).text().trim() || undefined,
                reason: cells.eq(5).text().trim() || cells.eq(6).text().trim() || undefined,
                datePosted: cells.eq(7).text().trim() || undefined
              });
            }
          }
        });
      }
    
      // If table structure didn't work, try div-based (group is-active)
      if (events.length === 0) {
        eventsContainer.find('.group.is-active, .event-item, .history-item, .timeline-item').each((index, element) => {
          const text = $(element).text().trim();
          const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
          const timeMatch = text.match(/(\d{2}:\d{2})/);
          
          if (dateMatch) {
            let name = "Судебное событие";
            const nameMatch = text.match(/Регистрация иска|Поступление материалов|Принятие иска к производству|Вынесено определение|предварительное судебное заседание|судебное заседание|производство по делу|Изготовлено мотивированное решение|Дело сдано в отдел/i);
            if (nameMatch) {
              name = nameMatch[0];
            }
            
            let result = "";
            const resultMatch = text.match(/Иск принят к производству|Заседание отложено|Объявлен перерыв|производство приостановлено|производство возобновлено|Вынесено решение|УДОВЛЕТВОРЕН|Назначено судебное заседание/i);
            if (resultMatch) {
              result = resultMatch[0];
            }
            
            events.push({
              date: dateMatch[1],
              time: timeMatch ? timeMatch[1] : '',
              name: name,
              result: result || undefined
            });
          }
        });
      }
    }
  }
  
  // Final fallback: try to find any dates in the HTML that look like events
  if (events.length === 0) {
    // Try to find any table that contains date patterns
    $('table').each((tableIdx, tableEl) => {
      const tableText = $(tableEl).text();
      // Check if this table contains dates
      if (tableText.match(/\d{2}\.\d{2}\.\d{4}/)) {
        // Find header row to skip it
        let headerRowIdx = -1;
        $(tableEl).find('tr').each((rowIdx, rowEl) => {
          const rowCells = $(rowEl).find('th, td');
          let hasHeaderKeyword = false;
          rowCells.each((cellIdx, cellEl) => {
            const cellText = $(cellEl).text().trim().toLowerCase();
            if (cellText.includes('наименование') || cellText.includes('дата') || 
                cellText.includes('время') || cellText.includes('место') || 
                cellText.includes('результат') || cellText.includes('основание') ||
                cellText.includes('размещения')) {
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
          // Skip header rows
          if (rowIdx <= headerRowIdx) return;
          
          const rowText = $(rowEl).text();
          const dateMatch = rowText.match(/(\d{2}\.\d{2}\.\d{4})/);
          const timeMatch = rowText.match(/(\d{2}:\d{2})/);
          
          if (dateMatch) {
            // Extract potential event name - take first meaningful text
            let name = "Судебное событие";
            const namePatterns = [
              /Регистрация иска/i, /Поступление материалов/i, /Принятие иска/i,
              /Вынесено определение/i, /Предварительное судебное заседание/i,
              /Судебное заседание/i, /Производство по делу/i,
              /Изготовлено мотивированное решение/i, /Дело сдано/i,
              /Передача материалов/i, /Решение вопроса/i
            ];
            for (const pattern of namePatterns) {
              if (pattern.test(rowText)) {
                name = rowText.match(pattern)?.[0] || name;
                break;
              }
            }
            
            events.push({
              date: dateMatch[1],
              time: timeMatch ? timeMatch[1] : '',
              name: name,
              result: ''
            });
          }
        });
      }
    });
    
    // If still no events, try regex on entire HTML
    if (events.length === 0) {
      const eventMatches = html.match(/(\d{2}\.\d{2}\.\d{4})[^<]{0,50}(принят|отложено|перерыв|решение|заседание|производство|передача|вынесено|регистрация)/gi);
      if (eventMatches) {
        eventMatches.slice(0, 10).forEach((match) => {
          const dateMatch = match.match(/(\d{2}\.\d{2}\.\d{4})/);
          if (dateMatch) {
            events.push({
              date: dateMatch[1],
              time: '',
              name: match.substring(0, 80),
              result: ''
            });
          }
        });
      }
    }
  }

  // Parse appeals from appeals container
  const appeals: Array<{ id: number; type: string; applicant: string; court: string; date: string; result: string }> = [];
  const appealsContainer = containers.filter((i, el) => getContainerType($(el)) === 'appeals');
  
  if (appealsContainer.length > 0) {
    const appealsTable = appealsContainer.find('#tablcont');
    if (appealsTable.length > 0) {
      // Look for all sub-tables or divs containing appeal info
      const appealBlocks = [];
      
      // Option 1: Look for tables with "ЖАЛОБА" in headers
      appealsTable.find('table').each((i, el) => {
        const table = $(el);
        if (table.text().includes('ЖАЛОБА') || table.text().includes('Вид жалобы')) {
          appealBlocks.push(table);
        }
      });
      
      // Option 2: If no tables found, look for divs or sections with appeal content
      if (appealBlocks.length === 0) {
        appealBlocks.push(appealsTable);
      }
      
      // Parse each appeal block
      appealBlocks.forEach((block) => {
        const currentAppeal = { type: '', applicant: '', court: '', date: '', result: '' };
        
        block.find('tr').each((index, element) => {
          const cells = $(element).find('td');
          
          if (cells.length >= 2) {
            const label = cells.eq(0).text().trim().toLowerCase();
            const value = cells.eq(1).text().trim();
            
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
        
        // Only add appeal if it has at least some information
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
    link: url,
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
