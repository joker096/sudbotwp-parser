import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Calendar, ArrowRight, ChevronLeft, ChevronRight, Share2, Bookmark, Eye, ThumbsUp, MessageSquare, Settings, Plus, Edit } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AdBanner from '../components/AdBanner';
import { useSeo } from '../hooks/useSeo';
import BlogComments from '../components/BlogComments';
import { useAuth } from '../hooks/useAuth';
import { supabase, blogPosts } from '../lib/supabase';
import { YouTubeEmbed, extractYouTubeVideoId } from '../components/YouTubeEmbed';
import { useInView } from 'react-intersection-observer';
import { useExternalLinksAdSettings } from '../hooks/useExternalLinksAdSettings';

export { extractYouTubeVideoId } from '../components/YouTubeEmbed';

// Функция для обработки HTML контента - добавляет lazy loading к изображениям и обрабатывает YouTube видео
const processContent = (content: string): string => {
  if (!content) return content;
  
  let processed = content;
  
  // 0. Обрабатываем CTA блоки - улучшаем их стиль
  // Находим cta-box блоки и добавляем класс для улучшенных стилей
  processed = processed.replace(/<div class="cta-box"[^>]*>/gi, (match) => {
    return match.replace('cta-box', 'cta-box cta-box-enhanced');
  });
  
  // Оборачиваем последовательности cta-box в улучшенный контейнер
  processed = processed.replace(/(<div class="cta-box"[^>]*>[\s\S]*?<\/div>\s*){2,}/gi, (match) => {
    // Находим все cta-box блоки внутри
    const boxes = match.match(/<div class="cta-box"[^>]*>[\s\S]*?<\/div>/gi);
    if (boxes && boxes.length >= 2) {
      // Проверяем, есть ли кнопка во втором блоке
      const hasButton = boxes[1].includes('<a href=') || boxes[1].includes('cta-button');
      if (hasButton) {
        // Объединяем в один красивый блок
        const textMatch = boxes[0].match(/<p><strong>([\s\S]*?)<\/strong><\/p>/);
        const buttonMatch = boxes[1].match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
        
        if (textMatch && buttonMatch) {
          const text = textMatch[1];
          const href = buttonMatch[1];
          const btnText = buttonMatch[2];
          return `<div class="cta-box">
            <p><strong>${text}</strong></p>
            <a href="${href}" class="cta-button">${btnText}</a>
          </div>`;
        }
      }
    }
    return match;
  });
  
  // 1. Добавляем loading="lazy" к img тегам, если его нет
  processed = processed.replace(/<img(?!.*loading)[^>]*>/gi, (match) => {
    // Не добавляем lazy к data: изображениям
    if (match.includes('data:')) return match;
    return match.replace('<img', '<img loading="lazy"');
  });
  
  // 2. Оборачиваем изображения в div с центрированием, если ещё не обёрнуты
  processed = processed.replace(/(<img[^>]*>)(?!\s*<\/div>)/gi, (match) => {
    // Проверяем, есть ли уже обёртка
    if (match.includes('<div') || match.includes('text-align:center')) {
      return match;
    }
    // Добавляем обёртку с центрированием
    return `<div style="text-align:center;margin:20px 0;">${match}</div>`;
  });
  
  // 3. Центрируем видео (iframe)
  processed = processed.replace(/(<iframe[^>]*>)([\s\S]*?<\/iframe>)/gi, (match, openTag, closeTag) => {
    // Проверяем, есть ли уже обёртка
    if (match.includes('<div') || match.includes('text-align:center')) {
      return match;
    }
    return `<div style="text-align:center;margin:20px 0;">${openTag}${closeTag}</div>`;
  });
  
  // 4. Центрируем кнопки (ссылки с классами bg-, btn-, или inline-flex)
  processed = processed.replace(/(<a[^>]*class="[^"]*(?:bg-|btn-|button|inline-flex)[^"]*"[^>]*>[\s\S]*?<\/a>)/gi, (match) => {
    // Проверяем, есть ли уже обёртка
    if (match.includes('<div') && match.includes('text-align:center')) {
      return match;
    }
    // Добавляем обёртку с центрированием
    return `<div style="text-align:center;margin:20px 0;">${match}</div>`;
  });
  
  // 5. Обрабатываем YouTube iframe - добавляем параметры для оптимизации
  // Находим youtube iframe и добавляем атрибуты для отложенной загрузки
  processed = processed.replace(
    /<iframe[^>]*youtube\.com\/embed\/([a-zA-Z0-9_-]{11})[^>]*>[\s\S]*?<\/iframe>/gi,
    (match, videoId) => {
      // Заменяем на структуру с data-src для lazy loading
      // Используем несколько fallback для thumbnail: maxresdefault -> high -> default
      return `<div class="youtube-lazy-container" data-video-id="${videoId}">
        <div class="youtube-thumbnail youtube-thumbnail-fallback" data-video-id="${videoId}">
          <button class="youtube-play-btn" aria-label="Воспроизвести видео">
            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="white" d="M8 5v14l11-7z"/></svg>
          </button>
          <div class="youtube-error-overlay">Видео недоступно</div>
        </div>
      </div>`;
    }
  );
  
  // 3. Обрабатываем youtube-placeholder из HtmlEditor (старый формат с data-embed)
  processed = processed.replace(
    /<div class="youtube-placeholder"[^>]*data-embed="([^"]*)"[^>]*>/gi,
    (match, embedCode) => {
      // Извлекаем videoId из embed кода
      const videoIdMatch = embedCode.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        // Показываем fallback заглушку без thumbnail
        return `<div class="youtube-lazy-container" data-video-id="${videoId}">
          <div class="youtube-thumbnail youtube-thumbnail-fallback" data-video-id="${videoId}">
            <button class="youtube-play-btn" aria-label="Воспроизвести видео">
              <svg viewBox="0 0 24 24" width="24" height="24"><path fill="white" d="M8 5v14l11-7z"/></svg>
            </button>
            <div class="youtube-error-overlay">Видео недоступно</div>
          </div>
        </div>`;
      }
      return match;
    }
  );
  
  // 4. Обрабатываем youtube-placeholder из HtmlEditor (новый формат с data-iframe)
  processed = processed.replace(
    /<div class="youtube-placeholder"[^>]*data-iframe="([^"]*)"[^>]*>/gi,
    (match, iframeHtml) => {
      // Декодируем HTML
      const decoded = iframeHtml.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const videoIdMatch = decoded.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        // Показываем fallback заглушку без thumbnail
        return `<div class="youtube-lazy-container" data-video-id="${videoId}">
          <div class="youtube-thumbnail youtube-thumbnail-fallback" data-video-id="${videoId}">
            <button class="youtube-play-btn" aria-label="Воспроизвести видео">
              <svg viewBox="0 0 24 24" width="24" height="24"><path fill="white" d="M8 5v14l11-7z"/></svg>
            </button>
            <div class="youtube-error-overlay">Видео недоступно</div>
          </div>
        </div>`;
      }
      return match;
    }
  );
  
  return processed;
};

