/**
 * Sitemap Generator for SudBot
 * Run with: node generate-sitemap.js
 * 
 * Generates sitemap.xml for SEO purposes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SITE_URL = 'https://cvr.name';
const OUTPUT_FILE = path.join(__dirname, 'public', 'sitemap.xml');

// Supabase configuration (load from .env or use defaults)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Fetch published blog posts from Supabase
const fetchBlogPosts = async () => {
  try {
    console.log('Fetching published blog posts...');
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, created_at, updated_at')
      .eq('published', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn('Error fetching blog posts:', error.message);
      return [];
    }
    
    console.log(`Found ${data.length} published blog posts`);
    return data;
  } catch (error) {
    console.warn('Error fetching blog posts:', error);
    return [];
  }
};

// Generate XML
const generateSitemap = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  
  // Add static pages
  pages.forEach(page => {
    xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });
  
  // Add blog posts
  const blogPosts = await fetchBlogPosts();
  blogPosts.forEach(post => {
    const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : today;
    xml += `  <url>
    <loc>${SITE_URL}/blog?post=${post.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  });
  
  xml += `</urlset>`;
  
  return xml;
};

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write sitemap.xml
const generateAndSaveSitemap = async () => {
  try {
    console.log('Generating sitemap...');
    const sitemap = await generateSitemap();
    fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf8');
    
    const totalPages = pages.length + (await fetchBlogPosts()).length;
    console.log(`✅ Sitemap generated: ${OUTPUT_FILE}`);
    console.log(`📄 Total pages: ${totalPages}`);
    
    return { success: true, message: 'Sitemap generated successfully', file: OUTPUT_FILE };
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    return { success: false, message: error.message };
  }
};

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAndSaveSitemap();
}

export { generateAndSaveSitemap, fetchBlogPosts };
