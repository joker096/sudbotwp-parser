// Скрипт деплоя Edge Function auto-refresh-cases через Supabase Management API
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'qhiietjvfuekfaehddox';
const FUNCTION_NAME = 'auto-refresh-cases';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_3516c90745f1fb3ceea1a990d2397883138f161b';

async function deployFunction() {
  try {
    // Читаем код функции
    const functionPath = path.join(__dirname, 'supabase/functions/auto-refresh-cases/index.ts');
    const code = fs.readFileSync(functionPath, 'utf8');

    console.log(`🚀 Деплой функции ${FUNCTION_NAME}...\n`);

    // Деплой через Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${FUNCTION_NAME}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: Buffer.from(code).toString('base64'),
          entrypoint_path: 'index.ts',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Ошибка деплоя:', error);
      process.exit(1);
    }

    const result = await response.json();
    console.log(`✅ Функция ${FUNCTION_NAME} успешно задеплоена!`);
    console.log('ID:', result.id);
    console.log('Version:', result.version);

    // Обновляем настройки функции (отключаем JWT верификацию)
    console.log('\n📝 Обновление настроек функции...');
    
    const settingsResponse = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}/settings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verify_jwt: false,
          timeout: 180,
          memory_mb: 512
        }),
      }
    );

    if (settingsResponse.ok) {
      console.log('✅ Настройки обновлены!');
    } else {
      console.log('⚠️ Настройки не удалось обновить:', await settingsResponse.text());
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

deployFunction();
