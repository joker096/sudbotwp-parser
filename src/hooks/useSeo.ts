import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface SeoData {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
  // Кастомные мета теги для страниц
  customMeta?: Array<{ name?: string; property?: string; content: string }>;
}

interface UseSeoReturn {
  setSeo: (data: SeoData) => void;
  resetSeo: () => void;
}

// Дефолтные SEO настройки
const DEFAULT_SEO: SeoData = {
  title: 'Судовой Бот - Мониторинг судебных дел онлайн',
  description: 'Отслеживайте судебные дела в режиме онлайн. Поиск по базе судов РФ, мониторинг дел, уведомления о новых событиях.',
  keywords: 'суд, мониторинг, судебные дела, поиск судов, РФ',
  ogType: 'website',
  noindex: false,
  nofollow: false,
};

// Кэш для хранения загруженных SEO данных с сервера
const seoCache: Map<string, SeoData> = new Map();

export function useSeo(pagePath?: string): UseSeoReturn {
  // Загрузка SEO с сервера при монтировании
  useEffect(() => {
    if (!pagePath) return;

    const loadSeoFromServer = async () => {
      // Проверяем кэш
      if (seoCache.has(pagePath)) {
        applySeo(seoCache.get(pagePath)!);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('page_seo')
          .select('*')
          .eq('page_path', pagePath)
          .limit(1)
          .maybeSingle();

        if (error) {
          // Don't throw, just log. The page can still render with default/static SEO.
          console.warn(`Error loading SEO for ${pagePath}:`, error.message);
          return;
        }

        if (data) {
          // Преобразуем meta_* поля в формат, ожидаемый фронтендом
          const seoData: SeoData = {
            title: data.meta_title,
            description: data.meta_description,
            keywords: data.meta_keywords,
            author: data.meta_author,
            ogTitle: data.og_title,
            ogDescription: data.og_description,
            ogImage: data.og_image,
            ogType: data.og_type,
            ogUrl: data.og_url,
            canonicalUrl: data.canonical_url,
            noindex: data.noindex,
            nofollow: data.nofollow,
          };
          seoCache.set(pagePath, seoData);
          applySeo(seoData);
        }
      } catch (error) {
        console.error(`Error loading SEO for ${pagePath}:`, error);
      }
    };

    loadSeoFromServer();
  }, [pagePath]);

  const setSeo = useCallback((data: SeoData) => {
    applySeo({ ...DEFAULT_SEO, ...data });
  }, []);

  const resetSeo = useCallback(() => {
    applySeo(DEFAULT_SEO);
  }, []);

  return { setSeo, resetSeo };
}

// Применение SEO данных к документу
function applySeo(data: SeoData) {
  // Title
  if (data.title) {
    document.title = data.title;
  }

  // Meta теги
  setMetaTag('description', data.description);
  setMetaTag('keywords', data.keywords);
  setMetaTag('author', data.author);

  // Open Graph
  setMetaTag('og:title', data.ogTitle || data.title, 'property');
  setMetaTag('og:description', data.ogDescription || data.description, 'property');
  setMetaTag('og:image', data.ogImage, 'property');
  setMetaTag('og:type', data.ogType || 'website', 'property');
  setMetaTag('og:url', data.ogUrl, 'property');

  // Twitter
  setMetaTag('twitter:card', 'summary_large_image', 'name');
  setMetaTag('twitter:title', data.ogTitle || data.title, 'name');
  setMetaTag('twitter:description', data.ogDescription || data.description, 'name');
  setMetaTag('twitter:image', data.ogImage, 'name');

  // Canonical URL
  if (data.canonicalUrl) {
    setLinkTag('canonical', data.canonicalUrl);
  }

  // Robots
  const robots: string[] = [];
  if (data.noindex) robots.push('noindex');
  if (data.nofollow) robots.push('nofollow');
  if (robots.length > 0) {
    setMetaTag('robots', robots.join(', '));
  } else {
    setMetaTag('robots', 'index, follow');
  }

  // Кастомные мета теги
  if (data.customMeta && data.customMeta.length > 0) {
    data.customMeta.forEach((meta) => {
      if (meta.name) {
        setMetaTag(meta.name, meta.content, 'name');
      } else if (meta.property) {
        setMetaTag(meta.property, meta.content, 'property');
      }
    });
  }
}

// Утилита для установки meta тега
function setMetaTag(name: string | undefined, value: string | undefined, type: 'name' | 'property' = 'name') {
  if (!name || !value) return;

  let meta = document.querySelector(`meta[${type}="${name}"]`) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(type, name);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', value);
}

// Утилита для установки link тега
function setLinkTag(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  
  link.setAttribute('href', href);
}

export default useSeo;
