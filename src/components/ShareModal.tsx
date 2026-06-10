import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X, Copy } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: {
    number: string;
    court: string;
    date: string;
    category: string;
    link: string;
  };
}

export default function ShareModal({ isOpen, onClose, caseData }: ShareModalProps) {
  const [message, setMessage] = useState('');
  const { showToast } = useToast();

  const handleCopy = () => {
    const shareText = `📋 Дело: ${caseData.number}\n🏛 Суд: ${caseData.court}\n📅 Дата: ${caseData.date}\n⚖️ Категория: ${caseData.category}\n\n${message ? `💬 Сообщение: ${message}\n` : ''}🔗 Ссылка: ${caseData.link}`;
    
    navigator.clipboard.writeText(shareText).then(() => {
      showToast('Информация о деле скопирована! Теперь вы можете отправить её юристу.');
      onClose();
      setMessage('');
    }).catch(() => {
      showToast('Не удалось скопировать. Попробуйте ещё раз.');
    });
  };

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-accent" />
                Поделиться с юристом
              </h3>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-4">
              <p className="text-xs text-slate-500 mb-2">Дело:</p>
              <p className="font-bold text-slate-900 dark:text-white">{caseData.number}</p>
              <p className="text-sm text-slate-500">{caseData.court}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Сообщение для юриста
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Добавьте вопрос или описание ситуации..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl text-sm font-bold transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 bg-accent hover:bg-accent-light text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Копировать
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-3">
              Скопируйте данные и отправьте их юристу любым удобным способом
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
