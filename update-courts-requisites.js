import fs from 'fs';
import csv from 'csv-parser';

// Актуальные реквизиты для уплаты госпошлины (единые для судов общей юрисдикции)
// ВАЖНО: С 2021 года действует система Единого казначейского счёта (ЕКС).
// Все платежи госпошлины перечисляются на единый казначейский счёт (г. Тула),
// а распределение по регионам происходит автоматически по ОКТМО.
const UPDATED_REQUISITES = {
  recipient_account: '03100643000000018500', // Единый казначейский счет (номер счета получателя)
  recipient_bank: 'ОТДЕЛЕНИЕ ТУЛА БАНКА РОССИИ / УФК по Тульской области, г. Тула',
  recipient_bik: '017003983',
  treasury_account: '40102810445370000059', // Единый казначейский счет (корсчет)
  recipient_inn: '7727406020',
  recipient_kpp: '770701001',
  recipient_name: 'Казначейство России (ФНС России)',
};

// КБК для госпошлины (обновленные)
const KBK_GOSPOSHLINA = '18210803010011050110'; // Госпошлина при обращении в суд

// Карта регионов на ОКТМО (основные)
const OKTMO_BY_REGION = {
  'Город Санкт-Петербург': '40300000',
  'Ленинградская область': '41000000',
  'Город Москва': '45000000',
  'Московская область': '46000000',
  'Краснодарский край': '03000000',
  'Свердловская область': '66000000',
  'Челябинская область': '75000000',
  'Ростовская область': '60000000',
  'Республика Татарстан': '92000000',
  'Самарская область': '36000000',
  'Нижегородская область': '22000000',
  'Новосибирская область': '50000000',
  'Красноярский край': '04000000',
  'Иркутская область': '25000000',
  'Приморский край': '05000000',
  'Хабаровский край': '08000000',
};

async function updateCourtsData() {
  console.log('Начинаем обновление данных о судах...');
  
  const inputFile = 'F:/PYTHON/BOTS/sud_bot/sud_bot/db/courts_merged.csv';
  const outputFile = 'F:/PYTHON/BOTS/sud_bot/sud_bot/db/courts_merged_updated.csv';
  
  const results = [];
  let updatedCount = 0;
  let emptyRequisitesCount = 0;
  let alreadyFilledCount = 0;
  
  // Читаем CSV файл
  await new Promise((resolve, reject) => {
    fs.createReadStream(inputFile)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Прочитано ${results.length} записей`);
  
  // Обрабатываем каждую запись
  for (const row of results) {
    const code = row.code || '';
    const name = row.name || '';
    const region = row.region || '';
    
    // Определяем тип суда по коду или названию
    const isMilitaryCourt = code.includes('GV') || name.toLowerCase().includes('гарнизонный') || name.toLowerCase().includes('военный');
    const isDistrictCourt = code.includes('RS') || name.toLowerCase().includes('районный') || name.toLowerCase().includes('городской');
    const isJusticeOfPeace = code.includes('MS') || name.toLowerCase().includes('судебный участок') || name.toLowerCase().includes('мировой');
    const isArbitrationCourt = name.toLowerCase().includes('арбитражный');
    
    // Проверяем, есть ли уже актуальные реквизиты
    // Актуальный счет получателя = 03100643000000018500
    const hasCorrectRequisites = row.recipient_account && 
                                  row.recipient_account === '03100643000000018500';
    
    if (hasCorrectRequisites) {
      alreadyFilledCount++;
      continue; // Пропускаем, если уже есть корректные реквизиты
    }
    
    // Проверяем, есть ли хоть какие-то реквизиты
    const hasAnyRequisites = row.recipient_bank || row.recipient_bik || row.recipient_inn;
    
    if (!hasAnyRequisites) {
      emptyRequisitesCount++;
    }
    
    // Обновляем реквизиты для судов общей юрисдикции (районные, городские, мировые участки)
    if (isDistrictCourt || isJusticeOfPeace) {
      row.recipient_account = UPDATED_REQUISITES.recipient_account;
      row.recipient_bank = UPDATED_REQUISITES.recipient_bank;
      row.recipient_bik = UPDATED_REQUISITES.recipient_bik;
      row.treasury_account = UPDATED_REQUISITES.treasury_account;
      row.recipient_inn = UPDATED_REQUISITES.recipient_inn;
      row.recipient_kpp = UPDATED_REQUISITES.recipient_kpp;
      row.recipient_name = UPDATED_REQUISITES.recipient_name;
      
      // Обновляем ОКТМО если пустой
      if (!row.oktmo || row.oktmo === '' || row.oktmo === '0') {
        row.oktmo = OKTMO_BY_REGION[region] || '';
      }
      
      // Обновляем КБК если пустой
      if (!row.kbk || row.kbk === '') {
        row.kbk = KBK_GOSPOSHLINA;
      }
      
      // Обновляем tax_period
      row.tax_period = 'Дата платежа';
      
      updatedCount++;
    } else if (isMilitaryCourt) {
      // Для военных судов - только очищаем устаревшие реквизиты
      row.recipient_account = '';
      row.recipient_bank = '';
      row.recipient_bik = '';
      row.treasury_account = '';
      row.recipient_inn = '';
      row.recipient_kpp = '';
      row.recipient_name = '';
      row.kbk = '';
      row.oktmo = '';
      updatedCount++;
    } else if (isArbitrationCourt) {
      // Арбитражные суды - отдельные реквизиты
      row.recipient_account = '';
      row.recipient_bank = '';
      row.recipient_bik = '';
      row.treasury_account = '';
      row.recipient_inn = '';
      row.recipient_kpp = '';
      row.recipient_name = '';
      row.kbk = '';
      row.oktmo = '';
      updatedCount++;
    }
  }
  
  console.log(`Обработано записей: ${results.length}`);
  console.log(`Обновлено записей: ${updatedCount}`);
  console.log(`Пропущено (уже заполнено): ${alreadyFilledCount}`);
  console.log(`Пустых реквизитов было: ${emptyRequisitesCount}`);
  
  // Записываем обновленные данные
  console.log('Записываем обновленный файл...');
  
  const headers = Object.keys(results[0]);
  const csvContent = [
    headers.join(','),
    ...results.map((row) => {
      return headers.map((header) => {
        let value = row[header] || '';
        // Экранируем значения, содержащие запятые или кавычки
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(',');
    })
  ].join('\n');
  
  fs.writeFileSync(outputFile, '\ufeff' + csvContent, 'utf8');
  
  console.log(`Файл сохранен: ${outputFile}`);
  console.log('Обновление завершено!');
}

updateCourtsData().catch(console.error);
