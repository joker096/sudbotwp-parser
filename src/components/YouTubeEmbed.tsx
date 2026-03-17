import { useState } from 'react';
import { Play } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  className?: string;
}

export function YouTubeEmbed({ videoId, title = 'YouTube видео', className = '' }: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  
  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
    triggerOnce: true,
  });

  // Функция для загрузки thumbnail при клике (ленвая загрузка)
  const loadThumbnail = async () => {
    if (thumbnailUrl) return; // Уже загружен
    
    // Пробуем сначала maxresdefault
    const maxresUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    // Проверяем загрузку thumbnail через Image объект
    const checkThumbnail = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    };
    
    // Пробуем maxresdefault
    const maxresOk = await checkThumbnail(maxresUrl);
    if (maxresOk) {
      setThumbnailUrl(maxresUrl);
      setThumbnailLoaded(true);
      return;
    }
    
    // Fallback на hqdefault
    const hqUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    const hqOk = await checkThumbnail(hqUrl);
    if (hqOk) {
      setThumbnailUrl(hqUrl);
      setThumbnailLoaded(true);
      return;
    }
    
    // Fallback на default
    const defaultUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;
    const defaultOk = await checkThumbnail(defaultUrl);
    if (defaultOk) {
      setThumbnailUrl(defaultUrl);
      setThumbnailLoaded(true);
      return;
    }
    
    // Если ничего не работает - показываем заглушку без thumbnail
    setThumbnailUrl(null);
    setThumbnailLoaded(true);
  };

  const handlePlay = async () => {
    // Загружаем thumbnail только при клике
    await loadThumbnail();
    setIsPlaying(true);
  };

  return (
    <div 
      ref={inViewRef} 
      className={`youtube-embed-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%', // 16:9 aspect ratio
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '1.5rem',
      }}
    >
      {!isPlaying ? (
        // Показываем thumbnail с кнопкой play
        <div 
          onClick={handlePlay}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
        >
          {inView && thumbnailLoaded && thumbnailUrl && (
            <img 
              src={thumbnailUrl}
              alt={title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
          {/* Показываем цветную заглушку пока thumbnail не загружен */}
          {(!thumbnailLoaded || !thumbnailUrl) && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play 
                size={48} 
                color="#666" 
                style={{
                  opacity: 0.5,
                }}
              />
            </div>
          )}
          {/* Overlay для затемнения */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Кнопка play */}
            <div 
              style={{
                width: '68px',
                height: '48px',
                backgroundColor: 'rgba(255, 0, 0, 0.9)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.2s, background-color 0.2s',
              }}
              className="youtube-play-button"
            >
              <Play 
                size={32} 
                color="white" 
                fill="white"
                style={{
                  marginLeft: '4px',
                }}
              />
            </div>
          </div>
          {/* Текст "Нажмите для воспроизведения" */}
          <div 
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
            }}
          >
            Нажмите для воспроизведения
          </div>
        </div>
      ) : (
        // Показываем iframe с видео
        // Используем параметры для минимизации рекламных запросов
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=0&controls=1&fs=1&enablejsapi=0&widgetid=1&noapi=1&disable_polymer=1&hl=ru&cc_lang_pref=ru&iv_load_policy=3&loop=0&playlist=&start=0&end=0&playsinline=1&autohide=1&showinfo=0&controls=1&modestbranding=1&rel=0&disable_web_ui=0&enablejsapi=0&origin=${window.location.origin}&disableads=1&noads=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          onError={(e) => {
            // Подавляем ошибки загрузки iframe (например, при блокировке Google)
            console.warn('YouTube embed failed to load (may be blocked in your region)');
            // Скрываем iframe при ошибке
            const target = e.currentTarget;
            target.style.display = 'none';
          }}
          onLoad={(e) => {
            // Удаляем рекламные скрипты и запросы
            try {
              const iframe = e?.currentTarget;
              if (iframe?.contentDocument?.head) {
                const scripts = iframe.contentDocument.head.querySelectorAll('script');
                scripts.forEach(script => {
                  if (script.src.includes('doubleclick') || script.src.includes('googleads')) {
                    script.remove();
                  }
                });
              }
            } catch (error) {
              // Игнорируем ошибки доступа к iframe контенту (CORS)
            }
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      )}
      
      <style>{`
        .youtube-play-button:hover {
          transform: scale(1.05);
          background-color: rgba(255, 0, 0, 1) !important;
        }
      `}</style>
    </div>
  );
}

// Функция для извлечения ID видео из различных форматов URL
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Удаляем параметры URL (например, ?si=...) перед обработкой
  const cleanUrl = url.split('?')[0];
  
  // patterns for different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}
