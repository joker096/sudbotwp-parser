import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { auth } from '../lib/supabase';
import { useSeo } from '../hooks/useSeo';

export default function Login() {
  const { setSeo } = useSeo('/login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Вход в систему - Sud',
      description: 'Войдите в свой аккаунт на платформе Sud для доступа к мониторингу дел и лидам.',
      keywords: 'вход, регистрация, аккаунт, авторизация',
      ogTitle: 'Вход в систему - Sud',
      ogDescription: 'Войдите в свой аккаунт для доступа к мониторингу судебных дел.',
      noindex: true,
    });
  }, [setSeo]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await auth.signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при входе');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Вход в систему
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Для доступа к вашему личному кабинету
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {error}
              </p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white py-4 px-6 rounded-2xl font-bold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <img
                src="https://picsum.photos/seed/google/20/20"
                alt="Google"
                className="w-5 h-5 rounded-full"
              />
            )}
            Войти с Google
          </button>

          <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            <p>
              Нажав «Войти с Google», вы соглашаетесь с{' '}
              <a href="/help" className="underline hover:text-slate-600 dark:hover:text-slate-300">
                Условиями использования
              </a>{' '}
              и{' '}
              <a href="/privacy" className="underline hover:text-slate-600 dark:hover:text-slate-300">
                Политикой конфиденциальности
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
