-- Добавление шаблона заявления о принятии в гражданство (для граждан старше 18 лет) с полным содержимым
INSERT INTO document_templates (name, description, category, icon, content, is_active)
SELECT 
  'Заявление о принятии в гражданство', 
  'Заявление о принятии в гражданство РФ в общем порядке для лиц старше 18 лет (Приказ МВД России от 27.09.2023 № 702)', 
  'Гражданство', 
  '🆙',
  $$<div class="document-template citizenship-form">
<h1 style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 30pt;">Заявление</h1>
<h2 style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20pt;">о приеме в гражданство Российской Федерации</h2>
<p style="text-align: center; font-size: 12pt; margin-bottom: 10pt;">в общем порядке</p>
<p style="text-align: center; font-size: 10pt; margin-bottom: 40pt;">(для лиц, достигших возраста 18 лет)</p>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20pt;">
  <tr>
    <td style="width: 40%; padding: 5pt; vertical-align: top;">
      <strong>1. Фамилия, имя, отчество</strong><br>
      <input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt; font-family: Times New Roman; font-size: 12pt;" placeholder="Введите ФИО">
    </td>
    <td style="width: 60%; padding: 5pt; vertical-align: top;">
      <strong>2. Дата рождения:</strong> <input type="text" style="width: 80pt; border: 1pt solid black; padding: 2pt;" placeholder="__.__.____"> 
      <strong>место рождения:</strong><br>
      <input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt; font-family: Times New Roman; font-size: 12pt;" placeholder="Введите место рождения">
    </td>
  </tr>
</table>

<p><strong>3. Пол:</strong> ☐ мужской ☐ женский</p>

<p><strong>4. Гражданство (подданство):</strong> 
<input type="text" style="width: 200pt; border: 1pt solid black; padding: 2pt;" placeholder="Укажите гражданство"></p>

<table style="width: 100%; border-collapse: collapse; margin: 20pt 0;">
  <tr>
    <td style="width: 25%; padding: 5pt; vertical-align: top;"><strong>5. Место жительства в Российской Федерации:</strong></td>
    <td style="width: 75%; padding: 5pt;">
      <input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt;" placeholder="Индекс, субъект РФ, город, улица, дом, корпус, квартира">
    </td>
  </tr>
</table>

<!-- More fields: contact, family, work/edu, grounds, docs -->
<p><strong>6. Контактный телефон:</strong> <input type="text" style="border: 1pt solid black; padding: 2pt;" placeholder="+7 (___) ___-__-__"></p>

<p><strong>7. Основание для приема в гражданство РФ:</strong><br>
<textarea style="width: 100%; height: 100pt; border: 1pt solid black; padding: 5pt; font-family: Times New Roman; font-size: 12pt;" placeholder="Укажите основание (п. "а" ст. 13, п. "б" ст. 14 и т.д.)"></textarea></p>

<p style="text-align: right; margin-top: 40pt;">
  <strong>Дата:</strong> <input type="text" style="width: 80pt; border: 1pt solid black; padding: 2pt;" placeholder="__.__.____">
</p>
<p style="text-align: right;">
  <strong>Подпись:</strong> _______________ /<input type="text" style="border-bottom: 1pt solid black; width: 150pt; padding: 0; font-family: Times New Roman;" placeholder="ФИО">
</p>

<div style="margin-top: 40pt; font-size: 10pt; text-align: justify;">
  <strong>Приложения:</strong><br>
  1. Автобиография.<br>
  2. Копия документа, удостоверяющего личность.<br>
  3. Копии документов о знании русского языка, истории РФ, основ законодательства.<br>
  4. Документы об отказе от иного гражданства (если требуется).<br>
  5. Иные документы.<br>
</div>

<style>
  .document-template { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 20px; }
  .document-template input, .document-template textarea { font-family: inherit; }
  .document-template table td { border: none; }
  @media print { body { margin: 0; } .document-template { padding: 0; } }
</style>
$$,
  true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Заявление о принятии в гражданство');

