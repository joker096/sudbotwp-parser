-- Добавление шаблона "Заявление о выдаче разрешения на временное проживание"
-- Приказ МВД РФ от 14.04.2003 N 250 (ред. от 10.05.2007)
-- Категория: Гражданство

INSERT INTO document_templates (name, description, category, icon, content, is_active)
SELECT 
  'Заявление о выдаче разрешения на временное проживание', 
  'Приказ МВД РФ от 14.04.2003 N 250 (ред. от 10.05.2007)',
  'Гражданство', 
  '🏠',
  $$<div class="document-template">
<h1 style="text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 20pt;">Заявление</h1>
<h2 style="text-align: center; font-size: 14pt; margin-bottom: 30pt;">о выдаче разрешения на временное проживание</h2>

<p style="text-align: center; font-size: 11pt; margin-bottom: 40pt;">в отделении по вопросам миграции УМВД России</p>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20pt;">
  <tr>
    <td style="width: 40%; padding: 4pt; vertical-align: top;">
      <strong>1. Фамилия, имя, отчество (при наличии):</strong><br>
      <input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt; font-family: 'Times New Roman', serif; font-size: 12pt;" placeholder="Введите ФИО">
    </td>
    <td style="width: 60%; padding: 4pt; vertical-align: top;">
      <strong>2. Дата рождения:</strong> <input type="text" style="width: 80pt; border: 1pt solid black; padding: 2pt;" placeholder="дд.мм.гггг"> 
      <strong>место рождения:</strong><br>
      <input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt; font-family: 'Times New Roman', serif; font-size: 12pt;" placeholder="Введите место рождения">
    </td>
  </tr>
  <tr>
    <td style="padding: 4pt; vertical-align: top;">
      <strong>3. Гражданство:</strong><br>
      <input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt;" placeholder="Укажите гражданство">
    </td>
    <td style="padding: 4pt; vertical-align: top;">
      <strong>4. Паспортные данные:</strong><br>
      <input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt;" placeholder="серия ___ № ________ выдан _______________">
    </td>
  </tr>
</table>

<p><strong>5. Адрес регистрации за пределами РФ:</strong><br>
<textarea style="width: 100%; height: 60pt; border: 1pt solid black; padding: 4pt; font-family: 'Times New Roman', serif; font-size: 12pt;" placeholder="Укажите полный адрес"></textarea></p>

<p><strong>6. Основание для получения РВП:</strong><br>
<select style="width: 100%; border: 1pt solid black; padding: 4pt; font-family: 'Times New Roman', serif; font-size: 12pt;">
  <option>брак с гражданином РФ</option>
  <option>рождение в РСФСР/РФ</option>
  <option>нетрудоспособный родитель - гражданин РФ</option>
  <option>другие основания</option>
</select></p>

<p><strong>7. Место получения РВП:</strong><br>
<input type="text" style="width: 100%; border: 1pt solid black; padding: 2pt;" placeholder="Регион РФ, город, улица, дом"></p>

<p style="text-align: right; margin-top: 40pt;">
  <strong>Дата:</strong> <input type="text" style="width: 100pt; border: 1pt solid black; padding: 2pt;" placeholder="дд.мм.гггг">
</p>
<p style="text-align: right;">
  <strong>Подпись:</strong> _______________ /<input type="text" style="border-bottom: 1pt solid black; width: 200pt; padding: 0; font-family: 'Times New Roman', serif;" placeholder="ФИО">
</p>

<div style="margin-top: 30pt; font-size: 10pt; text-align: justify;">
  <strong>Приложения (копии):</strong><br>
  1. Паспорт или иной документ, удостоверяющий личность.<br>
  2. Документ о регистрации по месту пребывания.<br>
  3. 2 фотографии 3,5×4,5 см.<br>
  4. Документы, подтверждающие основание для РВП.<br>
  5. Медицинское заключение.<br>
  6. Справка об отсутствии судимости.<br>
  7. Квитанция об уплате госпошлины.
</div>

<style>
  .document-template { 
    font-family: 'Times New Roman', serif; 
    max-width: 800px; 
    margin: 0 auto; 
    padding: 20px; 
    line-height: 1.4;
  }
  .document-template input, .document-template textarea, .document-template select { 
    font-family: inherit; 
    font-size: 12pt;
  }
  .document-template table td { 
    border: none; 
  }
  @media print { 
    body { margin: 0; } 
    .document-template { padding: 0; } 
  }
</style>
$$,
  true
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = 'Заявление о выдаче разрешения на временное проживание');

-- Verify insertion
SELECT id, name, category, icon FROM document_templates 
WHERE name = 'Заявление о выдаче разрешения на временное проживание';