// Компонент для отображения контента с рекламой
const BlogContentWithAds = ({ content, adSettings }: { content: string; adSettings: any }) => {
  if (!adSettings.enabled || adSettings.afterParagraph <= 0) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }

  // Проверяем, есть ли кастомный баннер (заголовок и URL)
  const hasCustomBanner = adSettings.bannerText && adSettings.bannerUrl;

  // Разбиваем контент на параграфы
  const parts = content.split(/(<\/p>)/i);
  let paragraphCount = 0;
  let adInserted = false;
  const result: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    result.push(parts[i]);
    
    // Проверяем, является ли это закрывающим тегом параграфа
    if (parts[i].toLowerCase().includes('</p>')) {
      paragraphCount++;
      
      // Вставляем рекламу после нужного параграфа
      if (paragraphCount === adSettings.afterParagraph && !adInserted) {
        let adHtml = '';
        
        // Если есть кастомный баннер - показываем его
        if (hasCustomBanner) {
          const isExternalUrl = adSettings.bannerUrl.startsWith('http://') || adSettings.bannerUrl.startsWith('https://');
          const targetAttr = isExternalUrl ? ' target="_blank" rel="noopener noreferrer"' : '';
          const bannerImageHtml = adSettings.bannerImageUrl 
            ? `<div class="w-full sm:w-40 h-32 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 ml-4">
                <img src="${adSettings.bannerImageUrl}" alt="${adSettings.bannerText}" class="w-full h-full object-cover" />
              </div>`
            : '';
          
          adHtml = `
            <div class="blog-ad-container my-8">
              <a href="${adSettings.bannerUrl}"${targetAttr} class="w-full bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6 border border-slate-200 dark:border-slate-700 relative overflow-hidden group cursor-pointer transition-colors hover:border-accent dark:hover:border-accent text-decoration-none">
                <div class="absolute top-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
                  Реклама
                </div>
                ${bannerImageHtml}
                <div class="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                  <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-accent transition-colors">
                    ${adSettings.bannerText}
                  </h3>
                  ${adSettings.bannerDesc ? `<p class="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">${adSettings.bannerDesc}</p>` : ''}
                  <span class="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-light transition-colors">
                    ${adSettings.bannerCta || 'Узнать подробнее'} <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </span>
                </div>
              </a>
            </div>`;
        } else {
          // Иначе показываем рекламные коды
          if (adSettings.yandexCode) {
            adHtml += adSettings.yandexCode;
          }
          if (adSettings.googleCode) {
            adHtml += adSettings.googleCode;
          }
          if (adSettings.customCode) {
            adHtml += adSettings.customCode;
          }
          
          if (adHtml) {
            adHtml = `<div class="blog-ad-container my-8 text-center" style="min-height:100px;">${adHtml}</div>`;
          }
        }
        
        if (adHtml) {
          result.push(adHtml);
          adInserted = true;
        }
      }
    }
  }

  return <div dangerouslySetInnerHTML={{ __html: result.join('') }} />;
};

