import React from 'react';
import { X } from 'lucide-react';

interface Shortcode {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
}

interface ShortcodeData {
  shortcodes: Shortcode[];
  categories: string[];
}

interface ShortcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (shortcode: Shortcode) => void;
  shortcodeData: ShortcodeData | null;
}

export const ShortcodeModal: React.FC<ShortcodeModalProps> = ({ isOpen, onClose, onSelect, shortcodeData }) => {
  if (!isOpen) return null;

  const categories = shortcodeData?.categories || ['CTA Блоки'];
  const shortcodes = shortcodeData?.shortcodes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Шорткоды</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-slate-500 text-center py-8">Выберите шорткод для вставки</p>
          {shortcodes.map((shortcode) => (
            <button
              key={shortcode.id}
              onClick={() => onSelect(shortcode)}
              className="w-full text-left p-4 bg-slate-50 dark:bg-slate-800 hover:bg-accent/10 dark:hover:bg-accent/10 rounded-xl mb-2 transition-colors"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-white">{shortcode.name}</p>
              <p className="text-xs text-slate-500 mt-1">{shortcode.description}</p>
              <code className="text-xs text-accent bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded mt-1 inline-block">{shortcode.code}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
