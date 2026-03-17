import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = Deno.env.get('SITE_URL') || 'https://cvr.name';

// Static pages
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    
    // Fetch only published blog posts that are enabled
    const { data: blogPosts, error } = await supabase
      .from('blog_posts')
      .select('id, slug, updated_at')
      .eq('published', true)
      .eq('is_enabled', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching blog posts:', error.message);
    }

    // Generate XML
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
    if (blogPosts && blogPosts.length > 0) {
      blogPosts.forEach(post => {
        const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : today;
        // Use slug if available, otherwise fall back to id
        const postUrl = post.slug ? `${SITE_URL}/blog/${post.slug}` : `${SITE_URL}/blog?post=${post.id}`;
        xml += `  <url>
    <loc>${postUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }
    
    xml += `</urlset>`;

    console.log(`Sitemap generated with ${pages.length + (blogPosts?.length || 0)} pages`);

    // Return XML directly with correct content-type
    return new Response(xml, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
      status: 200,
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<error>${error.message}</error>`, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
      status: 500,
    });
  }
});