// Fallback данные для блога
const FALLBACK_POSTS = [
  { id: 1, title: 'Как подать иск в суд онлайн', excerpt: 'Подробная инструкция по использованию ГАС Правосудие и Мой Арбитр для подачи документов не выходя из дома.', date: '15 Марта 2024', category: 'Инструкции', img: 'https://picsum.photos/seed/blog1/800/400', views: 1240, likes: 45, comments: 12, author: 'Александр Смирнов', readTime: '5 мин', seo_title: 'Как подать иск в суд онлайн - пошаговая инструкция', seo_description: 'Узнайте, как подать иск в суд онлайн через ГАС Правосудие и Мой Арбитр. Подробная инструкция с картинками.', seo_keywords: 'подать иск в суд онлайн, гас правосудие, мой арбитр, электронная подача', og_title: 'Как подать иск в суд онлайн: полное руководство 2026 года', og_description: 'Узнайте, как подать иск в суд онлайн через ГАС Правосудие и Мой Арбитр. Подробная инструкция с картинками.', og_image: 'https://lh3.googleusercontent.com/pw/AP1GczP-C3tKVfszS_HrlHk9JqNLJ08Mt3uo-clIdMdp0vvvx67b5QS80kYaRlLL_0mC48kVPEhZxTIvZr3rxj5Cq3KqmKZl_vCxBSruZ1N_7ku70N_1hCw=s0' },
  { id: 2, title: 'Изменения в ГПК РФ с 2024 года', excerpt: 'Обзор ключевых изменений в гражданском процессуальном кодексе, которые вступят в силу в этом году.', date: '10 Марта 2024', category: 'Новости', img: 'https://picsum.photos/seed/blog2/800/400', views: 890, likes: 32, comments: 8, author: 'Елена Волкова', readTime: '7 мин', seo_title: '', seo_description: '', seo_keywords: '', og_title: '', og_description: '', og_image: '' },
  { id: 3, title: 'Как выбрать хорошего юриста', excerpt: 'На что обращать внимание при выборе специалиста для вашего дела: чек-лист от экспертов.', date: '5 Марта 2024', category: 'Советы', img: 'https://picsum.photos/seed/blog3/800/400', views: 2100, likes: 112, comments: 34, author: 'Дмитрий Соколов', readTime: '4 мин', seo_title: '', seo_description: '', seo_keywords: '', og_title: '', og_description: '', og_image: '' },
  { id: 4, title: 'Новые пошлины: что нужно знать', excerpt: 'Разбираем новые тарифы на судебные пошлины и рассказываем, как их правильно рассчитать.', date: '1 Марта 2024', category: 'Новости', img: 'https://picsum.photos/seed/blog4/800/400', views: 3450, likes: 210, comments: 56, author: 'Анна Морозова', readTime: '6 мин', seo_title: '', seo_description: '', seo_keywords: '', og_title: '', og_description: '', og_image: '' },
  { id: 5, title: 'Банкротство физических лиц', excerpt: 'Пошаговое руководство по процедуре банкротства в 2024 году: плюсы, минусы и подводные камни.', date: '25 Февраля 2024', category: 'Инструкции', img: 'https://picsum.photos/seed/blog5/800/400', views: 4500, likes: 320, comments: 89, author: 'Игорь Николаев', readTime: '10 мин', seo_title: '', seo_description: '', seo_keywords: '', og_title: '', og_description: '', og_image: '' },
  { id: 6, title: 'Раздел имущества при разводе', excerpt: 'Судебная практика и советы адвокатов по семейным спорам: как защитить свои права.', date: '20 Февраля 2024', category: 'Советы', img: 'https://picsum.photos/seed/blog6/800/400', views: 1800, likes: 76, comments: 21, author: 'Мария Кузнецова', readTime: '8 мин', seo_title: '', seo_description: '', seo_keywords: '', og_title: '', og_description: '', og_image: '' },
];

