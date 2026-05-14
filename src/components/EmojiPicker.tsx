import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_LIST = ['😀', '😂', '🤣', '😊', '😍', '🤔', '👍', '👎', '❤️', '⚠️', '✅', '❌', '📌', '🔔', '📎', '💼', '📋', '⚖️', '🏛', '📅', '⏰', '💰', '🏠', '🚗'];

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const pickerWidth = 220;
      const pickerHeight = 200;
      
      let left = rect.right - pickerWidth;
      let top = rect.top - pickerHeight;
      
      if (left < 10) left = 10;
      if (left + pickerWidth > window.innerWidth - 10) {
        left = window.innerWidth - pickerWidth - 10;
      }
      if (top < 10) top = rect.bottom + 5;
      
      setPosition({ top, left });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        title="Добавить эмодзи"
      >
        <span className="text-base">😀</span>
      </button>
      
      <AnimatePresence>
        {isOpen && position && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-[9999]"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
          >
            <div className="grid grid-cols-6 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
