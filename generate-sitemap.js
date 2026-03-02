/**
 * Sitemap Generator for SudBot
 * Run with: node generate-sitemap.js
 * 
 * Generates sitemap.xml for SEO purposes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SITE_URL = 'https://cvr.name';
const OUTPUT_FILE = path.join(__dirname, 'dist', 'sitemap.xml');

// Public pages (static routes)
const pages = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/search', priority: '0.9', changefreq: 'daily' },
  { url: '/lawyers', priority: '0.8', changefreq: 'weekly' },
  { url: '/calculator', priority: '0.8', changefreq: 'monthly' },
  { url: '/blog', priority: '0.8', changefreq: 'weekly' },
  { url: '/help', priority: '0.7', changefreq: 'monthly' },
  { url: '/login', priority: '0.6', changefreq: 'monthly' },
  { url: '/taxpayer', priority: '0.8', changefreq: 'daily' },
  { url: '/privacy', priority: '0.5', changefreq: 'monthly' },
];

// Generate XML
const generateSitemap = () => {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  
  pages.forEach(page => {
    xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });
  
  xml += `</urlset>`;
  
  return xml;
};

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write sitemap.xml
const sitemap = generateSitemap();
fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf8');

console.log(`✅ Sitemap generated: ${OUTPUT_FILE}`);
console.log(`📄 Total pages: ${pages.length}`);
