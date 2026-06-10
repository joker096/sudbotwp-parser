import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://sud.cvr.name';

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/search', priority: '0.9', changefreq: 'daily' },
  { path: '/lawyers', priority: '0.8', changefreq: 'weekly' },
  { path: '/calculator', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/help', priority: '0.7', changefreq: 'monthly' },
  { path: '/login', priority: '0.6', changefreq: 'monthly' },
  { path: '/taxpayer', priority: '0.8', changefreq: 'daily' },
  { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
  { path: '/legal-acts', priority: '0.7', changefreq: 'weekly' },
  { path: '/arbitration', priority: '0.7', changefreq: 'weekly' },
  { path: '/civil-cases', priority: '0.7', changefreq: 'weekly' },
  { path: '/documents', priority: '0.6', changefreq: 'monthly' },
];

const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

for (const page of staticPages) {
  xml += `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
}

xml += `</urlset>`;

const outputPath = path.resolve(process.cwd(), 'dist/sitemap.xml');
fs.writeFileSync(outputPath, xml);
console.log(`Sitemap generated: ${outputPath}`);