// Скрипт деплоя Edge Function через Supabase Management API
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'qhiietjvfuekfaehddox';
const FUNCTION_NAME = 'google-photos';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN; // Нужно получить из настроек Supabase

async function deployFunction() {
  if (!ACCESS_TOKEN) {
    console.error('❌ Ошибка: Установите переменную окружения SUPABASE_ACCESS_TOKEN');
    console.log('\nКак получить токен:');
    console.log('1. Откройте https://supabase.com/dashboard/account/tokens');
    console.log('2. Создайте новый токен');
    console.log('3. Выполните: $env:SUPABASE_ACCESS_TOKEN="your-token"');
    process.exit(1);
  }

  try {
    // Читаем код функции
    const functionPath = path.join(__dirname, 'supabase/functions/google-photos/index.ts');
    const code = fs.readFileSync(functionPath, 'utf8');

    console.log('🚀 Деплой функции google-photos...\n');

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
    console.log('✅ Функция успешно задеплоена!');
    console.log('ID:', result.id);
    console.log('Version:', result.version);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

deployFunction();
