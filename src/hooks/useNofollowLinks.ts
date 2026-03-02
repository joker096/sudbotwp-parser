import { useEffect } from 'react';

/**
 * Хук для автоматического добавления rel="nofollow" ко всем исходящим ссылкам на странице
 * Использует MutationObserver для отслеживания добавления новых ссылок
 */
export function useNofollowLinks() {
  useEffect(() => {
    const addNofollowToLinks = () => {
      // Находим все ссылки на странице
      const links = document.querySelectorAll('a[href^="http"]:not([rel*="nofollow"]):not([href^="' + window.location.origin + '"])');
      
      links.forEach((link) => {
        const anchor = link as HTMLAnchorElement;
        // Проверяем, что это внешняя ссылка
        if (!anchor.href.startsWith(window.location.origin)) {
          // Добавляем rel="nofollow noopener noreferrer" если его нет
          if (!anchor.rel.includes('nofollow')) {
            const existingRel = anchor.rel || '';
            anchor.rel = existingRel ? `${existingRel} nofollow noopener noreferrer` : 'nofollow noopener noreferrer';
          }
        }
      });
    };

    // Применяем сразу при монтировании
    addNofollowToLinks();

    // Создаем MutationObserver для отслеживания изменений в DOM
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
        }
      });
      
      if (shouldProcess) {
        addNofollowToLinks();
      }
    });

    // Наблюдаем за изменениями в body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);
}

export default useNofollowLinks;
