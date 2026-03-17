import { memo, useMemo, useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteAds, AdPosition } from '../hooks/useSiteAds';

interface AdBannerProps {
  position?: AdPosition;
  className?: string;
  // Для обратной совместимости
  customText?: string;
  customDesc?: string;
  customCta?: string;
  customUrl?: string;
}

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
      containerRef.current.innerHTML = '';
      
      // Создаем временный контейнер для парсинга
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = adCode;
      
      // Находим все скрипты и выполняем их
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        newScript.src = script.src || undefined;
        newScript.async = script.async || false;
        newScript.defer = script.defer || false;
        
        // Удаляем атрибуты, которые могут вызвать повторную загрузку
        ['onerror', 'onload'].forEach(attr => newScript.removeAttribute(attr));
        
        containerRef.current?.appendChild(newScript);
      });
      
      // Копируем остальной контент
      const nonScriptElements = tempDiv.querySelectorAll(':not(script)');
      nonScriptElements.forEach(el => {
        if (containerRef.current) {
          containerRef.current.appendChild(el.cloneNode(true));
        }
      });
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
  const isExternalUrl = displayUrl.startsWith('http://') || displayUrl.startsWith('https://');

  const bannerContent = (
    <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6 border border-slate-200 dark:border-slate-700 relative overflow-hidden group cursor-pointer transition-colors">
      <div className="absolute top-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
        Реклама
      </div>
      {displayImageUrl ? (
        <div className="w-full sm:w-40 h-32 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700">
          <img 
            src={displayImageUrl} 
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
        href={displayUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`block w-full ${className}`}
      >
        {bannerContent}
      </a>
    );
  }

  return (
    <Link to={displayUrl} className={`block w-full ${className}`}>
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
      // Очищаем контейнер
      containerRef.current.innerHTML = '';
      
      // Парсим и внедряем код
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = adCode;
      
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        newScript.src = script.src || undefined;
        newScript.async = script.async || false;
        newScript.defer = script.defer || false;
        containerRef.current?.appendChild(newScript);
      });
      
      const nonScriptElements = tempDiv.querySelectorAll(':not(script)');
      nonScriptElements.forEach(el => {
        if (containerRef.current) {
          containerRef.current.appendChild(el.cloneNode(true));
        }
      });
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
      containerRef.current.innerHTML = '';
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = adCode;
      
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        newScript.src = script.src || undefined;
        newScript.async = script.async || false;
        newScript.defer = script.defer || false;
        containerRef.current?.appendChild(newScript);
      });
      
      const nonScriptElements = tempDiv.querySelectorAll(':not(script)');
      nonScriptElements.forEach(el => {
        if (containerRef.current) {
          containerRef.current.appendChild(el.cloneNode(true));
        }
      });
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
