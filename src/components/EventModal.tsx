import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Gavel, Hourglass, Bell, Pencil, Check } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: any) => void;
  eventToEdit: any | null;
  initialDate?: string;
  initialTime?: string;
}

export default function EventModal({ isOpen, onClose, onSave, eventToEdit, initialDate, initialTime }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'hearing' | 'deadline' | 'reminder' | 'custom'>('hearing');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState({
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    until: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setTitle(eventToEdit.name || '');
        const dateParts = eventToEdit.date?.split('.');
        if (dateParts?.length === 3) {
          setDate(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        } else {
          setDate(eventToEdit.date || ''); // Fallback for YYYY-MM-DD
        }
        setTime(eventToEdit.time || '');
        setType(eventToEdit.type || 'custom');
        if (eventToEdit.recurrence) {
          setIsRecurring(true);
          setRecurrenceRule(eventToEdit.recurrence);
        } else {
          setIsRecurring(false);
          setRecurrenceRule({ frequency: 'weekly', until: '' });
        }
      } else {
        // Reset form for new event
        setTitle('');
        setDate(initialDate || '');
        setTime(initialTime || '');
        setType('hearing');
        setIsRecurring(false);
        setRecurrenceRule({ frequency: 'weekly', until: '' });
      }
    }
  }, [eventToEdit, isOpen, initialDate, initialTime]);

  const handleInternalSave = () => {
    if (!title || !date) {
      onSave(null); // Signal validation error
      return;
    }

    const eventData: any = {
      id: eventToEdit ? eventToEdit.id : `custom-${Date.now()}`,
      name: title,
      date: date.split('-').reverse().join('.'), // Convert to DD.MM.YYYY
      time: time,
      type: type,
    };

    if (isRecurring && recurrenceRule.until) {
      if (new Date(recurrenceRule.until) < new Date(date)) {
        onSave(null); // Signal validation error
        return;
      }
      eventData.recurrence = recurrenceRule;
    }
    
    onSave(eventData);
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
            className="bg-white dark:bg-slate-950 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{eventToEdit ? 'Редактировать событие' : 'Добавить событие'}</h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Название события *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Заседание, Срок подачи жалобы..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Дата *</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Время</label>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Тип события</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: 'hearing', label: 'Заседание', icon: Gavel }, { value: 'deadline', label: 'Срок', icon: Hourglass }, { value: 'reminder', label: 'Напоминание', icon: Bell }, { value: 'custom', label: 'Другое', icon: Pencil }].map((typeInfo) => (
                      <button key={typeInfo.value} onClick={() => setType(typeInfo.value as any)} className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${type === typeInfo.value ? 'bg-accent text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                        <typeInfo.icon className="w-4 h-4" />
                        {typeInfo.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-5 h-5 rounded text-accent focus:ring-accent focus:ring-offset-0 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Повторяющееся событие</span>
                  </label>
                </div>
                <AnimatePresence>
                  {isRecurring && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="grid grid-cols-2 gap-4 pt-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Частота</label>
                          <select value={recurrenceRule.frequency} onChange={(e) => setRecurrenceRule(prev => ({ ...prev, frequency: e.target.value as any }))} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-none rounded-xl text-sm">
                            <option value="daily">Ежедневно</option>
                            <option value="weekly">Еженедельно</option>
                            <option value="monthly">Ежемесячно</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Повторять до</label>
                          <input type="date" value={recurrenceRule.until} onChange={(e) => setRecurrenceRule(prev => ({ ...prev, until: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-none rounded-xl text-sm" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900">
              <button onClick={handleInternalSave} className="w-full bg-accent hover:bg-accent-light text-white py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                {eventToEdit ? 'Сохранить изменения' : 'Добавить событие'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}