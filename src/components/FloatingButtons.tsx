import { ArrowUp, Shield } from 'lucide-react';
import { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

function FloatingButtons() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {/* Privacy Button - Bottom Left (скрыто на мобильных) */}
      {isVisible && (
        <motion.div
          key="privacy-button"
          initial={{ opacity: 0, x: -50, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed bottom-6 left-6 z-50 hidden md:block"
        >
          <Link 
            to="/privacy" 
            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-3 rounded-full shadow-lg hover:shadow-xl hover:text-accent dark:hover:text-accent transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2 group"
            title="Политика конфиденциальности"
          >
            <Shield className="w-5 h-5" />
            <span className="text-sm font-bold max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:ml-1 group-hover:mr-2">
              Конфиденциальность
            </span>
          </Link>
        </motion.div>
      )}

      {/* Scroll to Top - Bottom Right */}
      {isVisible && (
        <motion.button 
          key="scroll-to-top"
          onClick={scrollToTop}
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed bottom-6 right-6 z-50 bg-accent text-white p-3 rounded-full shadow-lg hover:shadow-xl hover:bg-accent-light transition-all hidden md:block"
          title="Наверх"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default memo(FloatingButtons);