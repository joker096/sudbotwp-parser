import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Глобальная обработка ошибок для подавления сетевых ошибок от внешних ресурсов (Google, YouTube и т.д.)
// Это нужно для регионов, где заблокированы сервисы Google
if (typeof window !== 'undefined') {
  // Перехватываем ошибки скриптов
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) {
    if (type === 'error') {
      const wrappedListener = function(event: Event) {
        const target = event.target as HTMLElement;
        // Игнорируем ошибки от Google и DoubleClick
        if (target && target.tagName === 'SCRIPT') {
          const src = (target as HTMLScriptElement).src || '';
          if (src.includes('googletagmanager') || 
              src.includes('google-analytics') || 
              src.includes('doubleclick.net') ||
              src.includes('googleads')) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
        // Для ошибок iframe (YouTube)
        if (target && target.tagName === 'IFRAME') {
          const src = (target as HTMLIFrameElement).src || '';
          if (src.includes('youtube.com') || src.includes('googlevideo.com')) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
        (listener as EventListener)(event);
      };
      return originalAddEventListener.call(window, type, wrappedListener, options);
    }
    return originalAddEventListener.call(window, type, listener, options);
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут
      gcTime: 1000 * 60 * 30, // 30 минут (ранее cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
