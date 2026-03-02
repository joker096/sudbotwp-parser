// Скрипт для обновления конфигурации Edge Function
const fs = require('fs');
const path = require('path');
const https = require('https');
const { Buffer } = require('buffer');

const PROJECT_REF = 'qhiietjvfuekfaehddox';
const FUNCTION_NAME = 'parse-case';
const FUNCTION_ID = '56c7490c-ce68-4c42-99fe-baefaefd3325';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_3516c90745f1fb3ceea1a990d2397883138f161b';

async function deployFunction() {
  try {
    // Читаем код функции
    const functionPath = path.join(__dirname, 'supabase/functions/parse-case/index.ts');
    const code = fs.readFileSync(functionPath, 'utf8');

    console.log(`🚀 Деплой функции ${FUNCTION_NAME}...\n`);

    // Используем V2 API для деплоя
    const body = JSON.stringify({
      file: Buffer.from(code).toString('base64'),
      entrypoint_path: 'index.ts'
    });

    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/functions/deploy?slug=${FUNCTION_NAME}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log('Отправка запроса на деплой...');

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('Статус ответа (деплой):', res.statusCode);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ message: data });
            }
          } else {
            reject(new Error(data || `HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    console.log('✅ Функция задеплоена!');
    console.log('Результат:', JSON.stringify(result, null, 2));

    // Теперь обновляем настройки verify_jwt
    console.log('\nОбновление настроек функции (verify_jwt: false)...');
    
    const settingsBody = JSON.stringify({
      verify_jwt: false
    });

    const settingsOptions = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}/settings`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(settingsBody)
      }
    };

    const settingsResult = await new Promise((resolve, reject) => {
      const req = https.request(settingsOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('Статус ответа (настройки):', res.statusCode);
          console.log('Ответ настроек:', data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ message: data });
            }
          } else {
            resolve({ message: data || `HTTP ${res.statusCode}` });
          }
        });
      });
      
      req.on('error', reject);
      req.write(settingsBody);
      req.end();
    });

    console.log('✅ Настройки обновлены!');
    console.log('Результат:', JSON.stringify(settingsResult, null, 2));

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

deployFunction();
