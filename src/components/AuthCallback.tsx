import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PageLoader from './PageLoader';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase auth helpers автоматически обрабатывают токен из URL
    // и создают сессию. Этот компонент просто дает время на обработку.
    const handleAuthCallback = async () => {
      try {
        // Проверяем, есть ли активная сессия
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (session) {
          // Если сессия создана, перенаправляем на профиль
          window.location.href = '/profile';
        } else {
          // Если сессии нет, ждем немного и проверяем снова
          // (Supabase auth helpers могут еще обрабатывать токен)
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              window.location.href = '/profile';
            } else {
              setError('Ошибка аутентификации. Попробуйте войти снова.');
              setTimeout(() => {
                window.location.href = '/login';
              }, 2000);
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Ошибка аутентификации');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    };

    handleAuthCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">{error}</div>
          <div className="text-gray-500">Перенаправление на страницу входа...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <PageLoader />
        <p className="mt-4 text-gray-600">Идет аутентификация...</p>
      </div>
    </div>
  );
}
