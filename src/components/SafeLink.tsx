import React, { useState, useEffect } from 'react';
import { useExternalLinksAdSettings } from '../hooks/useExternalLinksAdSettings';

interface SafeLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  /** Отключить рекламу для этой ссылки (например, для партнёрских ссылок) */
  noAd?: boolean;
}

/**
 * Компонент SafeLink - безопасная ссылка с автоматическим добавлением 
 * rel="nofollow noopener noreferrer" для внешних ссылок и настраиваемым
 * показом рекламы при переходе.
 * 
 * Поддерживает 3 режима:
 * - modal: показ модального окна с рекламой перед переходом
 * - direct: прямой переход без рекламы
 * - interstitial: межстраничная реклама (переход с задержкой)
 */
export function SafeLink({ href, children, rel, onClick, noAd = false, ...props }: SafeLinkProps) {
  const [showModal, setShowModal] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const { settings, isLoading } = useExternalLinksAdSettings();
  
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  const isAnchor = href.startsWith('#');
  const isTel = href.startsWith('tel:');
  const isMailto = href.startsWith('mailto:');
  
  // Проверяем, является ли ссылка ссылкой на сайт суда
  const isCourtLink = isExternal && (
    href.includes('mirsud') || 
    href.includes('court') || 
    href.includes('sud') ||
    (href.includes('rf') && href.includes('.'))
  ) && !href.includes('gosuslugi');
  
  // Проверяем, является ли ссылкой на карты (Яндекс.Карты, Google Maps)
  const isMapLink = isExternal && (
    href.includes('yandex.ru/maps') || 
    href.includes('google.com/maps') ||
    href.includes('2gis.ru') ||
    href.includes('maps.yandex')
  );
  
  // Определяем, показывать ли рекламу
  const shouldShowAd = !noAd && !isCourtLink && !isMapLink && settings.adEnabled;

  // Обработчик клика для прямого перехода
  const handleDirectClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isExternal && shouldShowAd && settings.adType === 'direct') {
      // Для прямого перехода просто открываем ссылку
      if (onClick) {
        onClick(e);
      }
      // Ссылка откроется сама, так как мы не вызываем preventDefault
      return;
    }
    
    if (isExternal && shouldShowAd && settings.adType === 'interstitial') {
      e.preventDefault();
      setPendingHref(href);
      setCountdown(3); // 3 секунды ожидания
      setShowModal(true);
      
      if (onClick) {
        onClick(e);
      }
      return;
    }
    
    if (isExternal && shouldShowAd && settings.adType === 'modal') {
      e.preventDefault();
      setPendingHref(href);
      setShowModal(true);
      
      if (onClick) {
        onClick(e);
      }
      return;
    }
  };

  // Обработчик перехода
  const handleProceed = () => {
    setShowModal(false);
    if (pendingHref) {
      window.open(pendingHref, '_blank');
      setPendingHref(null);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setPendingHref(null);
    setCountdown(0);
  };

  // Обработчик для CTA кнопки
  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(false);
    setPendingHref(null);
    setCountdown(0);
    // Переходим по CTA URL
    window.location.href = settings.ctaUrl;
  };

  // Таймер для interstitial режима
  useEffect(() => {
    if (showModal && settings.adType === 'interstitial' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showModal && settings.adType === 'interstitial' && countdown === 0 && pendingHref) {
      // Автоматический переход после таймера
      handleProceed();
    }
  }, [showModal, countdown, pendingHref, settings.adType]);

  // Для внешних ссылок добавляем rel="nofollow noopener noreferrer"
  if (isExternal && !noAd) {
    const securityRel = 'nofollow noopener noreferrer';
    const customRel = rel ? `${rel} ${securityRel}` : securityRel;
    
    return (
      <>
        <a 
          href={href} 
          rel={customRel} 
          target="_blank"
          onClick={handleDirectClick}
          {...props}
        >
          {children}
        </a>
        
        {showModal && !isLoading && (
          <div className="modal-overlay" onClick={handleCancel} style={{
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
              {settings.showWarning && (
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
                  {settings.adText}
                </p>
                <a 
                  href={settings.ctaUrl}
                  style={{
                    display: 'inline-block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#059669',
                    textDecoration: 'underline',
                  }}
                  onClick={handleCtaClick}
                >
                  {settings.ctaText} →
                </a>
              </div>
              
              {/* Кнопки действий */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}>
                <button
                  onClick={handleCancel}
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
                  onClick={handleProceed}
                  disabled={settings.adType === 'interstitial' && countdown > 0}
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
                  {settings.adType === 'interstitial' 
                    ? `Переход через ${countdown}...` 
                    : 'Перейти'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  
  // Для внешних ссылок без рекламы (noAd=true)
  if (isExternal && noAd) {
    const securityRel = 'noopener noreferrer';
    const customRel = rel ? `${rel} ${securityRel}` : securityRel;
    
    return (
      <a 
        href={href} 
        rel={customRel} 
        target="_blank"
        onClick={onClick}
        {...props}
      >
        {children}
      </a>
    );
  }

  // Для якорных ссылок, тел и mailto - стандартные атрибуты
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

export default SafeLink;
