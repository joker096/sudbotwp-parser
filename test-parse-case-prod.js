import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Инициализируем клиент Supabase
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function testParseCaseFunction() {
    console.log('=== Тестирование parse-case function в Supabase ===');
    
    try {
        // Читаем тестовые данные
        const html1 = fs.readFileSync('test-data1.html', 'utf8');
        const html2 = fs.readFileSync('test-data2.html', 'utf8');
        
        // Тест 1: HTML 1
        console.log('\n=== Тест 1: HTML 1 ===');
        const { data: data1, error: error1 } = await supabase.functions.invoke('parse-case', {
            body: { html: html1 }
        });
        
        if (error1) {
            console.error('Ошибка:', error1);
        } else {
            console.log('Успех!');
            console.log('Номер дела:', data1.number);
            console.log('Суд:', data1.court);
            console.log('Статус:', data1.status);
            console.log('Дата:', data1.date);
            console.log('Категория:', data1.category);
            console.log('Судья:', data1.judge);
            console.log('Уникальный ID:', data1.judicialUid);
            console.log('Событий:', data1.events.length);
            console.log('Обжалований:', data1.appeals.length);
        }
        
        // Тест 2: HTML 2
        console.log('\n=== Тест 2: HTML 2 ===');
        const { data: data2, error: error2 } = await supabase.functions.invoke('parse-case', {
            body: { html: html2 }
        });
        
        if (error2) {
            console.error('Ошибка:', error2);
        } else {
            console.log('Успех!');
            console.log('Номер дела:', data2.number);
            console.log('Суд:', data2.court);
            console.log('Статус:', data2.status);
            console.log('Дата:', data2.date);
            console.log('Категория:', data2.category);
            console.log('Судья:', data2.judge);
            console.log('Уникальный ID:', data2.judicialUid);
            console.log('Событий:', data2.events.length);
            console.log('Обжалований:', data2.appeals.length);
        }
        
        // Проверка совпадения司法Uid
        if (data1?.judicialUid && data2?.judicialUid) {
            if (data1.judicialUid === data2.judicialUid) {
                console.log('\n✅ Уникальный идентификатор дела совпадает:', data1.judicialUid);
            } else {
                console.log('\n⚠️ Уникальные идентификаторы не совпадают');
                console.log('HTML 1:', data1.judicialUid);
                console.log('HTML 2:', data2.judicialUid);
            }
        }
        
        // Проверка даты
        if (data1?.date && data2?.date) {
            const date1 = new Date(data1.date.split('.').reverse().join('-'));
            const date2 = new Date(data2.date.split('.').reverse().join('-'));
            
            if (date1 < date2) {
                console.log('✅ Дата первой инстанции предшествует апелляции');
            } else {
                console.log('⚠️ Дата апелляции предшествует первой инстанции');
                console.log('HTML 1:', data1.date);
                console.log('HTML 2:', data2.date);
            }
        }
        
    } catch (error) {
        console.error('Ошибка при тестировании:', error);
    }
}

// Запускаем тесты
testParseCaseFunction();
