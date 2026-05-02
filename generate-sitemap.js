/**
 * Sitemap Generator for SudBot
 * Run with: node generate-sitemap.js
 * 
 * Generates sitemap.xml redirect to Supabase function
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://sud.cvr.name';
const SITEMAP_REDIRECT_URL = 'https://qhiietjvfuekfaehddox.supabase.co/functions/v1/generate-sitemap';
const OUTPUT_FILE = path.join(__dirname, 'public', 'sitemap-redirect.html');

const PAGES = [
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

// Generate redirect HTML
const generateSitemap = async () => {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="refresh" content="0;url=${SITEMAP_REDIRECT_URL}" />
<title>Sitemap Redirect</title>
</head>
<body>
<p>Redirecting to sitemap generator...</p>
<a href="${SITEMAP_REDIRECT_URL}">View sitemap</a>
</body>
</html>
`;
};

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write sitemap.xml as redirect
const generateAndSaveSitemap = async () => {
  try {
    console.log('Generating sitemap redirect...');
    const sitemap = await generateSitemap();
    fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf8');
    
    console.log('\u2713 Sitemap redirect generated: ' + OUTPUT_FILE);
    console.log('\u2713 Redirects to: ' + SITEMAP_REDIRECT_URL);
    
    return { success: true, message: 'Sitemap redirect generated successfully', file: OUTPUT_FILE };
  } catch (error) {
    console.error('\u2757 Error generating sitemap:', error);
    return { success: false, message: error.message };
  }
};

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAndSaveSitemap();
}

export { generateAndSaveSitemap };
