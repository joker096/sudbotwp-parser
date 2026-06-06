#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const CYRILLIC_MAP = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
  'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
  'щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
};

const CATEGORIES = {
  'банкротство': 'Инструкции', 'иск': 'Инструкции', 'развод': 'Советы',
  'арбитраж': 'Инструкции', 'пошлин': 'Новости', 'жалоб': 'Инструкции',
  'адвокат': 'Советы', 'потребител': 'Инструкции', 'гражданск': 'Инструкции',
  'расход': 'Инструкции', 'составлен': 'Инструкции', 'анализ': 'Инструкции',
  'обжалован': 'Инструкции', 'признан': 'Инструкции', 'сделк': 'Инструкции',
  'электрон': 'Инструкции', 'суд': 'Инструкции',
};

function transliterate(text) {
  return text.replace(/[а-яёА-ЯЁ]/g, ch => CYRILLIC_MAP[ch] || ch);
}

function generateSlug(title) {
  return transliterate(title.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectCategory(title) {
  const lower = title.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORIES)) {
    if (lower.includes(keyword)) return cat;
  }
  return 'Инструкции';
}

function cmdInit() {
  const topicsPath = path.join(process.cwd(), 'topics.txt');
  if (!fs.existsSync(topicsPath)) {
    console.error('ERROR: topics.txt not found in current directory');
    process.exit(1);
  }

  const topics = fs.readFileSync(topicsPath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  const entries = topics.map(title => {
    const slug = generateSlug(title);
    const category = detectCategory(title);
    return { title, slug, category };
  });

  const lines = [
    '# Batch Task: Генерация статей для блога sud.cvr.name',
    '',
    '## Инструкция для AI',
    '',
    'Сгенерируй уникальную экспертную статью на русском языке.',
    'Правила генерации и требования к контенту — в AGENTS.md, раздел "Правила контента".',
    '',
    'Формат сохранения: `generated-posts/<slug>.json`',
    'После сохранения выполни: `node scripts/generate.js done generated-posts/<slug>.json`',
    '',
    '---',
    '',
    '## Осталось заполнить',
    '',
  ];

  for (const e of entries) {
    lines.push(`- [ ] ${e.title}`);
    lines.push(`  - slug: ${e.slug}`);
    lines.push(`  - category: ${e.category}`);
    lines.push('');
  }

  lines.push('## Готово');
  lines.push('');

  fs.writeFileSync('BATCH_TASK.md', lines.join('\n'), 'utf-8');
  console.log(`Created BATCH_TASK.md with ${entries.length} topics.`);
}

function cmdDone(filePath) {
  if (!filePath) {
    console.error('Usage: node scripts/generate.js done <path-to-json>');
    process.exit(1);
  }

  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`ERROR: File not found: ${fullPath}`);
    process.exit(1);
  }

  const post = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  const targetSlug = post.slug;

  const batchPath = path.join(process.cwd(), 'BATCH_TASK.md');
  if (!fs.existsSync(batchPath)) {
    console.error('ERROR: BATCH_TASK.md not found');
    process.exit(1);
  }

  const content = fs.readFileSync(batchPath, 'utf-8');
  const lines = content.split('\n');

  let found = false;
  let total = 0;
  let done = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) total++;
    if (line.startsWith('- [x] ')) done++;

    if (line.startsWith('- [ ] ') && !found) {
      const slugLine = lines[i + 1]?.trim() || '';
      if (slugLine === `- slug: ${targetSlug}`) {
        lines[i] = line.replace('- [ ] ', '- [x] ');
        found = true;
        done++;
      }
    }
  }

  if (!found) {
    console.error(`ERROR: Article with slug "${targetSlug}" not found in BATCH_TASK.md or already done.`);
    process.exit(1);
  }

  fs.writeFileSync(batchPath, lines.join('\n'), 'utf-8');
  const pct = Math.round((done / total) * 100);
  console.log(`✓ ${post.title}`);
  console.log(`Готово: ${done}/${total} (${pct}%)`);
}

function cmdStatus() {
  const batchPath = path.join(process.cwd(), 'BATCH_TASK.md');
  if (!fs.existsSync(batchPath)) {
    console.error('ERROR: BATCH_TASK.md not found. Run "node scripts/generate.js init" first.');
    process.exit(1);
  }

  const content = fs.readFileSync(batchPath, 'utf-8');
  const lines = content.split('\n');

  let pending = 0;
  let done = 0;

  for (const line of lines) {
    if (line.startsWith('- [ ] ')) pending++;
    if (line.startsWith('- [x] ')) done++;
  }

  const total = pending + done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  console.log(`\nСтатус выполнения BATCH_TASK.md`);
  console.log(`${'─'.repeat(35)}`);
  console.log(`Готово:  ${done}/${total} (${pct}%)`);
  console.log(`Осталось: ${pending} статей`);
  console.log(`${'─'.repeat(35)}`);
}

function cmdBuild(dir) {
  const srcDir = dir ? path.resolve(dir) : path.join(process.cwd(), 'generated-posts');
  if (!fs.existsSync(srcDir)) {
    console.error(`ERROR: Directory not found: ${srcDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  let count = 0;

  for (const file of files) {
    const jsonPath = path.join(srcDir, file);
    const post = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const htmlName = file.replace('.json', '.html');
    const htmlPath = path.join(srcDir, htmlName);

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.seo_title || post.title}</title>
  <meta name="description" content="${post.seo_description || ''}">
</head>
<body>
<article>
${post.content}
</article>
</body>
</html>`;

    fs.writeFileSync(htmlPath, html, 'utf-8');
    count++;
  }

  console.log(`Built ${count} HTML files in ${srcDir}`);
}

function showHelp() {
  console.log(`
AI Blog Generator — Utility for AI-driven article creation workflow

Usage:
  node scripts/generate.js <command> [options]

Commands:
  init              Create BATCH_TASK.md from topics.txt
  done <file>       Mark article as done in BATCH_TASK.md
  status            Show progress of BATCH_TASK.md
  build [dir]       Generate HTML files from JSON (default: generated-posts/)
  help              Show this help

Examples:
  node scripts/generate.js init
  node scripts/generate.js done generated-posts/kak-podat-isk-v-sud-online.json
  node scripts/generate.js status
  node scripts/generate.js build
`);
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'init': cmdInit(); break;
  case 'done': cmdDone(args[0]); break;
  case 'status': cmdStatus(); break;
  case 'build': cmdBuild(args[0]); break;
  case 'help':
  case undefined:
    showHelp(); break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
