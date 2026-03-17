import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export type AdPosition = 
  | 'header' 
  | 'sidebar' 
  | 'content_top' 
  | 'content_middle' 
  | 'content_bottom' 
  | 'footer' 
  | 'between_items'
  | 'homepage'
  | 'search'
  | 'lawyers'
  | 'leads'
  | 'monitoring'
  | 'calculator'
  | 'blog_article';

export interface AdSettings {
  // Глобальные
  adsEnabled: boolean;
  globalYandex: string;
  globalGoogle: string;
  globalCustom: string;
  
  // По позициям
  header: AdPositionSettings;
  sidebar: AdPositionSettings;
  contentTop: AdPositionSettings;
  contentMiddle: AdPositionSettings;
  contentBottom: AdPositionSettings;
  footer: AdPositionSettings;
  betweenItems: BetweenItemsSettings;
  
  // Страницы
  homepage: HomepageSettings;
  search: PageEnabled;
  lawyers: PageEnabled;
  leads: PageEnabled;
  monitoring: PageEnabled;
  calculator: PageEnabled;
  blogArticle: BlogArticleSettings;
  
  // Ограничения
  frequencyLimit: number;
  refreshInterval: number;
}

export interface AdPositionSettings {
  enabled: boolean;
  yandex: string;
  google: string;
  custom: string;
}

export interface BetweenItemsSettings {
  enabled: boolean;
  after: number;
  yandex: string;
  google: string;
  custom: string;
}

export interface HomepageSettings {
  enabled: boolean;
  bannerText: string;
  bannerDesc: string;
  bannerCta: string;
  bannerUrl: string;
  bannerImageUrl: string;
}

export interface PageEnabled {
  enabled: boolean;
}

export interface BlogArticleSettings {
  enabled: boolean;
  afterParagraph: number;
  yandex: string;
  google: string;
  custom: string;
}

// Ключи для загрузки из БД
const AD_KEYS = [
  // Глобальные
  'site_ads_enabled',
  'site_ads_global_yandex',
  'site_ads_global_google',
  'site_ads_global_custom',
  
  // Header
  'ad_header_enabled',
  'ad_header_yandex',
  'ad_header_google',
  'ad_header_custom',
  
  // Sidebar
  'ad_sidebar_enabled',
  'ad_sidebar_yandex',
  'ad_sidebar_google',
  'ad_sidebar_custom',
  
  // Content Top
  'ad_content_top_enabled',
  'ad_content_top_yandex',
  'ad_content_top_google',
  'ad_content_top_custom',
  
  // Content Middle
  'ad_content_middle_enabled',
  'ad_content_middle_yandex',
  'ad_content_middle_google',
  'ad_content_middle_custom',
  
  // Content Bottom
  'ad_content_bottom_enabled',
  'ad_content_bottom_yandex',
  'ad_content_bottom_google',
  'ad_content_bottom_custom',
  
  // Footer
  'ad_footer_enabled',
  'ad_footer_yandex',
  'ad_footer_google',
  'ad_footer_custom',
  
  // Between Items
  'ad_between_items_enabled',
  'ad_between_items_after',
  'ad_between_items_yandex',
  'ad_between_items_google',
  'ad_between_items_custom',
  
  // Homepage
  'ad_homepage_enabled',
  'ad_homepage_banner_text',
  'ad_homepage_banner_desc',
  'ad_homepage_banner_cta',
  'ad_homepage_banner_url',
  'ad_homepage_banner_image_url',
  
  // Pages
  'ad_search_enabled',
  'ad_lawyers_enabled',
  'ad_leads_enabled',
  'ad_monitoring_enabled',
  'ad_calculator_enabled',
  
  // Blog Article
  'ad_blog_article_enabled',
  'ad_blog_article_after_paragraph',
  'ad_blog_article_yandex',
  'ad_blog_article_google',
  'ad_blog_article_custom',
  
  // Limits
  'ad_frequency_limit',
  'ad_refresh_interval',
];

