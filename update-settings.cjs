// Пробуем создать новую функцию parse-case-v2
const fs = require('fs');
const path = require('path');

const FUNCTION_NAME = 'parse-case';
const TOKEN = 'sbp_3516c90745f1fb3ceea1a990d2397883138f161b';
const PROJECT_REF = 'qhiietjvfuekfaehddox';

// Читаем код функции
const code = fs.readFileSync(path.join(__dirname, 'supabase/functions/parse-case/index.ts'), 'utf8');

async function deployNew() {
  console.log('Создание новой функции parse-case-v2...');
  
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  
  const body = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="file"; filename="index.ts"\r\n`,
    `Content-Type: application/typescript\r\n\r\n`,
    code,
    `\r\n`,
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="entrypoint_path"\r\n\r\n`,
    `index.ts`,
    `\r\n`,
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="verify_jwt"\r\n\r\n`,
    `false`,
    `\r\n`,
    `--${boundary}--\r\n`
  ].join('');

  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions?slug=parse-case-v2`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: body
  });

  console.log('Статус:', response.status);
  const text = await response.text();
  console.log('Ответ:', text);
}

deployNew().catch(console.error);
