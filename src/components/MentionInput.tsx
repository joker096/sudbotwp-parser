import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

interface Lawyer {
  id: string;
  name: string;
  spec: string | null;
  city: string | null;
  rating: number;
  verified: boolean;
  avatar_url?: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  lawyers: Lawyer[];
  onSend?: () => void;
}

// Демо юристы (используются если база недоступна)
const DEMO_LAWYERS: Lawyer[] = [
  { id: '1', name: 'Александр Смирнов', spec: 'Гражданские', city: 'Москва', rating: 4.9, verified: true },
  { id: '2', name: 'Елена Волкова', spec: 'Семейные', city: 'Санкт-Петербург', rating: 5.0, verified: true },
  { id: '3', name: 'Дмитрий Иванов', spec: 'Уголовные', city: 'Москва', rating: 4.8, verified: false },
  { id: '4', name: 'Анна Петрова', spec: 'Арбитраж', city: 'Казань', rating: 4.9, verified: true },
  { id: '5', name: 'Михаил Сидоров', spec: 'Гражданские', city: 'Новосибирск', rating: 4.7, verified: true },
];

export default function MentionInput({ 
  value, 
  onChange, 
  placeholder = 'Введите сообщение...', 
  lawyers = DEMO_LAWYERS,
  onSend 
}: MentionInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);

  // Фильтрация юристов по запросу
  const filteredLawyers = lawyers.filter(lawyer => {
    const query = mentionQuery.toLowerCase();
    return (
      lawyer.name.toLowerCase().includes(query) ||
      lawyer.spec?.toLowerCase().includes(query) ||
      lawyer.city?.toLowerCase().includes(query)
    );
  });

  // Обработка ввода текста
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(text);
    
    // Проверяем, есть ли @ перед курсором
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos !== -1) {
      // Проверяем, что после @ нет пробелов
      const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowMentions(true);
        setMentionQuery(textAfterAt);
        setMentionPosition(lastAtPos);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
    setMentionQuery('');
  };

  // Обработка навигации клавишами
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredLawyers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        if (filteredLawyers.length > 0) {
          e.preventDefault();
          selectLawyer(filteredLawyers[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowMentions(false);
        break;
      case 'Tab':
        if (filteredLawyers.length > 0) {
          e.preventDefault();
          selectLawyer(filteredLawyers[selectedIndex]);
        }
        break;
    }
  };

  // Выбор юриста из списка
  const selectLawyer = useCallback((lawyer: Lawyer) => {
    const textBeforeCursor = value.slice(0, mentionPosition);
    const textAfterCursor = value.slice(inputRef.current?.selectionStart || 0);
    
    // Формируем текст с упоминанием
    const mentionText = `@${lawyer.name}`;
    const newText = `${textBeforeCursor}${mentionText} ${textAfterCursor}`;
    
    onChange(newText);
    setShowMentions(false);
    setMentionQuery('');
    
    // Возвращаем фокус на input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = mentionPosition + mentionText.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, mentionPosition, onChange]);

  // Закрытие списка при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionsRef.current && !mentionsRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Сброс выбранного индекса при изменении фильтра
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredLawyers.length]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-accent dark:focus-within:border-accent transition-colors">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-900 dark:text-white placeholder-slate-400 resize-none min-h-[40px] max-h-[120px]"
          style={{ 
            overflowWrap: 'break-word',
            wordBreak: 'break-word'
          }}
        />
        {value.trim() && onSend && (
          <button 
            onClick={onSend}
            className="p-3 rounded-xl transition-colors flex items-center justify-center bg-accent text-white shadow-md hover:bg-accent-light"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        )}
      </div>

      {/* Выпадающий список юристов */}
      <AnimatePresence>
        {showMentions && filteredLawyers.length > 0 && (
          <motion.div
            ref={mentionsRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50 max-h-64 overflow-y-auto"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">
                Выберите юриста для упоминания
              </p>
            </div>
            <div className="py-1">
              {filteredLawyers.map((lawyer, index) => (
                <button
                  key={lawyer.id}
                  onClick={() => selectLawyer(lawyer)}
                  className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                    index === selectedIndex 
                      ? 'bg-accent/10 dark:bg-accent/20' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center shrink-0">
                    {lawyer.avatar_url ? (
                      <img 
                        src={lawyer.avatar_url} 
                        alt={lawyer.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {lawyer.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {lawyer.name}
                      </span>
                      {lawyer.verified && (
                        <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{lawyer.spec}</span>
                      {lawyer.city && (
                        <>
                          <span>•</span>
                          <span>{lawyer.city}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-yellow-500">★ {lawyer.rating}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Показываем сообщение если нет юристов */}
        {showMentions && filteredLawyers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-50"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              Юристы не найдены
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Хук для получения списка юристов
export function useLawyers() {
  const [lawyers, setLawyers] = useState<Lawyer[]>(DEMO_LAWYERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLawyers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Пробуем получить из Supabase
      const { supabase } = await import('../lib/supabase');
      const { data, error: fetchError } = await supabase
        .from('lawyers')
        .select('id, name, spec, city, rating, verified')
        .order('rating', { ascending: false })
        .limit(20);
      
      if (fetchError) {
        console.warn('Error fetching lawyers from Supabase, using demo data:', fetchError);
        setLawyers(DEMO_LAWYERS);
      } else if (data && data.length > 0) {
        setLawyers(data);
      } else {
        setLawyers(DEMO_LAWYERS);
      }
    } catch (err) {
      console.warn('Error loading lawyers, using demo data:', err);
      setLawyers(DEMO_LAWYERS);
    } finally {
      setLoading(false);
    }
  }, []);

  return { lawyers, loading, error, fetchLawyers };
}
