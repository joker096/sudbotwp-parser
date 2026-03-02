import fs from 'fs';
import { parseCaseData } from './simple-test-server.js';

async function testParseCase() {
    try {
        // Тест 1: HTML 1
        const html1 = fs.readFileSync('test-data1.html', 'utf8');
        const result1 = parseCaseData(html1);
        console.log('=== Результат для HTML 1 ===');
        console.log(JSON.stringify(result1, null, 2));
        
        // Тест 2: HTML 2
        const html2 = fs.readFileSync('test-data2.html', 'utf8');
        const result2 = parseCaseData(html2);
        console.log('\n=== Результат для HTML 2 ===');
        console.log(JSON.stringify(result2, null, 2));
        
        // Проверка совпадения judicialUid
        if (result1.judicialUid && result2.judicialUid && result1.judicialUid === result2.judicialUid) {
            console.log('\n✅ Уникальный идентификатор дела совпадает:', result1.judicialUid);
        } else {
            console.log('\n⚠️ Уникальные идентификаторы не совпадают');
        }
        
        // Проверка даты первой инстанции и апелляции
        const date1 = new Date(result1.date.split('.').reverse().join('-'));
        const date2 = new Date(result2.date.split('.').reverse().join('-'));
        if (date1 < date2) {
            console.log('✅ Дата первой инстанции предшествует апелляции');
        } else {
            console.log('⚠️ Дата апелляции предшествует первой инстанции');
        }
        
    } catch (error) {
        console.error('Ошибка при тестировании:', error);
    }
}

testParseCase();