const DEFAULT_SETTINGS: AdSettings = {
  adsEnabled: true,
  globalYandex: '',
  globalGoogle: '',
  globalCustom: '',
  
  header: { enabled: false, yandex: '', google: '', custom: '' },
  sidebar: { enabled: true, yandex: '', google: '', custom: '' },
  contentTop: { enabled: true, yandex: '', google: '', custom: '' },
  contentMiddle: { enabled: true, yandex: '', google: '', custom: '' },
  contentBottom: { enabled: true, yandex: '', google: '', custom: '' },
  footer: { enabled: true, yandex: '', google: '', custom: '' },
  betweenItems: { enabled: true, after: 3, yandex: '', google: '', custom: '' },
  
  homepage: {
    enabled: true,
    bannerText: 'Ваша реклама здесь',
    bannerDesc: 'Нативное размещение рекламы для вашей целевой аудитории. Привлекайте клиентов, которым нужны юридические услуги.',
    bannerCta: 'Узнать подробнее',
    bannerUrl: '/leads',
    bannerImageUrl: '',
  },
  
  search: { enabled: true },
  lawyers: { enabled: true },
  leads: { enabled: true },
  monitoring: { enabled: true },
  calculator: { enabled: true },
  blogArticle: { enabled: true, afterParagraph: 3, yandex: '', google: '', custom: '' },
  
  frequencyLimit: 3,
  refreshInterval: 0,
};

