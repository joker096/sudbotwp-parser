// Скрипт для создания туннеля к локальному серверу
const localtunnel = require('localtunnel');

const PORT = 3000;

async function createTunnel() {
  console.log(`Создание туннеля к порту ${PORT}...`);
  
  try {
    const tunnel = await localtunnel({ port: PORT });
    
    console.log(`✅ Туннель создан!`);
    console.log(`URL: ${tunnel.url}`);
    console.log(`\nИспользуйте этот URL в качестве VITE_PARSE_CASE_URL`);
    
    tunnel.on('close', () => {
      console.log('Туннель закрыт');
    });
    
    tunnel.on('error', (err) => {
      console.error('Ошибка туннеля:', err);
    });
    
  } catch (error) {
    console.error('Не удалось создать туннель:', error.message);
  }
}

createTunnel();
