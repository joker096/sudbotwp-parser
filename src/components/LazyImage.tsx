import {useState, useEffect, useRef} from 'react';
import {useInView} from 'react-intersection-observer';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EЗагрузка...%3C/text%3E%3C/svg%3E',
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const {ref: inViewRef, inView} = useInView({
    threshold: 0,
    rootMargin: '100px',
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView && imgRef.current) {
      imgRef.current.src = src;
    }
  }, [inView, src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={inViewRef} className={`lazy-image-container ${className}`}>
      {!isLoaded && !hasError && (
        <img
          src={placeholder}
          alt={alt}
          className={`lazy-image-placeholder ${className}`}
          aria-hidden="true"
        />
      )}
      {inView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : 'loading'} ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
      )}
      {hasError && (
        <div className="lazy-image-error" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          color: '#9ca3af',
          fontSize: '12px',
        }}>
          Не удалось загрузить
        </div>
      )}
    </div>
  );
}
