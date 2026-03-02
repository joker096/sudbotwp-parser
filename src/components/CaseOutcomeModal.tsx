import { useState } from 'react';
import { X, Check, AlertCircle, Loader2, Trophy, Gift, FileText, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CaseOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: {
    id: string;
    number: string;
    court: string;
  };
  lawyerId?: string;
  lawyerName?: string;
  userId?: string;
  isLawyerView: boolean;
  onOutcomeConfirm: (outcome: string, description?: string) => Promise<void>;
}

const OUTCOMES = [
  { value: 'won', label: 'Выиграно', color: 'emerald', description: 'Дело выиграно полностью' },
  { value: 'partial', label: 'Частично', color: 'amber', description: 'Частичное удовлетворение' },
  { value: 'settled', label: 'Мировое', color: 'blue', description: 'Заключено мировое соглашение' },
  { value: 'lost', label: 'Проиграно', color: 'red', description: 'Дело проиграно' },
  { value: 'dismissed', label: 'Отклонено', color: 'slate', description: 'Иск отклонён' },
];

export default function CaseOutcomeModal({
  isOpen,
  onClose,
  caseData,
  lawyerId,
  userId,
  isLawyerView,
  onOutcomeConfirm,
}: CaseOutcomeModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedOutcome) {
      setError('Выберите исход дела');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onOutcomeConfirm(selectedOutcome, description);
      setSubmitSuccess(true);
    } catch (err) {
      setError('Ошибка при отправке. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedOutcome('');
    setDescription('');
    setSubmitSuccess(false);
    setError('');
    onClose();
  };

  // Успешная отправка
  if (submitSuccess) {
    const outcomeLabel = OUTCOMES.find(o => o.value === selectedOutcome)?.label;
    const isPositiveOutcome = ['won', 'settled', 'partial'].includes(selectedOutcome);

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isPositiveOutcome ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {isPositiveOutcome ? (
                    <Trophy className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Исход зарегистрирован
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Дело №{caseData.number}: <strong>{outcomeLabel}</strong>
                </p>

                {isLawyerView && isPositiveOutcome && (
                  <div className="bg-gradient-to-r from-accent/20 to-primary/20 dark:from-accent/10 dark:to-primary/10 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-center gap-2 text-accent dark:text-accent mb-2">
                      <Gift className="w-5 h-5" />
                      <span className="font-bold">Поздравляем!</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      За успешный исход вы получили <strong>1 бесплатный лид</strong>!
                    </p>
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="w-full bg-accent hover:bg-accent-light text-white py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 pb-0">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Scale className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Исход дела
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    №{caseData.number}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 pt-2 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isLawyerView 
                  ? 'Подтвердите исход дела, чтобы получить награду за успешную работу.'
                  : 'Подтвердите исход вашего дела.'
                }
              </p>

              {/* Outcomes */}
              <div className="grid grid-cols-2 gap-2">
                {OUTCOMES.map((outcome) => (
                  <button
                    key={outcome.value}
                    onClick={() => setSelectedOutcome(outcome.value)}
                    className={`p-3 rounded-xl text-left transition-all border-2 ${
                      selectedOutcome === outcome.value
                        ? 'border-accent bg-accent/5 dark:bg-accent/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-accent/50'
                    }`}
                  >
                    <span className={`text-sm font-bold text-${
                      outcome.color === 'slate' ? 'slate' : outcome.color
                    }-${selectedOutcome === outcome.value ? '600 dark:text-accent' : '500'}`}>
                      {outcome.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Комментарий (необязательно)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите подробности исхода..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Reward Info */}
              {isLawyerView && (
                <div className="bg-accent/10 rounded-xl p-3 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    За успешный исход: <strong>1 бесплатный лид</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-bold transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedOutcome}
                className="flex-1 px-4 py-3 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Подтвердить
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
