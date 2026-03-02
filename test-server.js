import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// CaseData interface
class CaseData {
  constructor(number, court, status, date, category, judge, plaintiff, defendant, link, events, appeals) {
    this.number = number;
    this.court = court;
    this.status = status;
    this.date = date;
    this.category = category;
    this.judge = judge;
    this.plaintiff = plaintiff;
    this.defendant = defendant;
    this.link = link;
    this.events = events;
    this.appeals = appeals;
  }
}

// Parse case data function
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

  // Parse case number
  const caseNumberElement = $('.casenumber');
  if (caseNumberElement.length) {
    number = caseNumberElement.text().trim();
  } else {
    const caseNumberMatch = html.match(/Дело №\s*([\d-\/]+)/);
    if (caseNumberMatch) {
      number = `Дело № ${caseNumberMatch[1]}`;
    }
  }

  // Parse court information
  const courtElement = $('.court');
  if (courtElement.length) {
    court = courtElement.text().trim();
  } else if (url.includes('mos-sud.ru')) {
    court = 'МОСКОВСКИЙ ГОРОДСКОЙ СУД';
  } else if (url.includes('sudrf.ru')) {
    const hostname = new URL(url).hostname;
    const sub = hostname.split('.')[0];
    court = sub.replace('--', '-').toUpperCase() + ' СУД';
  }

  // Parse status
  const statusElement = $('.status');
  if (statusElement.length) {
    status = statusElement.text().trim();
  } else {
    const statusMatch = html.match(/Статус.*?<[^>]*>([^<]+)/i);
    if (statusMatch) {
      status = statusMatch[1].trim();
    }
  }

  // Parse registration date
  const dateElement = $('.date');
  if (dateElement.length) {
    date = dateElement.text().trim();
  } else {
    const dateMatch = html.match(/Дата регистрации.*?(\d{2}\.\d{2}\.\d{4})/);
    if (dateMatch) {
      date = dateMatch[1];
    }
  }

  // Parse case category
  const categoryElement = $('.category');
  if (categoryElement.length) {
    category = categoryElement.text().trim();
  } else {
    const categoryMatch = html.match(/Категория.*?<[^>]*>([^<]+)/i);
    if (categoryMatch) {
      category = categoryMatch[1].trim();
    }
  }

  // Parse judge
  const judgeElement = $('.judge');
  if (judgeElement.length) {
    judge = judgeElement.text().trim();
  } else {
    const judgeMatch = html.match(/Судья.*?<[^>]*>([^<]+)/i);
    if (judgeMatch) {
      judge = judgeMatch[1].trim();
    }
  }

  // Parse plaintiff and defendant
  const partiesElements = $('.parties, .sides');
  if (partiesElements.length) {
    const partiesText = partiesElements.text();
    const plaintiffMatch = partiesText.match(/Истец.*?:\s*([^\n]*)/);
    const defendantMatch = partiesText.match(/Ответчик.*?:\s*([^\n]*)/);
    if (plaintiffMatch) {
      plaintiff = plaintiffMatch[1].trim();
    }
    if (defendantMatch) {
      defendant = defendantMatch[1].trim();
    }
  }

  // Parse case events (motion)
  const events = [];
  const eventsElements = $('.event, .motion-item');
  if (eventsElements.length > 0) {
    eventsElements.each((index, element) => {
      const event = $(element);
      const dateMatch = event.text().match(/(\d{2}\.\d{2}\.\d{4})/);
      const timeMatch = event.text().match(/(\d{2}:\d{2})/);
      const name = event.find('.event-name, .motion-name').text().trim() || event.text().trim().split(/\d{2}\.\d{2}\.\d{4}/)[1]?.trim().split(/\d{2}:\d{2}/)[0]?.trim() || "Судебное событие";
      
      events.push({
        date: dateMatch ? dateMatch[1] : "Дата не указана",
        time: timeMatch ? timeMatch[1] : "Время не указано",
        name: name,
        location: event.find('.location, .hall').text().trim() || undefined,
        result: event.find('.result').text().trim() || undefined,
        reason: event.find('.reason').text().trim() || undefined
      });
    });
  } else {
    // Try to parse events from table structure
    const eventTable = $('table:contains("Дата")');
    if (eventTable.length > 0) {
      eventTable.find('tr').each((index, element) => {
        if (index > 0) { // Skip header
          const cells = $(element).find('td');
          if (cells.length >= 3) {
            events.push({
              date: cells.eq(0).text().trim(),
              time: cells.eq(1).text().trim(),
              name: cells.eq(2).text().trim(),
              location: cells.eq(3).text().trim() || undefined,
              result: cells.eq(4).text().trim() || undefined,
              reason: cells.eq(5).text().trim() || undefined
            });
          }
        }
      });
    }
  }

  // Parse appeals
  const appeals = [];
  const appealsElements = $('.appeal, .complaint');
  if (appealsElements.length > 0) {
    appealsElements.each((index, element) => {
      const appeal = $(element);
      appeals.push({
        id: index + 1,
        type: appeal.find('.appeal-type, .complaint-type').text().trim() || "Жалоба",
        applicant: appeal.find('.applicant').text().trim() || "Информация скрыта",
        court: appeal.find('.appeal-court').text().trim() || "Неизвестный суд",
        date: appeal.find('.appeal-date').text().trim() || "Дата не указана",
        result: appeal.find('.appeal-result').text().trim() || "Результат не указан"
      });
    });
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

// Parse case endpoint
app.post('/parse-case', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    if (!url.match(/^https?:\/\/.+/)) {
      return res.status(400).json({ error: "Invalid URL format. Please provide a valid URL starting with http:// or https://" });
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(404).json({ error: `Failed to fetch case data: ${response.status} ${response.statusText}` });
    }

    const html = await response.text();

    const caseData = parseCaseData(html, url);
    caseData.link = url;

    return res.status(200).json(caseData);
  } catch (error) {
    console.error("Error parsing case:", error);
    
    let status = 500;
    let errorMessage = "Failed to parse case";
    
    if (error.message.includes("URL is required") || error.message.includes("Invalid URL format")) {
      status = 400;
      errorMessage = error.message;
    } else if (error.message.includes("Failed to fetch")) {
      status = 404;
      errorMessage = error.message;
    } else if (error.message.includes("Network")) {
      status = 503;
      errorMessage = "Network error. Please check your internet connection and try again.";
    } else {
      errorMessage = error.message;
    }

    return res.status(status).json({ error: errorMessage });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});