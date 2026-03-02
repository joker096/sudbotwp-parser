import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';

function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Проверяем, было ли уже дано согласие
    const consent = localStorage.getItem('sud-cookie-consent');
    if (!consent) {
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('sud-cookie-consent', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-8 md:right-auto md:w-[380px] bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-2xl z-[100] border border-slate-800"
        >
          <div className="flex items-start gap-4">
            <div className="bg-accent/20 p-2.5 rounded-2xl shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm">Конфиденциальность</h3>
                <button 
                  onClick={() => setIsVisible(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-2 -mt-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Мы используем файлы cookie для улучшения работы сервиса и аналитики. Продолжая использовать сайт, вы соглашаетесь с нашей <a href="/privacy" rel="nofollow" className="text-accent hover:underline">Политикой обработки данных</a>.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={handleAccept}
                  className="flex-1 bg-accent hover:bg-accent-light text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-accent/20"
                >
                  Понятно, спасибо
                </button>
                <button 
                  onClick={() => setIsVisible(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                >
                  Скрыть
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(CookieBanner);
