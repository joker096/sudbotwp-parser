import { useState, memo } from 'react';
import { X, CheckCircle2, Loader2, Send, Phone, MessageSquare, Calendar, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawyer: {
    id: number;
    name: string;
    spec: string;
    city: string;
  } | null;
}

type CaseType = 'civil' | 'criminal' | 'family' | 'arbitration' | 'administrative' | 'other';
type Urgency = 'low' | 'medium' | 'high';

function LeadModal({ isOpen, onClose, lawyer }: LeadModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    caseType: '' as CaseType | '',
    description: '',
    budget: '',
    urgency: 'medium' as Urgency,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const caseTypes = [
    { value: 'civil', label: 'Гражданские споры' },
    { value: 'criminal', label: 'Уголовное дело' },
    { value: 'family', label: 'Семейные вопросы' },
    { value: 'arbitration', label: 'Арбитраж' },
    { value: 'administrative', label: 'Административные' },
    { value: 'other', label: 'Другое' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Имитация отправки (в реальности - сохранение в Supabase)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Сохраняем лид в localStorage для демонстрации
    const leads = JSON.parse(localStorage.getItem('leads') || '[]');
    leads.push({
      id: Date.now(),
      lawyerId: lawyer?.id,
      lawyerName: lawyer?.name,
      ...formData,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('leads', JSON.stringify(leads));

    setIsSubmitting(false);
    setIsSubmitted(true);

    // Закрываем через 2 секунды
    setTimeout(() => {
      onClose();
      setIsSubmitted(false);
      setFormData({
        name: '',
        phone: '',
        caseType: '',
        description: '',
        budget: '',
        urgency: 'medium',
      });
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>

            {isSubmitted ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Заявка отправлена!
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {lawyer?.name} свяжется с вами в ближайшее время
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Заявка на консультацию
                  </h3>
                  {lawyer && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Юрист: {lawyer.name} • {lawyer.spec}
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                      Ваше имя *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Иван Иванов"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                      Телефон *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+7 (999) 123-45-67"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                      Тип дела
                    </label>
                    <select
                      value={formData.caseType}
                      onChange={(e) => setFormData({ ...formData, caseType: e.target.value as CaseType })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                    >
                      <option value="">Выберите тип дела</option>
                      {caseTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                      Опишите ситуацию
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Кратко опишите вашу ситуацию..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                        Бюджет
                      </label>
                      <select
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                      >
                        <option value="">Не важно</option>
                        <option value=" до 10 000">до 10 000 ₽</option>
                        <option value="10 000-30 000">10 000-30 000 ₽</option>
                        <option value="30 000-50 000">30 000-50 000 ₽</option>
                        <option value="50 000-100 000">50 000-100 000 ₽</option>
                        <option value="100 000+">100 000+ ₽</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                        Срочность
                      </label>
                      <select
                        value={formData.urgency}
                        onChange={(e) => setFormData({ ...formData, urgency: e.target.value as Urgency })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                      >
                        <option value="low">Низкая</option>
                        <option value="medium">Средняя</option>
                        <option value="high">Высокая</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Отправить заявку
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-slate-500">
                    Нажимая "Отправить", вы соглашаетесь на обработку персональных данных
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(LeadModal);