export function useSiteAds() {
  const [settings, setSettings] = useState<AdSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', AD_KEYS);

      if (error) {
        console.error('Error loading site ads settings:', error);
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach((s: { key: string; value: string }) => {
          settingsMap[s.key] = s.value;
        });

        const loaded: AdSettings = {
          adsEnabled: settingsMap.site_ads_enabled !== 'false',
          globalYandex: settingsMap.site_ads_global_yandex || '',
          globalGoogle: settingsMap.site_ads_global_google || '',
          globalCustom: settingsMap.site_ads_global_custom || '',
          
          header: {
            enabled: settingsMap.ad_header_enabled === 'true',
            yandex: settingsMap.ad_header_yandex || '',
            google: settingsMap.ad_header_google || '',
            custom: settingsMap.ad_header_custom || '',
          },
          sidebar: {
            enabled: settingsMap.ad_sidebar_enabled !== 'false',
            yandex: settingsMap.ad_sidebar_yandex || '',
            google: settingsMap.ad_sidebar_google || '',
            custom: settingsMap.ad_sidebar_custom || '',
          },
          contentTop: {
            enabled: settingsMap.ad_content_top_enabled !== 'false',
            yandex: settingsMap.ad_content_top_yandex || '',
            google: settingsMap.ad_content_top_google || '',
            custom: settingsMap.ad_content_top_custom || '',
          },
          contentMiddle: {
            enabled: settingsMap.ad_content_middle_enabled !== 'false',
            yandex: settingsMap.ad_content_middle_yandex || '',
            google: settingsMap.ad_content_middle_google || '',
            custom: settingsMap.ad_content_middle_custom || '',
          },
          contentBottom: {
            enabled: settingsMap.ad_content_bottom_enabled !== 'false',
            yandex: settingsMap.ad_content_bottom_yandex || '',
            google: settingsMap.ad_content_bottom_google || '',
            custom: settingsMap.ad_content_bottom_custom || '',
          },
          footer: {
            enabled: settingsMap.ad_footer_enabled !== 'false',
            yandex: settingsMap.ad_footer_yandex || '',
            google: settingsMap.ad_footer_google || '',
            custom: settingsMap.ad_footer_custom || '',
          },
          betweenItems: {
            enabled: settingsMap.ad_between_items_enabled !== 'false',
            after: parseInt(settingsMap.ad_between_items_after || '3', 10),
            yandex: settingsMap.ad_between_items_yandex || '',
            google: settingsMap.ad_between_items_google || '',
            custom: settingsMap.ad_between_items_custom || '',
          },
          
          homepage: {
            enabled: settingsMap.ad_homepage_enabled !== 'false',
            bannerText: settingsMap.ad_homepage_banner_text || DEFAULT_SETTINGS.homepage.bannerText,
            bannerDesc: settingsMap.ad_homepage_banner_desc || DEFAULT_SETTINGS.homepage.bannerDesc,
            bannerCta: settingsMap.ad_homepage_banner_cta || DEFAULT_SETTINGS.homepage.bannerCta,
            bannerUrl: settingsMap.ad_homepage_banner_url || DEFAULT_SETTINGS.homepage.bannerUrl,
            bannerImageUrl: settingsMap.ad_homepage_banner_image_url || '',
          },
          
          search: { enabled: settingsMap.ad_search_enabled !== 'false' },
          lawyers: { enabled: settingsMap.ad_lawyers_enabled !== 'false' },
          leads: { enabled: settingsMap.ad_leads_enabled !== 'false' },
          monitoring: { enabled: settingsMap.ad_monitoring_enabled !== 'false' },
          calculator: { enabled: settingsMap.ad_calculator_enabled !== 'false' },
          
          blogArticle: {
            enabled: settingsMap.ad_blog_article_enabled !== 'false',
            afterParagraph: parseInt(settingsMap.ad_blog_article_after_paragraph || '3', 10),
            yandex: settingsMap.ad_blog_article_yandex || '',
            google: settingsMap.ad_blog_article_google || '',
            custom: settingsMap.ad_blog_article_custom || '',
          },
          
          frequencyLimit: parseInt(settingsMap.ad_frequency_limit || '3', 10),
          refreshInterval: parseInt(settingsMap.ad_refresh_interval || '0', 10),
        };

        setSettings(loaded);
      }
    } catch (error) {
      console.error('Error loading site ads settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  // Получить код рекламы для конкретной позиции
  const getAdCode = useMemo(() => {
    return (position: AdPosition): string => {
      if (!settings.adsEnabled) return '';
      
      // Проверяем включена ли реклама для страницы/позиции
      switch (position) {
        case 'homepage':
          if (!settings.homepage.enabled) return '';
          break;
        case 'search':
          if (!settings.search.enabled) return '';
          break;
        case 'lawyers':
          if (!settings.lawyers.enabled) return '';
          break;
        case 'leads':
          if (!settings.leads.enabled) return '';
          break;
        case 'monitoring':
          if (!settings.monitoring.enabled) return '';
          break;
        case 'calculator':
          if (!settings.calculator.enabled) return '';
          break;
        case 'blog_article':
          if (!settings.blogArticle.enabled) return '';
          break;
        default:
          break;
      }

      let posSettings: AdPositionSettings | undefined;
      
      switch (position) {
        case 'header':
          posSettings = settings.header;
          break;
        case 'sidebar':
          posSettings = settings.sidebar;
          break;
        case 'content_top':
          posSettings = settings.contentTop;
          break;
        case 'content_middle':
          posSettings = settings.contentMiddle;
          break;
        case 'content_bottom':
          posSettings = settings.contentBottom;
          break;
        case 'footer':
          posSettings = settings.footer;
          break;
        case 'blog_article':
          posSettings = settings.blogArticle as unknown as AdPositionSettings;
          break;
        default:
          break;
      }

      // Если есть специфический код для позиции, используем его
      if (posSettings?.enabled) {
        const codes = [posSettings.yandex, posSettings.google, posSettings.custom].filter(Boolean);
        if (codes.length > 0) {
          return codes.join('\n');
        }
      }

      // Иначе используем глобальные коды
      const globalCodes = [settings.globalYandex, settings.globalGoogle, settings.globalCustom].filter(Boolean);
      return globalCodes.join('\n');
    };
  }, [settings]);

  // Проврить, включена ли реклама для страницы
  const isPageAdsEnabled = useMemo(() => {
    return (page: 'homepage' | 'search' | 'lawyers' | 'leads' | 'monitoring' | 'calculator' | 'blog_article'): boolean => {
      if (!settings.adsEnabled) return false;
      return settings[page].enabled;
    };
  }, [settings]);

  // Получить настройки баннера для главной страницы
  const homepageBanner = useMemo(() => {
    return settings.adsEnabled && settings.homepage.enabled ? settings.homepage : null;
  }, [settings]);

  // Получить настройки "между элементами"
  const betweenItemsSettings = useMemo(() => {
    return settings.adsEnabled && settings.betweenItems.enabled ? settings.betweenItems : null;
  }, [settings]);

  return {
    settings,
    isLoading,
    reloadSettings: loadSettings,
    getAdCode,
    isPageAdsEnabled,
    getHomepageBanner: () => homepageBanner,
    getBetweenItemsSettings: () => betweenItemsSettings,
  };
}