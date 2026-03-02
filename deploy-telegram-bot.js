/**
 * Скрипт для деплоя Telegram бота и установки webhook
 * 
 * Использование:
 * 1. Установите Supabase CLI: npm install -g supabase
 * 2. Войдите в Supabase: supabase login
 * 3. Запустите скрипт: node deploy-telegram-bot.js
 */

export default {};

const SUPABASE_URL = 'https://qhiietjvfuekfaehddox.supabase.co';
const TELEGRAM_BOT_TOKEN = '8062305676:AAGVlika2UYuScFPdHSBmlOFFtz2F-J7Cw8';
const FUNCTION_NAME = 'telegram-webhook';

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;

console.log('🚀 Начинаем деплой Telegram бота...\n');

// Шаг 1: Деплой функции в Supabase
console.log('📦 Деплой Edge Function в Supabase...');
try {
  execSync(`supabase functions deploy ${FUNCTION_NAME} --no-verify-jwt`, {
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_URL }
  });
  console.log('✅ Функция успешно задеплоена!\n');
} catch (error) {
  console.error('❌ Ошибка деплоя:', error.message);
  console.log('\nПопробуйте выполнить вручную:');
  console.log(`supabase functions deploy ${FUNCTION_NAME} --no-verify-jwt`);
  process.exit(1);
}

// Шаг 2: Установка secrets
console.log('🔐 Установка переменных окружения...');
try {
  // Установка TELEGRAM_BOT_TOKEN
  execSync(`supabase secrets set TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}`, {
    stdio: 'inherit'
  });
  console.log('✅ TELEGRAM_BOT_TOKEN установлен');
} catch (error) {
  console.log('⚠️ Не удалось установить secrets автоматически');
  console.log('Установите вручную в Supabase Dashboard -> Settings -> Edge Functions');
}

// Шаг 3: Установка webhook в Telegram
console.log('\n📡 Установка webhook в Telegram...');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

const setWebhookUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}`;

try {
  // Добавляем небольшую задержку чтобы функция была готова
  setTimeout(async () => {
    const result = await makeRequest(setWebhookUrl);
    console.log('Ответ Telegram API:', JSON.stringify(result, null, 2));
    
    if (result.ok) {
      console.log('✅ Webhook успешно установлен!');
    } else {
      console.log('⚠️ Ответ Telegram:', result);
    }
    
    console.log('\n🎉 Бот готов к работе!');
    console.log(`   URL функции: ${WEBHOOK_URL}`);
    console.log('\n📱 Откройте @ur_sud_bot и отправьте /start');
  }, 2000);
} catch (error) {
  console.error('❌ Ошибка установки webhook:', error.message);
  console.log('\nВы можете установить webhook вручную:');
  console.log(`   Откройте в браузере:\n   ${setWebhookUrl}`);
}

console.log('\n📋 Инструкция по ручной установке:');
console.log('1. Если деплой не удался, выполните:');
console.log(`   supabase functions deploy ${FUNCTION_NAME}`);
console.log('2. Установите secrets в Supabase Dashboard:');
console.log('   Settings -> Edge Functions -> Add secret');
console.log('   - TELEGRAM_BOT_TOKEN');
console.log('   - SUPABASE_SERVICE_ROLE_KEY');
console.log('3. Откройте в браузере:');
console.log(`   ${setWebhookUrl}`);
