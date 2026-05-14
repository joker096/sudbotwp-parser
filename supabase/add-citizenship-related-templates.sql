-- Дополнительные шаблоны для получения гражданства РФ

-- 1. Согласие законных представителей (для несовершеннолетних)
INSERT INTO document_templates (name, description, category, icon, content, is_active)
SELECT 
  'Согласие законных представителей', 
  'Согласие родителей/опекунов на подачу заявления о гражданстве РФ для ребенка до 18 лет', 
  'Гражданство', 
  '👨‍👩‍👧',
  $$<div class="document-template">
<h1 style="text-align: center; font-size: 16pt; font-weight: bold;">Согласие законных представителей</h1>
<p style="text-align: center;">на приобретение ребенком гражданства Российской Федерации</p>

<p><strong>Мы, нижеподписавшиеся:</strong></p>

<table style="width: 100%; margin: 20pt 0;">
  <tr>
    <td style="width: 50%;"><strong>1. Родитель 1:</strong><br><input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt;" placeholder="ФИО, паспорт"></td>
    <td style="width: 50%;"><strong>2. Родитель 2:</strong><br><input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt;" placeholder="ФИО, паспорт"></td>
  </tr>
</table>

<p><strong>Соглашаемся на:</strong></p>
<ol>
  <li>принятие в гражданство Российской Федерации нашего ребенка: <input type="text" style="border: 1pt solid black; padding: 2pt;" placeholder="ФИО ребенка"></li>
  <li>выход из иного гражданства (при необходимости)</li>
</ol>

<p style="text-align: right; margin-top: 40pt;">
  Дата: <input type="text" style="width: 80pt; border: 1pt solid black;"> 
  Подписи: __________________ __________________
</p>

<style>.document-template { font-family: 'Times New Roman', serif; }</style>
$$,
  true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Согласие законных представителей');

-- 2. Заявление об отказе от предыдущего гражданства
INSERT INTO document_templates (name, description, category, icon, content, is_active)
SELECT 
  'Заявление об отказе от предыдущего гражданства', 
  'Заявление о выходе из гражданства иностранного государства (для общего порядка)', 
  'Гражданство', 
  '❌',
  $$<div class="document-template">
<h1 style="text-align: center;">Заявление</h1>
<h2 style="text-align: center;">о выходе из гражданства [Название государства]</h2>

<p><strong>Прошу зарегистрировать мой выход из гражданства [страна].</strong></p>

<table style="width: 100%;">
  <tr><td style="width: 30%;"><strong>ФИО:</strong></td><td><input type="text" style="width: 100%; border-bottom: 1pt solid black;"></td></tr>
  <tr><td><strong>Дата рождения:</strong></td><td><input type="text" style="border-bottom: 1pt solid black;" placeholder="__.__.____"></td></tr>
  <tr><td><strong>Паспорт:</strong></td><td><input type="text" style="border-bottom: 1pt solid black;"></td></tr>
</table>

<p style="text-align: right;">Дата: ______ Подпись: ________</p>
<style>.document-template { font-family: 'Times New Roman', serif; }</style>
$$,
  true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Заявление об отказе от предыдущего гражданства');

-- 3. Автобиография
INSERT INTO document_templates (name, description, category, icon, content, is_active)
SELECT 
  'Автобиография', 
  'Образец автобиографии для заявления о гражданстве РФ', 
  'Гражданство', 
  '📖',
  $$<div class="document-template">
<h1 style="text-align: center;">АВТОБИОГРАФИЯ</h1>

<p>Я, <input type="text" style="border-bottom: 1pt solid black;">, родился(ась) "<input type="text" style="border-bottom: 1pt solid black;" placeholder="__.__.____"> в <input type="text" style="border-bottom: 1pt solid black;">.</p>

<p>Образование: ...</p>
<p>Трудовая деятельность: ...</p>
<p>С 20__ г. проживаю в РФ по адресу: ...</p>

<p style="text-align: right; margin-top: 40pt;">"<input type="text" style="border-bottom: 1pt solid black;" placeholder="__.__.____"> Подпись: <input type="text" style="border-bottom: 1pt solid black;"></p>

<style>.document-template { font-family: 'Times New Roman', serif; line-height: 1.5; }</style>
$$,
  true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Автобиография');

-- 4. Анкета установления личности
INSERT INTO document_templates (name, description, category, icon, content, is_active)
SELECT 
  'Анкета для установления личности', 
  'Анкета-опросник для подтверждения личности при получении гражданства', 
  'Гражданство', 
  '🆔',
  $$<div class="document-template">
<h2 style="text-align: center;">АНКЕТА для установления личности</h2>

<table style="width: 100%; border-collapse: collapse;">
  <tr><td style="width: 40%;"><strong>1. ФИО:</strong></td><td><input type="text" style="width: 100%; border: 1pt solid black;"></td></tr>
  <tr><td>2. Родители:</td><td><input type="text" style="width: 100%; border: 1pt solid black;"></td></tr>
  <!-- 30+ fields typically -->
</table>
<style>.document-template { font-family: 'Times New Roman', serif; }</style>
$$,
  true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Анкета для установления личности');

