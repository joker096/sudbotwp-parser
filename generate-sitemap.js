/**
 * Sitemap Generator for SudBot
 * Run with: node generate-sitemap.js
 * 
 * Generates a static sitemap.xml file that can be served directly.
 * Optionally includes blog posts from Supabase.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const m = line.match(/^\s*([^#=\s]+)=['"]?(.+?)['"]?\s*$/);
    if (m) process.env[m[1]] = m[2];
  });
} catch {}

const SITE_URL = process.env.SITE_URL || 'https://sud.cvr.name';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qhiietjvfuekfaehddox.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const OUTPUT_FILE = path.join(__dirname, 'dist', 'sitemap.xml');

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

async function fetchBlogPosts() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[info] No Supabase credentials, skipping blog posts');
    return [];
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug, updated_at')
      .eq('published', true)
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[warn] Error fetching blog posts:', error.message);
      return [];
    }
    console.log('[info] Found ' + (data?.length || 0) + ' published blog posts');
    return data || [];
  } catch (error) {
    console.warn('[warn] Error fetching blog posts:', error.message);
    return [];
  }
}

function generateSitemap(blogPosts = []) {
  const today = new Date().toISOString().split('T')[0];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of PAGES) {
    xml += '  <url>\n';
    xml += '    <loc>' + SITE_URL + page.url + '</loc>\n';
    xml += '    <lastmod>' + today + '</lastmod>\n';
    xml += '    <changefreq>' + page.changefreq + '</changefreq>\n';
    xml += '    <priority>' + page.priority + '</priority>\n';
    xml += '  </url>\n';
  }

  for (const post of blogPosts) {
    const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : today;
    const postUrl = post.slug ? SITE_URL + '/blog/' + post.slug : SITE_URL + '/blog?post=' + post.id;
    xml += '  <url>\n';
    xml += '    <loc>' + postUrl + '</loc>\n';
    xml += '    <lastmod>' + lastmod + '</lastmod>\n';
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

async function generateAndSaveSitemap() {
  try {
    console.log('Generating static sitemap.xml...');
    const blogPosts = await fetchBlogPosts();
    const sitemap = generateSitemap(blogPosts);

    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf8');

    console.log('\u2713 Sitemap saved to: ' + OUTPUT_FILE);
    return { success: true, message: 'Sitemap generated successfully', file: OUTPUT_FILE };
  } catch (error) {
    console.error('\u2757 Error generating sitemap:', error);
    return { success: false, message: error.message };
  }
}

// Run when executed directly
if (process.argv[1] && import.meta.url.includes('generate-sitemap')) {
  generateAndSaveSitemap();
}

export { generateSitemap, generateAndSaveSitemap };
