import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function importCourts() {
  try {
    console.log('Начинаем импорт данных о судах...');
    
    const results = [];
    const regions = new Map();
    
    // Чтение CSV файла
    await new Promise((resolve, reject) => {
      fs.createReadStream('F:/PYTHON/BOTS/sud_bot/sud_bot/db/courts_merged.csv')
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
          
          // Извлечение региона (из кода суда первые 2 цифры)
          const regionCode = data.code ? data.code.slice(0, 2) : '00';
          if (!regions.has(regionCode) && data.region) {
            regions.set(regionCode, data.region);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`Найдено ${results.length} судов и ${regions.size} регионов`);
    
    // Импорт регионов
    console.log('Импортируем регионы...');
    for (const [regionCode, regionName] of regions.entries()) {
      const regionId = `r_${regionCode}`;
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const { error } = await supabase
            .from('court_regions')
            .upsert({
              id: regionId,
              name: regionName
            });
            
          if (error) {
            console.error(`Ошибка при импорте региона ${regionName}:`, error);
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`Попытка ${attempts + 1} из ${maxAttempts}...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            console.log(`Регион импортирован: ${regionName} (${regionId})`);
            break;
          }
        } catch (err) {
          console.error(`Ошибка при импорте региона ${regionName}:`, err);
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`Попытка ${attempts + 1} из ${maxAttempts}...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }
    
    // Импорт судов
    console.log('Импортируем суды...');
    let courtCount = 0;
    let startId = 5000;
    
    for (const row of results) {
      const regionCode = row.code ? row.code.slice(0, 2) : '00';
      const regionId = `r_${regionCode}`;
      const courtId = `c_${startId++}`;
      
      const courtData = {
        id: courtId,
        name: row.name || '',
        region_id: regionId,
        full_address: row.full_address || '',
        phone: row.phone || '',
        email: row.email || '',
        website: row.website || '',
        code: row.code || '',
        recipient_account: row.recipient_account || '',
        recipient_bank: row.recipient_bank || '',
        recipient_bik: row.recipient_bik || '',
        treasury_account: row.treasury_account || '',
        recipient_inn: row.recipient_inn || '',
        tax_period: row.tax_period || '',
        recipient_kpp: row.recipient_kpp || '',
        recipient_name: row.recipient_name || '',
        kbk: row.kbk || '',
        oktmo: row.oktmo || '',
        payment_basis: row.payment_basis || '',
        payment_type: row.payment_type || '',
        jurisdiction: row.jurisdiction || ''
      };
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const { error } = await supabase
            .from('courts')
            .upsert(courtData);
            
          if (error) {
            console.error(`Ошибка при импорте суда ${row.name}:`, error);
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`Попытка ${attempts + 1} из ${maxAttempts}...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            courtCount++;
            if (courtCount % 100 === 0) {
              console.log(`Импортировано ${courtCount} судов`);
            }
            break;
          }
        } catch (err) {
          console.error(`Ошибка при импорте суда ${row.name}:`, err);
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`Попытка ${attempts + 1} из ${maxAttempts}...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }
    
    console.log(`Импорт завершен успешно! Импортировано ${courtCount} судов и ${regions.size} регионов`);
    
  } catch (error) {
    console.error('Ошибка при импорте:', error);
  }
}

importCourts();
