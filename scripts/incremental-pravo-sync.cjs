/**
 * Инкрементальная синхронизация документов с pravo.gov.ru
 * Загружает только новые документы за последний месяц
 * 
 * Запуск: node scripts/incremental-pravo-sync.js
 * Для запуска по cron: настроить внешний cron (например, через github actions или easycron)
 */

const fs = require('fs');
const path = require('path');

const PRAVO_API = "http://publication.pravo.gov.ru/api";
const DATA_FILE = path.join(__dirname, '../public/pravo-docs-minimal.json');

// Блоки для мониторинга (региональные документы)
const REGIONAL_BLOCKS = [
  { code: 'region', name: 'Региональные документы', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=200' },
];

// Блоки для федеральных документов
const FEDERAL_BLOCKS = [
  { code: 'laws', name: 'Федеральные законы', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=102' },
  { code: 'decrees', name: 'Указы Президента', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=104' },
  { code: 'govacts', name: 'Акты Правительства', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=108' },
  { code: 'fedorgs', name: 'Акты федеральных органов', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=120' },
];

// Все блоки
const ALL_BLOCKS = [...FEDERAL_BLOCKS, ...REGIONAL_BLOCKS];

/**
 * Загружает существующие документы из файла
 */
function loadExistingDocs() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return new Map(data.d.map(doc => [doc.i, doc]));
    }
  } catch (e) {
    console.log('Ошибка загрузки существующих документов:', e.message);
  }
  return new Map();
}

/**
 * Сохраняет документы в файл
 */
function saveDocs(docs) {
  const data = {
    t: Date.now(),
    d: docs
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 0));
  console.log(`Сохранено ${docs.length} документов в ${DATA_FILE}`);
}

/**
 * Извлекает дату из ID документа
 * Формат ID: XXXXXXXXXYYYYMMDDNNNN (федеральные) или регион(2)+код(4)+DDMM+год(2)+номер(4) (региональные)
 */
function extractDateFromId(id) {
  if (!id || id.length < 12) return null;
  
  // Федеральный формат: 9-13 год, 13-15 месяц, 15-17 день
  if (id.length >= 17) {
    const year = parseInt(id.substring(9, 13));
    const month = parseInt(id.substring(13, 15));
    const day = parseInt(id.substring(15, 17));
    
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  
  // Региональный формат: DDMM в середине
  // 9100202602270003 -> 27.02.2026
  if (id.length >= 12) {
    const dateStr = id.slice(-8, -4);
    const day = parseInt(dateStr.slice(0, 2));
    const month = parseInt(dateStr.slice(2, 4));
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      // Год обычно в конце ID
      const yearStr = id.slice(-4, -2);
      const year = 2000 + parseInt(yearStr);
      if (year >= 2020 && year <= 2100) {
        return { year, month, day };
      }
    }
  }
  
  return null;
}

/**
 * Проверяет, является ли документ новым (за последние N дней)
 */
function isNewDoc(id, daysBack = 30) {
  const docDate = extractDateFromId(id);
  if (!docDate) return false;
  
  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - daysBack);
  
  const docDateObj = new Date(docDate.year, docDate.month - 1, docDate.day);
  return docDateObj >= pastDate;
}

/**
 * Загружает документы для блока
 */
async function fetchBlockDocuments(block, daysBack = 30) {
  const documents = [];
  const pageSize = 100;
  let page = 1;
  let hasMore = true;
  let maxPages = 50; // Ограничение для одного запуска
  
  console.log(`\nЗагрузка блока: ${block.name} (${block.code})`);
  
  while (hasMore && page <= maxPages) {
    try {
      // Пробуем разные форматы API
      let url = `${PRAVO_API}/Documents?Block=${block.code}&PeriodType=monthly&page=${page}&pageSize=${pageSize}`;
      
      console.log(`  Страница ${page}: ${url}`);
      
      const res = await fetch(url, { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!res.ok) {
        console.log(`    Ошибка: ${res.status}`);
        hasMore = false;
        break;
      }
      
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items || [];
      const total = data.itemsTotalCount || items.length;
      
      if (page === 1) {
        console.log(`    Всего документов: ${total}`);
      }
      
      if (items.length === 0) {
        hasMore = false;
        break;
      }
      
      // Обрабатываем документы
      for (const doc of items) {
        const docId = doc.eoNumber || doc.id;
        const docUrl = doc.url || `http://publication.pravo.gov.ru/Document/View/${docId}`;
        const docName = doc.complexName || doc.name || '';
        
        if (docId && docName) {
          documents.push({
            i: docId,
            u: docUrl,
            a: doc.authority || doc.signatory || block.name
          });
        }
      }
      
      if (items.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
      
      // Небольшая задержка между запросами
      await new Promise(r => setTimeout(r, 500));
      
    } catch (e) {
      console.log(`    Ошибка: ${e.message}`);
      hasMore = false;
    }
  }
  
  console.log(`    Загружено: ${documents.length}`);
  return documents;
}

/**
 * Основная функция синхронизации
 */
async function sync() {
  console.log('='.repeat(60));
  console.log('Инкрементальная синхронизация pravo.gov.ru');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  // Загружаем существующие документы
  console.log('\n[1] Загрузка существующих документов...');
  const existingDocs = loadExistingDocs();
  console.log(`    Загружено: ${existingDocs.size} документов`);
  
  // Загружаем новые документы
  console.log('\n[2] Загрузка новых документов с pravo.gov.ru...');
  
  let newDocs = [];
  
  // Провяем доступность API
  let apiWorks = false;
  try {
    const test = await fetch(`${PRAVO_API}/PublicBlocks?page=1&pageSize=5`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (test.ok) {
      apiWorks = true;
      console.log('    ✓ API доступен');
    }
  } catch (e) {
    console.log('    ✗ API недоступен:', e.message);
  }
  
  if (apiWorks) {
    // Загружаем документы для всех блоков
    for (const block of ALL_BLOCKS) {
      try {
        const docs = await fetchBlockDocuments(block, 30); // Последние 30 дней
        newDocs = newDocs.concat(docs);
      } catch (e) {
        console.log(`  Ошибка загрузки блока ${block.code}:`, e.message);
      }
    }
  } else {
    console.log('    Используем существующие документы (API недоступен)');
  }
  
  // Фильтруем новые документы
  console.log('\n[3] Фильтрация новых документов...');
  const trulyNewDocs = newDocs.filter(doc => !existingDocs.has(doc.i));
  console.log(`    Найдено новых документов: ${trulyNewDocs.size || trulyNewDocs.length}`);
  
  // Обновляем список документов
  console.log('\n[4] Обновление файла...');
  
  const existingArray = Array.from(existingDocs.values());
  const allDocs = [...existingArray, ...trulyNewDocs];
  
  // Сортируем по ID (где содержится дата)
  allDocs.sort((a, b) => b.i.localeCompare(a.i)); // Новые первыми
  
  // Сохраняем
  saveDocs(allDocs);
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('✓ Синхронизация завершена!');
  console.log(`  Всего документов: ${allDocs.length}`);
  console.log(`  Новых документов: ${trulyNewDocs.length}`);
  console.log(`  Время выполнения: ${elapsed} сек`);
  console.log('='.repeat(60));
  
  return {
    total: allDocs.length,
    new: trulyNewDocs.length,
    elapsed: parseFloat(elapsed)
  };
}

// Экспорт для использования как модуль
module.exports = { sync };

// Запуск если скрипт вызван напрямую
if (require.main === module) {
  sync().catch(console.error);
}
