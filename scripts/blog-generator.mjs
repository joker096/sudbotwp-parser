import fs from 'fs';
import path from 'path';

// Шаблоны для генерации контента
const TEMPLATES = {
  ctaBox: (text, url, buttonText = 'Узнать подробнее') => 
    `<div class="cta-box">\n  <p><strong>${text}</strong></p>\n  <a href="${url}" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;">${buttonText}</a>\n</div>`,

  ctaBoxGosuslugi: (url = '/lawyers') =>
    `<div class="cta-box-gosuslugi">\n  <p><strong>Не хотите разбираться в документах?</strong></p>\n  <p>Юрист сформирует иск и подскажет, какие файлы прикрепить.</p>\n  <a href="${url}" class="cta-button" rel="nofollow noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;">Профессионалы своего дела</a>\n</div>`,

  table: (headers, rows) => {
    const headerHtml = headers.map(h => `<th style="border:1px solid #ddd;padding:12px;text-align:left;background:#f5f5f5;">${h}</th>`).join('\n        ');
    const rowsHtml = rows.map(row => 
      `<tr>\n        ${row.map(cell => `<td style="border:1px solid #ddd;padding:12px;">${cell}</td>`).join('\n        ')}\n      </tr>`
    ).join('\n');
    return `<table style="width:100%;border-collapse:collapse;margin:20px 0;">\n        <thead>\n          <tr>\n            ${headerHtml}\n          </tr>\n        </thead>\n        <tbody>\n          ${rowsHtml}\n        </tbody>\n      </table>`;
  },

  faqSchema: (faq) => {
    const questions = faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }));
    return `<script type="application/ld+json">\n${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": questions
    }, null, 2)}\n</script>`;
  }
};

// Категории и их настройки
const CATEGORIES = {
  'банкротство': { category: 'Инструкции', faq: [
    { question: 'Кто может подать на банкротство?', answer: 'Граждане РФ, находящиеся в долговой кредите, с доходом ниже установленного минимума.' },
    { question: 'Сколько длится процедура банкротства?', answer: 'От 3 до 12 месяцев в зависимости от сложности дела.' },
    { question: 'Нужна ли имущество для банкротства?', answer: 'Да, требуется указать все имущество и обязательства.' }
  ]},
  'иск': { category: 'Инструкции', faq: [
    { question: 'Какие документы нужны для подачи иска?', answer: 'Заявление, копии паспорта, документы-основания требования.' },
    { question: 'Где подавать исковое заявление?', answer: 'В суд по месту жительства ответчика или месту производства деяния.' },
    { question: 'Сколько стоит подача иска?', answer: 'Госпошлина от 400 до 60000 рублей в зависимости от суммы иска.' }
  ]},
  'развод': { category: 'Советы', faq: [
    { question: 'Как разделить имущество при разводе?', answer: 'По равным долям или по соглашению, если оно есть.' },
    { question: 'Нужна ли я заявление о разводе?', answer: 'Да, форма Н-105, подаётся в ЗАГС.' },
    { question: 'Можно ли развестись без суда?', answer: 'Да, если есть дети — только с согласия второго супруга.' }
  ]},
  'арбитраж': { category: 'Инструкции', faq: [
    { question: 'В какой арбитражный суд подавать жалобу?', answer: 'По месту нахождения ответчика.' },
    { question: 'Срок подачи жалобы в арбитраж?', answer: '1 месяц с момента получения решения.' }
  ]},
  'пошлина': { category: 'Новости', faq: [
    { question: 'Где узнать размер госпошлины?', answer: 'На сайте ФССП или в калькуляторе.' },
    { question: 'Можно ли получить поручение?', answer: 'Да, если вы не можете явиться в суд.' }
  ]}
};

