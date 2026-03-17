import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Trash2, ArrowLeft, Image, Eye, Settings, Search, Calendar, User, Clock, Tag, ExternalLink, Loader2, Plus, X, Edit2, Power, PowerOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSeo } from '../hooks/useSeo';
import { useAuth } from '../hooks/useAuth';
import { supabase, blogPosts } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { generateSlug } from '../lib/transliterate';
import HtmlEditor from '../components/HtmlEditor';
import { ConfirmModal, useConfirmModal } from '../components/ConfirmModal';

// Import sitemap generator
const generateSitemap = async () => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl) {
      console.warn('⚠️ SUPABASE_URL not configured');
      return { success: true };
    }
    
    // Call Supabase Edge Function for sitemap generation
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-sitemap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    
    if (response.ok) {
      // Edge function returns XML (sitemap), which is expected behavior
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/xml')) {
        const text = await response.text();
        // Verify it's valid XML by checking for sitemap root element
        if (text.includes('<urlset')) {
          console.log('✅ Sitemap generated successfully');
          return { success: true };
        }
      }
      // Also handle JSON responses (for backwards compatibility)
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ Sitemap generated successfully:', data);
        return { success: true, data };
      }
      // If neither XML nor JSON, still consider it success
      console.log('✅ Sitemap endpoint responded');
      return { success: true };
    } else {
      console.warn('⚠️ Sitemap generation returned non-ok status:', response.status);
      return { success: true };
    }
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Don't block the user flow if sitemap fails
    return { success: true };
  }
};

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  is_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  // Для отображения количества постов
  posts_count?: number;
}

interface BlogPost {
  id?: number;
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  category_id?: number;
  image_url: string;
  author: string;
  read_time: string;
  published: boolean;
  is_enabled?: boolean;
  // SEO поля
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  created_at?: string;
  updated_at?: string;
  // Для отображения
  category?: string;
}

const READ_TIMES = ['3 мин', '4 мин', '5 мин', '6 мин', '7 мин', '8 мин', '10 мин', '12 мин', '15 мин'];