export default function Blog() {
  const { slug } = useParams();
  const { setSeo } = useSeo('/blog');
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'admin';
  
  // Состояние для модального окна рекламы при клике на внешние ссылки
  const { settings: adSettings } = useExternalLinksAdSettings();
  const [showAdModal, setShowAdModal] = useState(false);
  const [pendingExternalHref, setPendingExternalHref] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  // Функция для получения категории из URL или localStorage
  const getInitialCategory = (): string => {
    try {
      // Сначала проверяем URL параметр
      const urlParams = new URLSearchParams(window.location.search);
      const urlCategory = urlParams.get('category');
      if (urlCategory) {
        return decodeURIComponent(urlCategory);
      }
      // Потом localStorage
      const saved = localStorage.getItem('blog_active_category');
      return saved || 'Все';
    } catch {
      return 'Все';
    }
  };
  
  const [activeTab, setActiveTab] = useState(getInitialCategory());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'likes'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<number>>(new Set());
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const postsPerPage = 4;

  // Настройки рекламы
  const [blogAdSettings, setBlogAdSettings] = useState<{
    enabled: boolean;
    afterParagraph: number;
    yandexCode: string;
    googleCode: string;
    customCode: string;
    // Кастомный баннер
    bannerText: string;
    bannerDesc: string;
    bannerCta: string;
    bannerUrl: string;
    bannerImageUrl: string;
  }>({
    enabled: false,
    afterParagraph: 3,
    yandexCode: '',
    googleCode: '',
    customCode: '',
    bannerText: '',
    bannerDesc: '',
    bannerCta: '',
    bannerUrl: '',
    bannerImageUrl: ''
  });

  // Сохранение категории в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem('blog_active_category', activeTab);
    } catch (e) {
      console.error('Error saving category to localStorage:', e);
    }
  }, [activeTab]);

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Блог Sud - Статьи о юридических услугах и судебных делах',
      description: 'Полезные статьи о юридических услугах, судебных делах, выборе юриста и изменениях в законодательстве.',
      keywords: 'блог, юридические статьи, суд, законодательство, юрист',
      ogTitle: 'Блог Sud - Полезные статьи о юридических услугах',
      ogDescription: 'Читайте статьи о юридических услугах, судебных делах и выборе юриста.',
    });
  }, [setSeo]);

  // Загрузка категорий и статей
  useEffect(() => {
    // Всегда сбрасываем состояние загрузки при монтировании
    setIsLoading(true);
    loadCategories();
    loadPosts();
    loadBlogAdSettings();
    
    // Загружаем пост из URL если указан
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
      loadPostById(postId);
    }
    
    // Также проверяем slug из URL параметра (роутера)
    if (slug) {
      loadPostBySlug(slug);
    }
  }, []);

  const loadPostById = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (
            id,
            name,
            slug,
            color,
            is_enabled
          )
        `)
        .eq('id', parseInt(postId))
        .single();

      if (error) throw error;
      
      if (data) {
        setSelectedPost({
          ...data,
          category: data.blog_categories?.name,
          category_id: data.blog_categories?.id,
          category_slug: data.blog_categories?.slug,
          category_color: data.blog_categories?.color,
          date: new Date(data.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
          views: data.views || Math.floor(Math.random() * 1000) + 500,
          likes: data.likes || Math.floor(Math.random() * 100) + 10,
          comments: 0,
        });
      }
    } catch (error) {
      console.error('Error loading post by ID:', error);
    }
  };

  // Загрузка статьи по slug
  const loadPostBySlug = async (postSlug: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (
            id,
            name,
            slug,
            color,
            is_enabled
          )
        `)
        .eq('slug', postSlug)
        .single();

      if (error) throw error;
      
      if (data) {
        setSelectedPost({
          ...data,
          category: data.blog_categories?.name,
          category_id: data.blog_categories?.id,
          category_slug: data.blog_categories?.slug,
          category_color: data.blog_categories?.color,
          date: new Date(data.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
          views: data.views || Math.floor(Math.random() * 1000) + 500,
          likes: data.likes || Math.floor(Math.random() * 100) + 10,
          comments: 0,
        });
      }
    } catch (error) {
      console.error('Error loading post by slug:', error);
    }
  };

  // Загрузка настроек рекламы для блога
  const loadBlogAdSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [
          'blog_ads_enabled', 
          'blog_ad_after_paragraph', 
          'blog_ad_yandex_code', 
          'blog_ad_google_code', 
          'blog_ad_custom_code',
          // Кастомный баннер
          'blog_ad_text',
          'blog_ad_desc',
          'blog_ad_cta',
          'blog_ad_url',
          'blog_ad_image_url'
        ]);

      if (error) {
        console.error('Error loading blog ad settings:', error);
        return;
      }

      if (data) {
        const settings: any = {};
        data.forEach((s: { key: string; value: string }) => {
          settings[s.key] = s.value;
        });

        setBlogAdSettings({
          enabled: settings.blog_ads_enabled === 'true',
          afterParagraph: parseInt(settings.blog_ad_after_paragraph || '3', 10),
          yandexCode: settings.blog_ad_yandex_code || '',
          googleCode: settings.blog_ad_google_code || '',
          customCode: settings.blog_ad_custom_code || '',
          bannerText: settings.blog_ad_text || '',
          bannerDesc: settings.blog_ad_desc || '',
          bannerCta: settings.blog_ad_cta || '',
          bannerUrl: settings.blog_ad_url || '',
          bannerImageUrl: settings.blog_ad_image_url || ''
        });
      }
    } catch (error) {
      console.error('Error loading blog ad settings:', error);
    }
  };

  // Проверка и сброс категории если она больше не существует
  useEffect(() => {
    if (categories.length > 0 && activeTab !== 'Все') {
      const categoryNames = categories.map(c => c.name);
      if (!categoryNames.includes(activeTab)) {
        setActiveTab('Все');
      }
    }
  }, [categories]);

  const loadCategories = async () => {
    try {
      // Загружаем все категории без фильтра по is_enabled
      // (колонка is_enabled может не существовать в базе данных)
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading categories:', error.message);
        // Используем статические категории как fallback
        setCategories([
          { id: 1, name: 'Новости', slug: 'novosti', color: '#ef4444' },
          { id: 2, name: 'Инструкции', slug: 'instrukcii', color: '#10b981' },
          { id: 3, name: 'Советы', slug: 'sovety', color: '#f59e0b' },
          { id: 4, name: 'Обзоры', slug: 'obzory', color: '#8b5cf6' },
        ]);
        return;
      }
      
      // Если категории есть в базе данных - используем их
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        // Fallback к статическим категориям если база пустая
        setCategories([
          { id: 1, name: 'Новости', slug: 'novosti', color: '#ef4444' },
          { id: 2, name: 'Инструкции', slug: 'instrukcii', color: '#10b981' },
          { id: 3, name: 'Советы', slug: 'sovety', color: '#f59e0b' },
          { id: 4, name: 'Обзоры', slug: 'obzory', color: '#8b5cf6' },
        ]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Используем статические категории как fallback
      setCategories([
        { id: 1, name: 'Новости', slug: 'novosti', color: '#ef4444' },
        { id: 2, name: 'Инструкции', slug: 'instrukcii', color: '#10b981' },
        { id: 3, name: 'Советы', slug: 'sovety', color: '#f59e0b' },
        { id: 4, name: 'Обзоры', slug: 'obzory', color: '#8b5cf6' },
      ]);
    }
  };

  const loadPosts = async () => {
    setIsLoading(true);
    // Сбрасываем посты перед загрузкой
    setPosts([]);
    try {
      // Загружаем статьи без фильтра по is_enabled (колонка может не существовать)
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
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading posts:', error.message);
        // Fallback к статическим данным
        setPosts(FALLBACK_POSTS);
        setIsLoading(false);
        return;
      }
      
      if (data && data.length > 0) {
        // Фильтруем посты - оставляем только те, у которых есть категория
        const validData = data.filter(post => 
          post.blog_categories && post.blog_categories.name
        );
        // Добавляем вычисляемые поля
        setPosts(validData.map(post => ({
          ...post,
          category: post.blog_categories?.name || post.category,
          category_id: post.blog_categories?.id,
          category_slug: post.blog_categories?.slug,
          category_color: post.blog_categories?.color,
          date: new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
          views: post.views || Math.floor(Math.random() * 1000) + 500,
          likes: post.likes || Math.floor(Math.random() * 100) + 10,
          comments: 0,
        })));
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback к статическим данным
      setPosts(FALLBACK_POSTS);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = ['Все', ...categories.map(cat => cat.name)];

  const filteredPosts = useMemo(() => {
    let result = posts.filter(post => {
      const matchesTab = activeTab === 'Все' || post.category === activeTab;
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    });
    
    // Сортировка
    if (sortBy === 'views') {
      result = [...result].sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'likes') {
      result = [...result].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    // date - по умолчанию уже отсортировано по дате
    
    return result;
  }, [posts, activeTab, searchQuery, sortBy]);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const currentPosts = filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  const handleLike = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleBookmark = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleShare = async (post: any, e: React.MouseEvent) => {
    e.stopPropagation();
    // Используем slug для URL, если есть, иначе ID
    const postUrl = post.slug 
      ? `/blog/${post.slug}` 
      : `/blog?post=${post.id}`;
    const shareData = {
      title: post.title,
      text: post.excerpt,
      url: window.location.origin + postUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const getLikeCount = (post: any) => {
    return likedPosts.has(post.id) ? post.likes + 1 : post.likes;
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    
    // Обновляем URL без перезагрузки страницы
    try {
      const url = new URL(window.location.href);
      if (tab === 'Все') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', encodeURIComponent(tab));
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.error('Error updating URL:', e);
    }
  };

  // SEO для выбранной статьи
  useEffect(() => {
    if (selectedPost) {
      // Используем slug для URL, если есть, иначе ID
      const postUrl = selectedPost.slug 
        ? `/blog/${selectedPost.slug}` 
        : `/blog?post=${selectedPost.id}`;
      
      setSeo({
        title: selectedPost.seo_title || selectedPost.title,
        description: selectedPost.seo_description || selectedPost.excerpt,
        keywords: selectedPost.seo_keywords,
        ogTitle: selectedPost.og_title || selectedPost.seo_title || selectedPost.title,
        ogDescription: selectedPost.og_description || selectedPost.seo_description || selectedPost.excerpt,
        ogImage: selectedPost.og_image || selectedPost.image_url || selectedPost.img,
        ogUrl: postUrl,
      });
      

    }
  }, [selectedPost, setSeo]);

  // Обработка YouTube lazy loading
  useEffect(() => {
    const handleYouTubeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Обрабатываем клик на thumbnail (новый формат из processContent)
      const thumbnail = target.closest('.youtube-thumbnail') || target.closest('.youtube-play-btn');
      if (thumbnail) {
        const container = thumbnail.closest('.youtube-lazy-container') as HTMLElement;
        if (container) {
          const videoId = container.getAttribute('data-video-id');
          if (videoId) {
            // Заменяем thumbnail на iframe
            container.innerHTML = `
              <iframe
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
              ></iframe>
            `;
          }
        }
        return;
      }
      
      // Обрабатываем клик на placeholder (формат из HtmlEditor)
      const placeholder = target.closest('.youtube-placeholder') as HTMLElement;
      if (placeholder) {
        // Проверяем data-iframe атрибут
        const iframeHtml = placeholder.getAttribute('data-iframe');
        if (iframeHtml) {
          placeholder.innerHTML = iframeHtml;
        } else {
          // Альтернативный формат с data-embed-url
          const embedUrl = placeholder.getAttribute('data-embed-url');
          if (embedUrl) {
            placeholder.innerHTML = `<iframe width="100%" height="100%" src="${embedUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"></iframe>`;
          }
        }
      }
    };

    document.addEventListener('click', handleYouTubeClick);
    return () => document.removeEventListener('click', handleYouTubeClick);
  }, [selectedPost]);

  // Обработка кликов по внешним ссылкам в статьях блога
  useEffect(() => {
    if (!selectedPost || !adSettings.adEnabled) return;

    const handleExternalLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Проверяем, является ли ссылка внешней
      const isExternal = href.startsWith('http://') || href.startsWith('https://');
      if (!isExternal) return;
      
      // Проверяем, является ли ссылкой на суд
      const isCourtLink = href.includes('mirsud') || 
        href.includes('court') || 
        href.includes('.sud') ||
        (href.includes('rf') && href.includes('.'));
      
      // Проверяем, является ли ссылкой на карты
      const isMapLink = href.includes('yandex.ru/maps') || 
        href.includes('google.com/maps') ||
        href.includes('2gis.ru') ||
        href.includes('maps.yandex');
      
      // Не показываем рекламу для ссылок на суды и карты
      if (isCourtLink || isMapLink) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      setPendingExternalHref(href);
      
      if (adSettings.adType === 'interstitial') {
        setCountdown(3);
      }
      
      setShowAdModal(true);
    };

    const articleContent = document.querySelector('.prose');
    if (articleContent) {
      articleContent.addEventListener('click', handleExternalLinkClick);
      return () => articleContent.removeEventListener('click', handleExternalLinkClick);
    }
  }, [selectedPost, adSettings]);

  // Таймер для interstitial режима
  useEffect(() => {
    if (showAdModal && adSettings.adType === 'interstitial' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showAdModal && adSettings.adType === 'interstitial' && countdown === 0 && pendingExternalHref) {
      // Автоматический переход после таймера
      window.open(pendingExternalHref, '_blank');
      setShowAdModal(false);
      setPendingExternalHref(null);
    }
  }, [showAdModal, countdown, pendingExternalHref, adSettings.adType]);

  const handleProceedExternalLink = () => {
    if (pendingExternalHref) {
      window.open(pendingExternalHref, '_blank');
    }
    setShowAdModal(false);
    setPendingExternalHref(null);
    setCountdown(0);
  };

  const handleCancelExternalLink = () => {
    setShowAdModal(false);
    setPendingExternalHref(null);
    setCountdown(0);
  };

  if (selectedPost) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto space-y-8 pb-12"
      >
        <button 
          onClick={() => {
            setSelectedPost(null);
            // Очищаем URL от slug
            window.history.pushState({}, '', '/blog');
          }}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Назад к статьям
        </button>

        <article className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800">
           <div className="relative h-64 sm:h-96 w-full">
            <img src={selectedPost.image_url || selectedPost.img} alt={selectedPost.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute top-6 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm">
              <span className="text-sm font-bold text-accent">{selectedPost.category}</span>
            </div>
          </div>
          
          <div className="p-6 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
              {selectedPost.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-medium mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <img src={`https://picsum.photos/seed/${selectedPost.author}/100/100`} alt={selectedPost.author} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-slate-900 dark:text-white font-bold">{selectedPost.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {selectedPost.date}
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" /> {selectedPost.views}
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs">{selectedPost.readTime}</span>
              </div>
            </div>

               <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed space-y-6">
               <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                 {selectedPost.excerpt}
               </p>
               
               {selectedPost.content ? (
                  <BlogContentWithAds 
                    content={processContent(selectedPost.content)} 
                    adSettings={blogAdSettings}
                  />
                ) : (
                 <p className="text-slate-400 italic">Содержание статьи будет добавлено позже...</p>
               )}
             </div>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => handleLike(selectedPost.id, e)}
                  className={`flex items-center gap-2 transition-colors font-medium bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl ${
                    likedPosts.has(selectedPost.id) 
                      ? 'text-accent bg-accent/10' 
                      : 'text-slate-500 hover:text-accent'
                  }`}
                >
                  <ThumbsUp className={`w-5 h-5 ${likedPosts.has(selectedPost.id) ? 'fill-current' : ''}`} /> {getLikeCount(selectedPost)}
                </button>
                <button className="flex items-center gap-2 text-slate-500 hover:text-accent transition-colors font-medium bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
                  <MessageSquare className="w-5 h-5" /> {selectedPost.comments}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => handleBookmark(selectedPost.id, e)}
                  className={`p-2 transition-colors bg-slate-50 dark:bg-slate-800 rounded-xl ${
                    bookmarkedPosts.has(selectedPost.id)
                      ? 'text-accent'
                      : 'text-slate-500 hover:text-accent'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${bookmarkedPosts.has(selectedPost.id) ? 'fill-current' : ''}`} />
                </button>
                <button 
                  onClick={(e) => handleShare(selectedPost, e)}
                  className="p-2 text-slate-500 hover:text-accent transition-colors bg-slate-50 dark:bg-slate-800 rounded-xl relative"
                >
                  <Share2 className="w-5 h-5" />
                  {showShareTooltip && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs px-2 py-1 rounded whitespace-nowrap">
                      Скопировано!
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Комментарии к статье */}
            <div id="blog-comments">
              <BlogComments postId={selectedPost.id.toString()} />
            </div>
          </div>
        </article>

        {/* Модальное окно рекламы для внешних ссылок */}
        {showAdModal && (
          <div className="modal-overlay" onClick={handleCancelExternalLink} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              {/* Предупреждение о переходе */}
              {adSettings.showWarning && (
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                }}>
                  <h3 style={{
                    margin: '0 0 8px 0',
                    color: '#856404',
                    fontSize: '18px',
                    fontWeight: 600,
                  }}>
                    ⚠️ Внимание!
                  </h3>
                  <p style={{
                    margin: 0,
                    color: '#856404',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}>
                    Вы переходите на внешний сайт. Мы не несем ответственности за информацию, размещенную на сторонних ресурсах.
                  </p>
                </div>
              )}
              
              {/* Рекламный блок */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#059669',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>📢 Реклама</p>
                <p style={{
                  margin: '0 0 12px 0',
                  color: '#333',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}>
                  {adSettings.adText}
                </p>
                <a 
                  href={adSettings.ctaUrl}
                  style={{
                    display: 'inline-block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#059669',
                    textDecoration: 'underline',
                  }}
                >
                  {adSettings.ctaText} →
                </a>
              </div>
              
              {/* Кнопки действий */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}>
                <button
                  onClick={handleCancelExternalLink}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleProceedExternalLink}
                  disabled={adSettings.adType === 'interstitial' && countdown > 0}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: countdown > 0 ? '#ccc' : '#007bff',
                    color: 'white',
                    fontSize: '14px',
                    cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {adSettings.adType === 'interstitial' 
                    ? `Переход через ${countdown}...` 
                    : 'Перейти'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Блог</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/admin/blog'}
              className="flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <Settings className="w-4 h-4" />
              Управление
            </button>
            <button
              onClick={() => window.location.href = '/admin/blog/new'}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Новая статья
            </button>
          </div>
        )}
      </div>

      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder="Поиск статей..." 
          className="w-full bg-white dark:bg-slate-900 py-4 pl-12 pr-16 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
        />
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-2 bg-accent text-white p-2.5 rounded-xl shadow-lg shadow-accent/30 hover:bg-accent-light transition-colors"
        >
          <Filter className={`w-4 h-4 ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button 
              key={tab} 
              onClick={() => handleTabChange(tab)}
              className={`relative px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                isActive 
                  ? 'text-white shadow-md shadow-accent/20' 
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:-translate-y-0.5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBlog"
                  className="absolute inset-0 bg-slate-900 dark:bg-accent rounded-2xl z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          );
        })}
        {/* Кнопка сортировки */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`ml-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
            showFilters
              ? 'bg-accent text-white shadow-md shadow-accent/20'
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
          Сортировка
        </button>
      </div>

      {/* Панель сортировки */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Сортировать по</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSortBy('date'); setShowFilters(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    sortBy === 'date'
                      ? 'bg-accent text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  📅 Дате
                </button>
                <button
                  onClick={() => { setSortBy('views'); setShowFilters(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    sortBy === 'views'
                      ? 'bg-accent text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  👁️ Просмотрам
                </button>
                <button
                  onClick={() => { setSortBy('likes'); setShowFilters(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    sortBy === 'likes'
                      ? 'bg-accent text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  ❤️ Лайкам
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {currentPosts.map((post, index) => (
          <div key={post.id} className="contents">
            <div 
              onClick={() => {
                // Используем навигацию с slug, если он есть
                if (post.slug) {
                  window.history.pushState({}, '', `/blog/${post.slug}`);
                }
                setSelectedPost(post);
              }}
              className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col border border-transparent dark:border-slate-800 transition-colors group cursor-pointer"
            >
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img src={post.image_url || post.img} alt={post.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="text-xs font-bold text-accent">{post.category}</span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-1">
                  {post.excerpt}
                </p>
                <button className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-accent transition-colors mt-auto">
                  Читать далее <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            {/* Вставляем рекламу после 2-го поста */}
            {index === 1 && (
              <div className="md:col-span-2">
                <AdBanner />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6 pb-4">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                  currentPage === i + 1
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Загрузка статей...</p>
        </div>
      )}

      {/* No results message */}
      {!isLoading && filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">По вашему запросу ничего не найдено.</p>
        </div>
      )}
    </div>
  );
}