function generateSlug(title) {
  return title.toLowerCase()
    .replace(/[^а-яёа-яё0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectCategory(title) {
  const lower = title.toLowerCase();
  for (const key of Object.keys(CATEGORIES)) {
    if (lower.includes(key)) return CATEGORIES[key];
  }
  return { category: 'Инструкции', faq: [] };
}

function generateOutline(topic) {
  const cat = detectCategory(topic);
  return `# План статьи: ${topic}

## Введение
- Актуальность темы для 2026 года
- Краткое описание проблемы
- Цель статьи и как она поможет читателю

## Основная часть
1. Что такое ${topic}?
   - Определение и ключевые понятия
   - Законодательная база и нормативные акты

2. Когда нужен ${topic}?
   - Ситуации применения
   - Перечень необходимых документов

3. Пошаговый процесс
   - Подготовка документов (чек-лист)
   - Этапы выполнения с примерами
   - Сроки и требования

4. Сравнение с аналогами
   - Плюсы и минусы разных подходов
   - Сравнительная таблица вариантов

5. Частые ошибки
   - Что может пойти не так
   - Как избежать проблем

## Отзывы экспертов
- Цитаты юристов с опытом
- Кейсы из практики
- Рекомендации от специалистов

## Заключение
- Итоги
- Рекомендации для действий
- Призыв к действию (CTA)

## FAQ (часто задаваемые вопросы)
${cat.faq.map((f, i) => `
Вопрос ${i + 1}: ${f.question}
Ответ: ${f.answer}`).join('\n') || `
- Вопрос-Ответ 1 (вставить тематический)
- Вопрос-Ответ 2 (вставить тематический)
- Вопрос-Ответ 3 (вставить тематический)`}
`;
}

function generatePost(topic, options = {}) {
  const slug = options.slug || generateSlug(topic);
  const cat = detectCategory(topic);
  const category = options.category || cat.category;
  const ctaUrl = options.ctaUrl || '/lawyers';
  
  const lawsTable = TEMPLATES.table(
    ['Нормативный акт', 'Статья', 'Применение'],
    [
      ['ГК РФ', 'Статья 15', 'Общие правила'],
      ['ГПК РФ', 'Статья 110', topic.includes('банкротство') ? 'Банкротство' : 'Процессуальные правила'],
      ['ФЗ № 131', 'Статья 5', 'Профессиональные услуги']
    ]
  );
  
  const methodsTable = TEMPLATES.table(
    ['Способ', 'Стоимость', 'Срок', 'Рекомендация'],
    [
      ['Самостоятельно', 'от 0 ₽', '3 месяца', 'Только при опыте'],
      ['Через Госуслуги', 'бесплатно', '2 недели', topic.includes('госуслуги') ? 'Рекомендуется' : 'Возможен'],
      ['Через юриста', 'от 5000 ₽', '1 месяц', 'Оптимально для сложных случаев']
    ]
  );
  
  const ctaBox = TEMPLATES.ctaBox('Нужна консультация по вашему случаю?', ctaUrl, 'Опытные юристы подскажут');
  const ctaGosuslugi = TEMPLATES.ctaBoxGosuslugi(ctaUrl);
  const faqSchema = TEMPLATES.faqSchema(cat.faq.length > 0 ? cat.faq : [
    { question: `Сколько времени занимает ${topic.toLowerCase()}?`, answer: 'Обычно от 1 до 3 месяцев в зависимости от сложности.' },
    { question: 'Можно ли выполнить процесс онлайн?', answer: 'Да, через Госуслуги или личный кабинет суда.' },
    { question: 'Какая минимальная стоимость услуг?', answer: 'Через суд — от 400 ₽ госпошлины, через юриста — от 5000 ₽.' }
  ]);
  
  const content = `<h2>Введение</h2>
<p>В 2026 году ${topic.toLowerCase()} становится ключевой темой для граждан, сталкивающихся с правовыми вопросами. Мы подготовили подробное руководство, которое поможет разобраться в процессе и выбрать оптимальный путь решения.</p>

<h2>Что такое ${topic}?</h2>
<p>${topic} — это правовой инструмент, регламентируемый <a href="/pravo">действующим законодательством</a>. Основные нормы:</p>
<ul>
  <li>Гражданский кодекс РФ (части 1 и 2)</li>
  <li>Гражданский процессуальный кодекс РФ</li>
  <li>Федеральные законы, регулирующие процесс</li>
</ul>

${lawsTable}

<h2>Когда требуется ${topic}?</h2>
<p>Процедура применяется в следующих случаях:</p>
<ol>
  <li>При наличии правовой необходимости и правомерного основания</li>
  <li>При конфликте интересов сторон и невозможности прийти к соглашению</li>
  <li>При необходимости официального документа или решения суда</li>
</ol>

${ctaBox}

<h2>Пошаговый процесс выполнения</h2>
<p>Процесс делится на три основных этапа:</p>

<h3>Этап 1: Подготовка документов</h3>
<p>Соберите все необходимые документы. Важно проверить их полноту и соответствие требованиям.</p>

<h3>Этап 2: Заполнение форм</h3>
<p>Заполните формы с указанием всех обязательных реквизитов. Внимательно изучите порядок заполнения.</p>

<h3>Этап 3: Подача</h3>
<p>Подайте документы через <a href="/calculator">онлайн-калькулятор</a> или в суд.</p>

<h2>Сравнение способов решения</h2>
${methodsTable}

<h2>Частые ошибки и как их избежать</h2>
<p>При выполнении процесса часто допускаются следующие ошибки:</p>
<ul>
  <li>Неправильное заполнение реквизитов — используйте шаблоны и проверяйте орфографию</li>
  <li>Отсутствие необходимых документов — собирайте пакет полностью заранее</li>
  <li>Пропуск сроков — заранее проверьте график работы суда</li>
</ul>

${ctaGosuslugi}

<h2>Отзывы экспертов</h2>
<p><em>"Главное правило: не торопитесь с документами. Лучше потратить время на подготовку, чем потом исправлять ошибки."</em> — Иванов А.В., юрист стажем 15 лет</p>
<p><em>"Самостоятельные попытки часто оборачиваются потерей времени. Профессионалы видят нюансы, которые вы пропустите."</em> — Петрова Е.С., доцент юридического факультета</p>

${faqSchema}

<h2>Заключение</h2>
<p>${topic} — сложный процесс, который требует внимательного подхода. Главное — понимать все нюансы и правильно подойти к исполнению. Если вы сомневаетесь в своих силах, <a href="/lawyers">обратитесь к специалистам</a>.</p>

<p>Проверьте свои права и риски с помощью <a href="/calculator">калькулятора</a>.</p>
`;

  return {
    title: topic,
    slug,
    excerpt: `Подробное руководство по ${topic.toLowerCase()}. Пошаговая инструкция, примеры и рекомендации.`,
    content,
    category,
    author: options.author || 'Админ',
    readTime: '5 мин',
    published: options.published !== false,
    seo_title: `${topic}: инструкция 2026 года`,
    seo_description: `Узнайте всё о ${topic.toLowerCase()}. Пошаговое руководство, таблицы сравнения, отзывы экспертов.`,
    seo_keywords: topic.toLowerCase().replace(/\s+/g, ', ') + ', юрист, суд, закон',
    og_title: `${topic}: полное руководство 2026`,
    og_description: `Подробное руководство по ${topic.toLowerCase()}.`,
    og_image: options.ogImage || ''
  };
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Blog Post Generator
Usage: node scripts/blog-generator.mjs [options]

Options:
  --topics <file>    Read topics from file
  --output <dir>     Output directory (default: ./generated-posts)
  --outline          Generate markdown outlines only
  --json             Include JSON metadata files
  --cta-url <url>    Custom CTA link (default: /lawyers)
  --help, -h        Show this help

Examples:
  node scripts/blog-generator.mjs --topics topics.txt
  node scripts/blog-generator.mjs --topics topics.txt --outline
`);
    process.exit(0);
  }

  const topicsFile = args.includes('--topics') ? args[args.indexOf('--topics') + 1] : null;
  const outputDir = args.includes('--output') ? args[args.indexOf('--output') + 1] : path.join(process.cwd(), 'generated-posts');
  const outlineOnly = args.includes('--outline');
  const includeJson = args.includes('--json');
  const ctaUrl = args.includes('--cta-url') ? args[args.indexOf('--cta-url') + 1] : '/lawyers';

  let topics = [];
  
  if (topicsFile) {
    const fileContent = fs.readFileSync(topicsFile, 'utf-8');
    topics = fileContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  } else {
    const stdin = fs.readFileSync(0, 'utf-8');
    topics = stdin.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  topics.forEach((topic, index) => {
    const slug = generateSlug(topic);
    const ext = outlineOnly ? 'md' : 'html';
    const filename = `${String(index + 1).padStart(3, '0')}-${slug}.${ext}`;
    const filepath = path.join(outputDir, filename);
    
    const content = outlineOnly 
      ? generateOutline(topic)
      : generatePost(topic, { ctaUrl }).content;
    
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`Generated: ${filename}`);
    
    if (includeJson && !outlineOnly) {
      const post = generatePost(topic, { ctaUrl });
      const jsonFilename = `${String(index + 1).padStart(3, '0')}-${slug}.json`;
      fs.writeFileSync(path.join(outputDir, jsonFilename), JSON.stringify(post, null, 2), 'utf-8');
    }
  });

  const indexPath = path.join(outputDir, 'index.json');
  const index = topics.map((topic, index) => ({
    id: index + 1,
    title: topic,
    slug: generateSlug(topic),
    date: new Date().toISOString()
  }));
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`Generated: index.json (${topics.length} posts)`);
}

main();