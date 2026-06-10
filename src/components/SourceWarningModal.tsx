import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertCircle, ExternalLink, X } from 'lucide-react';

interface SourceWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseLink: string;
}

export default function SourceWarningModal({ isOpen, onClose, caseLink }: SourceWarningModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Внимание!</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 text-center">
              Вы переходите на сайт суда, который может содержать информацию, не связанную с вашим делом. Мы не несем ответственности за информацию, размещенную на сайте суда.
            </p>
            <div className="bg-gradient-to-r from-accent/10 to-purple-500/10 dark:from-accent/20 dark:to-purple-500/20 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-accent mb-2">📢 Реклама</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                Хотите получать уведомления о новых событиях по вашему делу?
              </p>
              <Link 
                to="/monitoring" 
                className="inline-block text-xs font-bold text-accent hover:underline"
                onClick={onClose}
              >
                Подключить мониторинг →
              </Link>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Отмена
              </button>
              <a
                href={caseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors text-center flex items-center justify-center gap-2"
              >
                Перейти
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