export default function AdminBlog() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profileData } = useAuth();
  const isAdmin = profileData?.role === 'admin';
  const { setSeo } = useSeo('/admin/blog');
  const { showToast } = useToast();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [activeSection, setActiveSection] = useState<'posts' | 'categories'>('posts');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [isSlugManual, setIsSlugManual] = useState(false);
  const { confirmModalProps, confirm } = useConfirmModal();
  const [deleteTarget, setDeleteTarget] = useState<{type: 'post' | 'category', id: number} | null>(null);

  const [post, setPost] = useState<BlogPost>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image_url: '',
    author: user?.email?.split('@')[0] || 'Админ',
    read_time: '5 мин',
    published: false,
    is_enabled: true,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
  });

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#6366f1',
  });

  // Проверка доступа - только для админов
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Доступ запрещён</h1>
        <p className="text-slate-500 dark:text-slate-400">У вас нет доступа к управлению блогом.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-2 bg-accent hover:bg-accent-light text-white rounded-xl font-bold"
        >
          На главную
        </button>
      </div>
    );
  }

  // SEO для страницы админа
  useEffect(() => {
    setSeo({
      title: 'Управление блогом - Админ панель',
      description: 'Создание и редактирование статей блога',
      noindex: true,
    });
  }, [setSeo]);

  // Загрузка данных
  useEffect(() => {
    if (activeSection === 'posts') {
      loadPosts();
    } else {
      loadCategories();
    }
  }, [activeSection]);

  // Загрузка категорий при редактировании статьи
  useEffect(() => {
    if (isEditing && categories.length === 0) {
      loadCategories();
    }
  }, [isEditing]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      // Загружаем категории с количеством постов
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      
      // Если категории пустые, используем fallback
      if (!categoriesData || categoriesData.length === 0) {
        setCategories([
          { id: 1, name: 'Новости', slug: 'novosti', description: 'Актуальные новости', color: '#ef4444', is_enabled: true, posts_count: 0 },
          { id: 2, name: 'Инструкции', slug: 'instrukcii', description: 'Пошаговые инструкции', color: '#10b981', is_enabled: true, posts_count: 0 },
          { id: 3, name: 'Советы', slug: 'sovety', description: 'Полезные советы', color: '#f59e0b', is_enabled: true, posts_count: 0 },
          { id: 4, name: 'Обзоры', slug: 'obzory', description: 'Обзоры', color: '#8b5cf6', is_enabled: true, posts_count: 0 },
        ]);
        setIsLoading(false);
        return;
      }
      
      // Получаем количество постов для каждой категории
      const { data: postsCount } = await supabase
        .from('blog_posts')
        .select('category_id');
      
      const postsByCategory = postsCount?.reduce((acc, post) => {
        acc[post.category_id] = (acc[post.category_id] || 0) + 1;
        return acc;
      }, {} as Record<number, number>) || {};
      
      const categoriesWithCount = categoriesData.map(cat => ({
        ...cat,
        posts_count: postsByCategory[cat.id] || 0,
      }));

      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback к статическим категориям
      setCategories([
        { id: 1, name: 'Новости', slug: 'novosti', description: 'Актуальные новости', color: '#ef4444', is_enabled: true, posts_count: 0 },
        { id: 2, name: 'Инструкции', slug: 'instrukcii', description: 'Пошаговые инструкции', color: '#10b981', is_enabled: true, posts_count: 0 },
        { id: 3, name: 'Советы', slug: 'sovety', description: 'Полезные советы', color: '#f59e0b', is_enabled: true, posts_count: 0 },
        { id: 4, name: 'Обзоры', slug: 'obzory', description: 'Обзоры', color: '#8b5cf6', is_enabled: true, posts_count: 0 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка статьи для редактирования
  useEffect(() => {
    if (id && id !== 'new') {
      loadPost(parseInt(id));
    }
  }, [id]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (
            id,
            name,
            slug,
            color
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const postsWithCategories = data?.map(post => ({
        ...post,
        category: post.blog_categories?.name,
        category_id: post.blog_categories?.id,
        category_slug: post.blog_categories?.slug,
        category_color: post.blog_categories?.color,
      })) || [];

      setPosts(postsWithCategories);
    } catch (error) {
      console.error('Error loading posts:', error);
      // Используем моковые данные если таблица не существует
      setPosts([
        { id: 1, title: 'Как подать иск в суд онлайн', excerpt: 'Подробная инструкция', category: 'Инструкции', category_id: 2, published: true, content: '', image_url: '', author: 'Админ', read_time: '5 мин', seo_title: 'Как подать иск в суд онлайн - пошаговая инструкция', seo_description: 'Узнайте, как подать иск в суд онлайн через ГАС Правосудие и Мой Арбитр. Подробная инструкция с картинками.', seo_keywords: 'подать иск в суд онлайн, гас правосудие, мой арбитр, электронная подача', og_title: 'Как подать иск в суд онлайн: полное руководство 2026 года', og_description: 'Узнайте, как подать иск в суд онлайн через ГАС Правосудие и Мой Арбитр. Подробная инструкция с картинками.', og_image: 'https://lh3.googleusercontent.com/pw/AP1GczP-C3tKVfszS_HrlHk9JqNLJ08Mt3uo-clIdMdp0vvvx67b5QS80kYaRlLL_0mC48kVPEhZxTIvZr3rxj5Cq3KqmKZl_vCxBSruZ1N_7ku70N_1hCw=s0' },
        { id: 2, title: 'Изменения в ГПК РФ с 2024 года', excerpt: 'Обзор изменений', category: 'Новости', category_id: 1, published: true, content: '', image_url: '', author: 'Админ', read_time: '7 мин', seo_title: '', seo_description: '', seo_keywords: '', og_title: '', og_description: '', og_image: '' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPost = async (postId: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      if (data) {
        setPost(data);
        // Если у статьи уже есть slug, считаем что он отредактирован вручную
        if (data.slug) {
          setIsSlugManual(true);
        }
      }
    } catch (error) {
      console.error('Error loading post:', error);
      showToast('Ошибка загрузки статьи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!post.title.trim()) {
      showToast('Введите заголовок статьи');
      return;
    }

    if (!post.category_id) {
      showToast('Выберите категорию');
      return;
    }

    setIsSaving(true);
    try {
      const postData = {
        ...post,
        updated_at: new Date().toISOString(),
        // Если SEO поля пустые, используем значения из контента
        seo_title: post.seo_title || post.title,
        seo_description: post.seo_description || post.excerpt,
      };

      // Удаляем поля, которые не должны сохраняться в базе
      const { category, ...saveData } = postData;

      if (isEditing && post.id) {
        const { error } = await supabase
          .from('blog_posts')
          .update(saveData)
          .eq('id', post.id);

        if (error) throw error;
        showToast('Статья обновлена');
      } else {
        const { data, error } = await supabase
          .from('blog_posts')
          .insert({ ...saveData, created_at: new Date().toISOString() })
          .select()
          .single();

        if (error) throw error;
        showToast('Статья создана');
        if (data) {
          navigate(`/admin/blog/${data.id}`);
        }
      }

      // Генерируем новую карту сайта после сохранения
      if (post.published) {
        console.log('Generating new sitemap...');
        await generateSitemap();
      }
    } catch (error) {
      console.error('Error saving post:', error);
      // Сохраняем в localStorage как fallback
      const savedPosts = JSON.parse(localStorage.getItem('admin_blog_posts') || '[]');
      if (isEditing && post.id) {
        const index = savedPosts.findIndex((p: BlogPost) => p.id === post.id);
        if (index >= 0) {
          savedPosts[index] = { ...post, updated_at: new Date().toISOString() };
        }
      } else {
        post.id = Date.now();
        savedPosts.push({ ...post, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      localStorage.setItem('admin_blog_posts', JSON.stringify(savedPosts));
      showToast('Статья сохранена (локально)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post.id) return;
    
    // Показываем модальное окно подтверждения
    confirm({
      title: 'Удалить статью',
      message: 'Вы уверены, что хотите удалить эту статью? Это действие нельзя отменить.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const { error } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', post.id);

          if (error) throw error;
          showToast('Статья удалена');
          navigate('/admin/blog');
        } catch (error) {
          console.error('Error deleting post:', error);
          // Удаляем из localStorage
          const savedPosts = JSON.parse(localStorage.getItem('admin_blog_posts') || '[]');
          const filtered = savedPosts.filter((p: BlogPost) => p.id !== post.id);
          localStorage.setItem('admin_blog_posts', JSON.stringify(filtered));
          showToast('Статья удалена (локально)');
          navigate('/admin/blog');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  // Функции для работы с категориями
  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      showToast('Введите название категории');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...categoryForm,
        slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
        // is_enabled может не существовать в базе данных
      };

      if (editingCategory) {
        // Обновление существующей категории
        const { error } = await supabase
          .from('blog_categories')
          .update(data)
          .eq('id', editingCategory.id);

        if (error) throw error;
        showToast('Категория обновлена');
      } else {
        // Создание новой категории
        const { error } = await supabase
          .from('blog_categories')
          .insert(data);

        if (error) throw error;
        showToast('Категория создана');
      }

      setShowCategoryModal(false);
      setCategoryForm({ name: '', slug: '', description: '', color: '#6366f1' });
      setEditingCategory(null);
      loadCategories();
      
      // Обновляем карту сайта
      generateSitemap();
    } catch (error: any) {
      console.error('Error saving category:', error);
      showToast('Ошибка сохранения категории: ' + (error.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCategory = (category: BlogCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      color: category.color || '#6366f1',
    });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (categoryId: number) => {
    // Показываем модальное окно подтверждения
    confirm({
      title: 'Удалить категорию',
      message: 'Вы уверены, что хотите удалить эту категорию? Все посты в этой категории потеряют категорию.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const { error } = await supabase
            .from('blog_categories')
            .delete()
            .eq('id', categoryId);

          if (error) throw error;
          showToast('Категория удалена');
          loadCategories();
          
          // Обновляем карту сайта
          generateSitemap();
        } catch (error) {
          console.error('Error deleting category:', error);
          showToast('Ошибка удаления категории');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  // Переключение статуса категории (включить/отключить)
  const handleToggleCategory = async (categoryId: number, currentEnabled: boolean) => {
    try {
      // Пробуем обновить is_enabled - может не существовать если миграция не выполнена
      const { error } = await supabase
        .from('blog_categories')
        .update({ is_enabled: !currentEnabled })
        .eq('id', categoryId);

      if (error) {
        // Если ошибка связанная с is_enabled - игнорируем (колонка не существует)
        if (error.message.includes('is_enabled') || error.code === '42703') {
          showToast('Функция отключения категорий недоступна (требуется миграция базы данных)');
          return;
        }
        throw error;
      }
      
      showToast(!currentEnabled ? 'Категория включена' : 'Категория отключена');
      loadCategories();
      
      // Обновляем карту сайта
      generateSitemap();
    } catch (error: any) {
      console.error('Error toggling category:', error);
      if (!error.message?.includes('is_enabled')) {
        showToast('Ошибка изменения статуса категории');
      }
    }
  };

  // Переключение статуса поста (опубликован/черновик)
  const handleTogglePost = async (postId: number, currentPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ published: !currentPublished })
        .eq('id', postId);

      if (error) throw error;
      showToast(!currentPublished ? 'Статья опубликована' : 'Статья снята с публикации');
      loadPosts();
      
      // Обновляем карту сайта
      generateSitemap();
    } catch (error) {
      console.error('Error toggling post:', error);
      showToast('Ошибка изменения статуса статьи');
    }
  };

  const handlePublish = async () => {
    setPost(prev => ({ ...prev, published: !prev.published }));
    await handleSave();
    
    // Generate sitemap when publishing/unpublishing
    console.log('Generating new sitemap after publish/unpublish...');
    await generateSitemap();
  };

  const handleTitleChange = (value: string) => {
    setPost(prev => ({ ...prev, title: value }));
    // Автоматически генерируем slug, если пользователь не редактировал его вручную
    if (!isSlugManual && value.trim()) {
      setPost(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleSlugChange = (value: string) => {
    setIsSlugManual(true);
    setPost(prev => ({ ...prev, slug: value }));
  };

  const handleRegenerateSlug = () => {
    if (post.title.trim()) {
      setPost(prev => ({ ...prev, slug: generateSlug(prev.title) }));
      setIsSlugManual(false);
    }
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Режим списка статей или категорий
  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Управление блогом</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Создавайте и редактируйте статьи и категории блога
            </p>
          </div>
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к блогу
          </button>
        </div>

        {/* Вкладки для разделов */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSection('posts')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeSection === 'posts'
                ? 'bg-accent text-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Статьи
          </button>
          <button
            onClick={() => setActiveSection('categories')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeSection === 'categories'
                ? 'bg-accent text-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Категории
          </button>
        </div>

        {/* Раздел категорий */}
        {activeSection === 'categories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Категории блога</h2>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', slug: '', description: '', color: '#6366f1' });
                  setShowCategoryModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-xl text-sm font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить категорию
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border transition-colors ${
                      category.is_enabled === false 
                        ? 'border-red-200 dark:border-red-800 opacity-75' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-accent/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-8 h-8 rounded-lg"
                          style={{ backgroundColor: category.is_enabled === false ? '#94a3b8' : category.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {category.name}
                            </h3>
                            {category.is_enabled === false && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg">
                                Отключено
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {category.description || 'Нет описания'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Slug: {category.slug} • Постов: {category.posts_count || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleCategory(category.id, category.is_enabled !== false)}
                          className={`p-2 transition-colors ${
                            category.is_enabled === false 
                              ? 'text-emerald-400 hover:text-emerald-600' 
                              : 'text-amber-400 hover:text-amber-600'
                          }`}
                          title={category.is_enabled === false ? 'Включить' : 'Отключить'}
                        >
                          {category.is_enabled === false ? (
                            <Power className="w-5 h-5" />
                          ) : (
                            <PowerOff className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 text-slate-400 hover:text-accent transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={isDeleting}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Раздел статей */}
        {activeSection === 'posts' && (
          <div className="space-y-6">

        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск статей..."
            className="w-full bg-white dark:bg-slate-900 py-4 pl-12 pr-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>

        {/* Кнопка создания */}
        <button
          onClick={() => navigate('/admin/blog/new')}
          className="w-full py-4 bg-accent hover:bg-accent-light text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Save className="w-5 h-5" />
          Создать новую статью
        </button>

        {/* Список статей */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        post.published 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {post.published ? 'Опубликовано' : 'Черновик'}
                      </span>
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {post.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      {post.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.read_time}
                      </span>
                      {post.created_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePost(post.id!, post.published)}
                      className={`p-2 transition-colors ${
                        post.published 
                          ? 'text-amber-400 hover:text-amber-600' 
                          : 'text-emerald-400 hover:text-emerald-600'
                      }`}
                      title={post.published ? 'Снять с публикации' : 'Опубликовать'}
                    >
                      {post.published ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <Power className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => navigate(post.slug ? `/blog/${post.slug}` : `/blog?post=${post.id}`)}
                      className="p-2 text-slate-400 hover:text-accent transition-colors"
                      title="Просмотр"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/blog/${post.id}`)}
                      className="p-2 text-slate-400 hover:text-accent transition-colors"
                      title="Редактировать"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredPosts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Статьи не найдены
              </div>
            )}
          </div>
        )}
          </div>
        )}
      </div>
    );
  }

  // Режим редактирования/создания статьи
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/blog')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          К списку статей
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </button>
          )}
          <button
            onClick={handlePublish}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              post.published
                ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/30'
                : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/30'
            }`}
          >
            {post.published ? 'Снять с публикации' : 'Опубликовать'}
          </button>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'content'
              ? 'bg-accent text-white'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Контент
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'seo'
              ? 'bg-accent text-white'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          SEO & Мета теги
        </button>
      </div>

      {/* Контент */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Заголовок */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Заголовок статьи *
              </label>
              <input
                type="text"
                value={post.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Введите заголовок статьи"
                className="w-full bg-white dark:bg-slate-900 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-900 dark:text-white"
              />
            </div>

            {/* Slug (URL) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                URL статьи (slug)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">/blog/</span>
                <input
                  type="text"
                  value={post.slug || ''}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="moja-statja"
                  className="flex-1 bg-white dark:bg-slate-900 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-900 dark:text-white font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={handleRegenerateSlug}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-accent hover:text-white transition-colors"
                  title="Обновить slug из заголовка"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isSlugManual 
                  ? 'URL отредактирован вручную. Нажмите кнопку обновления для генерации из заголовка.' 
                  : 'URL генерируется автоматически из заголовка'}
              </p>
            </div>

            {/* Анонс */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Анонс статьи
              </label>
              <textarea
                value={post.excerpt}
                onChange={(e) => setPost(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Краткое описание статьи (для карточек и SEO)"
                rows={3}
                className="w-full bg-white dark:bg-slate-900 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-900 dark:text-white resize-none"
              />
            </div>

            {/* Контент */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Содержание статьи
              </label>
              <HtmlEditor
                value={post.content}
                onChange={(content) => setPost(prev => ({ ...prev, content }))}
                onSave={handleSave}
                placeholder="Введите текст статьи или вставьте HTML код..."
                minHeight={400}
              />
            </div>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Изображение */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Изображение статьи
              </label>
              {post.image_url ? (
                <div className="relative rounded-xl overflow-hidden mb-3">
                  <img src={post.image_url} alt={post.title} className="w-full h-40 object-cover" />
                  <button
                    onClick={() => setPost(prev => ({ ...prev, image_url: '' }))}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center mb-3">
                  <Image className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">URL изображения</p>
                </div>
              )}
              <input
                type="url"
                value={post.image_url}
                onChange={(e) => setPost(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
              />
            </div>

            {/* Категория */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Tag className="w-4 h-4 inline mr-2" />
                  Категория
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ name: '', slug: '', description: '', color: '#6366f1' });
                      setShowCategoryModal(true);
                    }}
                    className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                    title="Создать категорию"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {post.category_id && (
                    <button
                      onClick={() => {
                        const cat = categories.find(c => c.id === post.category_id);
                        if (cat) {
                          handleEditCategory(cat);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title="Редактировать категорию"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
               <select
                  value={post.category_id || ''}
                  onChange={(e) => setPost(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
            </div>

            {/* Автор и время чтения */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Автор
                </label>
                <input
                  type="text"
                  value={post.author}
                  onChange={(e) => setPost(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Время чтения
                </label>
                <select
                  value={post.read_time}
                  onChange={(e) => setPost(prev => ({ ...prev, read_time: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
                >
                  {READ_TIMES.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO */}
      {activeTab === 'seo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meta Title & Description */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Meta теги</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Title (заголовок страницы)
              </label>
              <input
                type="text"
                value={post.seo_title}
                onChange={(e) => setPost(prev => ({ ...prev, seo_title: e.target.value }))}
                placeholder={post.title || 'Заголовок статьи'}
                className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-400 mt-1">Рекомендуется 50-60 символов</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description (описание)
              </label>
              <textarea
                value={post.seo_description}
                onChange={(e) => setPost(prev => ({ ...prev, seo_description: e.target.value }))}
                placeholder={post.excerpt || 'Описание статьи'}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">Рекомендуется 150-160 символов</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Keywords (ключевые слова)
              </label>
              <input
                type="text"
                value={post.seo_keywords}
                onChange={(e) => setPost(prev => ({ ...prev, seo_keywords: e.target.value }))}
                placeholder="юрист, суд, иск, закон"
                className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-400 mt-1">Через запятую</p>
            </div>
          </div>

          {/* Open Graph */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Open Graph (соцсети)</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                OG Title
              </label>
              <input
                type="text"
                value={post.og_title}
                onChange={(e) => setPost(prev => ({ ...prev, og_title: e.target.value }))}
                placeholder={post.seo_title || post.title}
                className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                OG Description
              </label>
              <textarea
                value={post.og_description}
                onChange={(e) => setPost(prev => ({ ...prev, og_description: e.target.value }))}
                placeholder={post.seo_description || post.excerpt}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                OG Image URL
              </label>
              <input
                type="url"
                value={post.og_image}
                onChange={(e) => setPost(prev => ({ ...prev, og_image: e.target.value }))}
                placeholder={post.image_url || 'https://example.com/image.jpg'}
                className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-400 mt-1">Рекомендуемый размер: 1200x630px</p>
              {post.og_image && (
                <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img 
                    src={post.og_image} 
                    alt="OG Preview" 
                    className="w-full h-auto max-h-48 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden bg-slate-100 dark:bg-slate-800 p-4 text-center text-sm text-red-500">
                    Не удалось загрузить изображение. Проверьте URL.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Предпросмотр в Google */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Предпросмотр в Google</h3>
            <div className="border rounded-xl p-4 bg-white">
              <div className="text-sm text-blue-700 hover:underline cursor-pointer truncate">
                {post.seo_title || post.title || 'Заголовок страницы'}
              </div>
              <div className="text-sm text-green-700 truncate">
                https://cvr.name/blog/{post.slug || post.id || 'article-slug'}
              </div>
              <div className="text-sm text-slate-700 mt-1 line-clamp-2">
                {post.seo_description || post.excerpt || 'Описание страницы появится здесь...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Кнопка сохранения */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/blog')}
          className="px-3 py-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 bg-accent hover:bg-accent-light text-white text-xs sm:text-sm rounded-lg sm:rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              <span className="hidden sm:inline">Сохранение...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isEditing ? 'Сохранить' : 'Создать'}
            </>
          )}
        </button>
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full">
            <div className="sticky top-0 bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setCategoryForm({ name: '', slug: '', description: '', color: '#6366f1' });
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Название категории *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Введите название категории"
                  className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="Категория-слово"
                  className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание категории"
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Цвет
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryForm({ name: '', slug: '', description: '', color: '#6366f1' });
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={isSaving}
                  className="flex-1 flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">Предпросмотр</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 sm:p-10">
              {(post.image_url || post.og_image) && (
                <div className="relative h-64 sm:h-96 w-full mb-6 rounded-2xl overflow-hidden">
                  <img src={post.og_image || post.image_url} alt={post.title} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <span className="text-sm font-bold text-accent">{post.category}</span>
                  </div>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                {post.title || 'Заголовок статьи'}
              </h1>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-medium mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                    {post.author?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-900 dark:text-white font-bold">{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('ru-RU')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {post.read_time}
                </div>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed space-y-6">
                <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                  {post.excerpt || 'Анонс статьи...'}
                </p>
                {post.content ? (
                  <div dangerouslySetInnerHTML={{ __html: post.content }} />
                ) : (
                  <p className="text-slate-400 italic">Содержание статьи будет отображаться здесь...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal {...confirmModalProps} />
    </div>
  );
}
