const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qhiietjvfuekfaehddox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaWlldGp2ZnVla2ZhZWhkZG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNDY3MTAsImV4cCI6MjA2NTcyMjcxMH0.Ae-xBpuSnLcQpWGC8COR3N_5BAjdJ6cqkzP4rnCJAzA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, updated_at')
    .eq('published', true)
    .eq('is_enabled', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return [];
  }

  console.log(JSON.stringify(data, null, 2));
}

fetchBlogPosts();
