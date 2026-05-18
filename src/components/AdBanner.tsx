import { memo, useMemo, useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteAds, AdPosition } from '../hooks/useSiteAds';
import { sanitizeHtml, sanitizeUrl } from '../lib/sanitizeHtml';

interface AdBannerProps {
  position?: AdPosition;
  className?: string;
  // Для обратной совместимости
  customText?: string;
  customDesc?: string;
  customCta?: string;
  customUrl?: string;
}

const TRUSTED_SCRIPT_HOSTS = [
  'googleads.g.doubleclick.net',
  'pagead2.googlesyndication.com',
  'googlesyndication.com',
  'doubleclick.net',
];

const isTrustedScriptSource = (src: string): boolean => {
  if (!src) return false;
  try {
    const url = new URL(src, window.location.origin);
    return TRUSTED_SCRIPT_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

const mountSafeAdCode = (container: HTMLDivElement, adCode: string) => {
  container.innerHTML = '';

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitizeHtml(adCode);

  const scripts = tempDiv.querySelectorAll('script');
  scripts.forEach((script) => {
    const src = script.getAttribute('src') || '';
    if (!isTrustedScriptSource(src)) return;

    const newScript = document.createElement('script');
    newScript.src = src;
    newScript.async = script.async || false;
    newScript.defer = script.defer || false;
    container.appendChild(newScript);
  });

  const nonScriptElements = tempDiv.querySelectorAll(':not(script)');
  nonScriptElements.forEach((el) => {
    container.appendChild(el.cloneNode(true));
  });
};

function AdBanner({ 
  position = 'homepage', 
  className = '',
  customText,
  customDesc,
  customCta,
  customUrl 
}: AdBannerProps) {
  const { settings, isLoading, getAdCode, getHomepageBanner } = useSiteAds();
  const containerRef = useRef<HTMLDivElement>(null);
  const [adCode, setAdCode] = useState<string>('');

  // Загружаем рекламный код для указанной позиции
  useEffect(() => {
    if (!isLoading) {
      const code = getAdCode(position);
      setAdCode(code);
    }
  }, [isLoading, position, getAdCode]);

  // Внедряем рекламный код на страницу
  useEffect(() => {
    if (adCode && containerRef.current) {
      mountSafeAdCode(containerRef.current, adCode);
    }
  }, [adCode]);

  // Если есть рекламный код, показываем его
  if (adCode && settings.adsEnabled) {
    return (
      <div 
        ref={containerRef}
        className={`ad-container min-h-[100px] flex items-center justify-center ${className}`}
      />
    );
  }

  // Иначе показываем баннер-заглушку (только для homepage позиции)
  const bannerSettings = getHomepageBanner();
  
  const displayText = customText || bannerSettings?.bannerText || 'Ваша реклама здесь';
  const displayDesc = customDesc || bannerSettings?.bannerDesc || 'Нативное размещение рекламы для вашей целевой аудитории. Привлекайте клиентов, которым нужны юридические услуги.';
  const displayCta = customCta || bannerSettings?.bannerCta || 'Узнать подробнее';
  const displayUrl = customUrl || bannerSettings?.bannerUrl || '/leads';
  const displayImageUrl = bannerSettings?.bannerImageUrl || '';
  
  // Проверяем, является ли URL внешней ссылкой
  const safeDisplayUrl = sanitizeUrl(displayUrl);
  const safeDisplayImageUrl = sanitizeUrl(displayImageUrl);
  const isExternalUrl = safeDisplayUrl.startsWith('http://') || safeDisplayUrl.startsWith('https://');

  const bannerContent = (
    <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6 border border-slate-200 dark:border-slate-700 relative overflow-hidden group cursor-pointer transition-colors">
      <div className="absolute top-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
        Реклама
      </div>
      {safeDisplayImageUrl ? (
        <div className="w-full sm:w-40 h-32 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700">
          <img 
            src={safeDisplayImageUrl} 
            alt={displayText}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full sm:w-40 h-32 sm:h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl shrink-0 flex items-center justify-center">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">Место для баннера</span>
        </div>
      )}
      <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-accent transition-colors">
          {displayText}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
          {displayDesc}
        </p>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-light transition-colors">
          {displayCta} <ExternalLink className="w-4 h-4" />
        </span>
      </div>
    </div>
  );

  // Оборачиваем в ссылку
  if (isExternalUrl) {
    return (
      <a 
        href={safeDisplayUrl || '#'} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`block w-full ${className}`}
      >
        {bannerContent}
      </a>
    );
  }

  return (
    <Link to={safeDisplayUrl || '/'} className={`block w-full ${className}`}>
      {bannerContent}
    </Link>
  );
}

// Компонент для показа рекламного блока без UI (только код)
export function AdBlock({ position, className = '' }: { position: AdPosition; className?: string }) {
  const { settings, isLoading, getAdCode } = useSiteAds();
  const containerRef = useRef<HTMLDivElement>(null);
  const [adCode, setAdCode] = useState<string>('');

  useEffect(() => {
    if (!isLoading) {
      const code = getAdCode(position);
      setAdCode(code);
    }
  }, [isLoading, position, getAdCode]);

  useEffect(() => {
    if (adCode && containerRef.current) {
      mountSafeAdCode(containerRef.current, adCode);
    }
  }, [adCode]);

  if (!adCode || !settings.adsEnabled) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`ad-block min-h-[100px] w-full ${className}`}
    />
  );
}

// Компонент для вставки рекламы между элементами списка
export function AdBetweenItems({ 
  index, 
  className = '' 
}: { 
  index: number; 
  className?: string 
}) {
  const { settings, isLoading, getBetweenItemsSettings } = useSiteAds();
  const containerRef = useRef<HTMLDivElement>(null);
  const [adCode, setAdCode] = useState<string>('');

  const betweenSettings = getBetweenItemsSettings();

  useEffect(() => {
    if (!isLoading && betweenSettings) {
      // Проверяем, нужно ли показывать рекламу после этого элемента
      if (index === betweenSettings.after && settings.adsEnabled) {
        // Используем между items код
        const codes = [
          betweenSettings.yandex,
          betweenSettings.google,
          betweenSettings.custom,
        ].filter(Boolean);
        
        // Или глобальные коды
        if (codes.length === 0) {
          codes.push(settings.globalYandex, settings.globalGoogle, settings.globalCustom);
        }
        
        setAdCode(codes.join('\n'));
      }
    }
  }, [isLoading, index, betweenSettings, settings]);

  useEffect(() => {
    if (adCode && containerRef.current) {
      mountSafeAdCode(containerRef.current, adCode);
    }
  }, [adCode]);

  if (!adCode) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`ad-between-items my-8 ${className}`}
    />
  );
}

export default memo(AdBanner);
