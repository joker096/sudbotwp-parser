import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Загружаем .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length) process.env[key.trim()] = value.join('=').trim();
  });
}

// Supabase client с сервисным ключом
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Шаблоны CTA
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

// Категории
const CATEGORIES = {
  'банкротство': 'Инструкции',
  'иск': 'Инструкции', 
  'развод': 'Советы',
  'арбитраж': 'Инструкции',
  'пошлина': 'Новости'
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
  return 'Инструкции';
}

function generatePost(title, options = {}) {
  const slug = options.slug || generateSlug(title);
  const category = options.category || detectCategory(title);
  const ctaUrl = options.ctaUrl || '/lawyers';
  
  const lawsTable = TEMPLATES.table(
    ['Нормативный акт', 'Статья', 'Применение'],
    [['ГК РФ', 'Статья 15', 'Общие правила'], ['ГПК РФ', 'Статья 110', 'Процессуальные'], ['ФЗ № 131', 'Статья 5', 'Услуги']]
  );
  
  const methodsTable = TEMPLATES.table(
    ['Способ', 'Стоимость', 'Срок', 'Рекомендация'],
    [['Самостоятельно', 'от 0 ₽', '3 месяца', 'Только при опыте'], ['Через Госуслуги', 'бесплатно', '2 недели', 'Возможен'], ['Через юриста', 'от 5000 ₽', '1 месяц', 'Оптимально']]
  );
  
  const ctaBox = TEMPLATES.ctaBox('Нужна консультация по вашему случаю?', ctaUrl, 'Опытные юристы подскажут');
  const ctaGosuslugi = TEMPLATES.ctaBoxGosuslugi(ctaUrl);
  const faqSchema = TEMPLATES.faqSchema([
    { question: 'Сколько времени занимает процесс?', answer: 'Обычно от 1 до 3 месяцев.' },
    { question: 'Можно ли выполнить онлайн?', answer: 'Да, через Госуслуги.' },
    { question: 'Какая стоимость услуг?', answer: 'От 400 ₽ до 5000 ₽.' }
  ]);
  
  const content = `<h2>Введение</h2>
<p>В 2026 году ${title.toLowerCase()} становится ключевой темой для граждан.</p>

<h2>Что такое ${title}?</h2>
<p>${title} — это процесс, регулируемый законодательством.</p>
<ul><li>ГК РФ</li><li>ГПК РФ</li><li>ФЗ</li></ul>
${lawsTable}

<h2>Когда нужен ${title}?</h2>
<p>В следующих случаях:</p>
<ol><li>При наличии правовой необходимости</li><li>При конфликте интересов</li><li>При необходимости официального документа</li></ol>
${ctaBox}

<h2>Пошаговый процесс</h2>
<h3>1. Подготовка</h3><p>Соберите документы.</p>
<h3>2. Заполнение форм</h3><p>Заполните реквизиты.</p>
<h3>3. Подача</h3><p>Через <a href="/calculator">калькулятор</a>.</p>

<h2>Сравнение способов</h2>
${methodsTable}

<h2>Частые ошибки</h2>
<ul><li>Неправильное заполнение реквизитов</li><li>Отсутствие документов</li><li>Пропуск сроков</li></ul>
${ctaGosuslugi}

<h2>Отзывы экспертов</h2>
<p><em>Ключевой совет: доверьтесь профессионалам.</em></p>

${faqSchema}

<h2>Заключение</h2>
<p>${title} — сложный процесс. <a href="/lawyers">Обратитесь к специалистам</a>.</p>
`;

  return {
    title,
    slug,
    excerpt: `Подробное руководство по ${title.toLowerCase()}.`,
    content,
    category_id: options.categoryId || 2,
    author: options.author || 'Админ',
    read_time: '5 мин',
    published: true,
    seo_title: `${title}: инструкция 2026`,
    seo_description: `Узнайте всё о ${title.toLowerCase()}.`,
    seo_keywords: title.toLowerCase().replace(/\s+/g, ', ') + ', юрист, суд'
  };
}

// Получить ID категории из БД
async function getCategoryId(categoryName) {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('id')
    .eq('name', categoryName)
    .single();
  
  if (error || !data) return 2; // Инструкции по умолчанию
  return data.id;
}

// Создать категорию если нет
async function ensureCategory(name) {
  let catId = await getCategoryId(name);
  if (catId) return catId;
  
  const { data, error } = await supabase
    .from('blog_categories')
    .insert([{ name, slug: name.toLowerCase() }])
    .select('id')
    .single();
  
  return data?.id || 2;
}

// Загрузить пост в БД
async function publishToSupabase(post) {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert([{
      ...post,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('  ERROR:', error.message);
    return false;
  }
  
  console.log('  Published:', data[0]?.slug);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Blog Post Publisher
Usage: node scripts/publish-posts.mjs --topics topics.txt

Options:
  --topics <file>   Topics file (required)
  --dry-run         Generate without publishing
  --help            Show this help
`);
    process.exit(0);
  }

  const topicsFile = args.includes('--topics') ? args[args.indexOf('--topics') + 1] : null;
  const dryRun = args.includes('--dry-run');

  if (!topicsFile) {
    console.error('ERROR: --topics required');
    process.exit(1);
  }

  const topics = fs.readFileSync(topicsFile, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  console.log(`Found ${topics.length} topics. Publishing...\n`);

  for (const topic of topics) {
    console.log('Topic:', topic);
    const post = generatePost(topic);
    post.category_id = await ensureCategory(post.category);
    
    if (!dryRun) {
      await publishToSupabase(post);
    }
  }

  console.log('\nDone!');
}

main();