import fs from 'fs';
import http from 'http';

// Тест для parse-case function
async function testParseCaseFunction() {
    console.log('=== Тестирование parse-case function ===');
    
    try {
        // Тест 1: HTML 1
        const html1 = fs.readFileSync('test-data1.html', 'utf8');
        const response1 = await callParseCaseFunction(html1);
        console.log('=== Результат для HTML 1 ===');
        console.log(response1);
        
        // Тест 2: HTML 2
        const html2 = fs.readFileSync('test-data2.html', 'utf8');
        const response2 = await callParseCaseFunction(html2);
        console.log('\n=== Результат для HTML 2 ===');
        console.log(response2);
        
    } catch (error) {
        console.error('Ошибка при тестировании:', error);
    }
}

// Функция для вызова parse-case через локальный сервер
async function callParseCaseFunction(html) {
    return new Promise((resolve, reject) => {
        // Для теста используем локальный сервер
        const options = {
            hostname: 'localhost',
            port: 54321, // Порт, на котором запущен supabase function
            path: '/parse-case',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        // Отправляем HTML в тело запроса
        req.write(JSON.stringify({ html }));
        req.end();
    });
}

// Запускаем тесты
testParseCaseFunction();
