import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Глобальная переменная для gtag
 declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

let isGALoaded = false;
let currentGAId: string | null = null;

export function useGoogleAnalytics() {
  const [gaConfig, setGaConfig] = useState<{ id: string | null; enabled: boolean }>({
    id: null,
    enabled: false,
  });

  useEffect(() => {
    // Загружаем настройки GA из БД
    const loadGAConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', ['ga_measurement_id', 'ga_enabled']);

        if (error) {
          console.error('Error loading GA config:', error);
          return;
        }

        const config: Record<string, string> = {};
        data?.forEach((item) => {
          config[item.key] = item.value;
        });

        const id = config['ga_measurement_id'] || null;
        const enabled = config['ga_enabled'] === 'true';

        setGaConfig({ id, enabled });
      } catch (err) {
        console.error('Failed to load GA config:', err);
      }
    };

    loadGAConfig();
  }, []);

  return gaConfig;
}

export function loadGoogleAnalytics(gaId: string) {
  if (isGALoaded && currentGAId === gaId) {
    return;
  }

  // Удаляем старый скрипт если GA ID изменился
  if (currentGAId && currentGAId !== gaId) {
    const oldScript = document.querySelector(`script[data-ga-id="${currentGAId}"]`);
    if (oldScript) {
      oldScript.remove();
    }
    isGALoaded = false;
  }

  if (!gaId || gaId.trim() === '') {
    return;
  }

  // Создаем dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', gaId, {
    send_page_view: false, // Отключаем автоматическую отправку, будем отправлять вручную
    cookie_flags: 'SameSite=None;Secure',
  });

  // Загружаем скрипт GA
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  script.setAttribute('data-ga-id', gaId);
  
  // Обработка ошибки загрузки скрипта (например, если заблокирован в России)
  script.onerror = () => {
    console.warn('Google Analytics script failed to load (may be blocked in your region)');
    isGALoaded = false;
    currentGAId = null;
  };
  
  document.head.appendChild(script);

  isGALoaded = true;
  currentGAId = gaId;
}

export function trackPageView(path: string, title?: string) {
  if (!isGALoaded || !window.gtag) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (!isGALoaded || !window.gtag) {
    return;
  }

  window.gtag('event', eventName, params);
}

// Компонент для автоматического отслеживания просмотров страниц
export default function GoogleAnalytics() {
  const location = useLocation();
  const { id, enabled } = useGoogleAnalytics();

  // Загружаем GA скрипт
  useEffect(() => {
    if (enabled && id) {
      loadGoogleAnalytics(id);
    }
  }, [id, enabled]);

  // Отслеживаем смену страницы
  useEffect(() => {
    if (enabled && id) {
      trackPageView(location.pathname + location.search, document.title);
    }
  }, [location, enabled, id]);

  return null; // Этот компонент не рендерит ничего
}

// Hook для получения функции отслеживания событий
export function useGATracking() {
  const { enabled, id } = useGoogleAnalytics();

  return {
    trackEvent: (eventName: string, params?: Record<string, string | number | boolean>) => {
      if (enabled && id) {
        trackEvent(eventName, params);
      }
    },
    trackPageView: (path: string, title?: string) => {
      if (enabled && id) {
        trackPageView(path, title);
      }
    },
    isEnabled: enabled && !!id,
  };
}