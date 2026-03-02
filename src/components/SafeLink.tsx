import React, { useState } from 'react';

interface SafeLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

/**
 * Компонент SafeLink - безопасная ссылка с автоматическим добавлением 
 * rel="nofollow noopener noreferrer" для внешних ссылок и предупреждением
 */
export function SafeLink({ href, children, rel, onClick, ...props }: SafeLinkProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  
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
  );
  
  // Проверяем, является ли ссылкой на карты (Яндекс.Карты, Google Maps)
  const isMapLink = isExternal && (
    href.includes('yandex.ru/maps') || 
    href.includes('google.com/maps') ||
    href.includes('2gis.ru') ||
    href.includes('maps.yandex')
  );
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Для всех внешних ссылок показываем модальное окно с рекламой
    if (isExternal) {
      e.preventDefault();
      setPendingHref(href);
      setShowWarning(true);
      
      if (onClick) {
        onClick(e);
      }
    }
  };
  
  const handleProceed = () => {
    setShowWarning(false);
    if (pendingHref) {
      window.open(pendingHref, '_blank');
      setPendingHref(null);
    }
  };
  
  const handleCancel = () => {
    setShowWarning(false);
    setPendingHref(null);
  };
  
  // Для внешних ссылок добавляем rel="nofollow noopener noreferrer"
  // Модальное окно показываем для всех внешних ссылок
  if (isExternal) {
    const securityRel = 'nofollow noopener noreferrer';
    const customRel = rel ? `${rel} ${securityRel}` : securityRel;
    
    return (
      <>
        <a 
          href={href} 
          rel={customRel} 
          target="_blank"
          onClick={handleClick}
          {...props}
        >
          {children}
        </a>
        
        {showWarning && (
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
                  Хотите получать уведомления о новых событиях по вашему делу?
                </p>
                <a 
                  href="/monitoring" 
                  style={{
                    display: 'inline-block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#059669',
                    textDecoration: 'underline',
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleCancel();
                    window.location.href = '/monitoring';
                  }}
                >
                  Подключить мониторинг →
                </a>
              </div>
              
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
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#007bff',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Перейти
                </button>
              </div>
            </div>
          </div>
        )}
      </>
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
