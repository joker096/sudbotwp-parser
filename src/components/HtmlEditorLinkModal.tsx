import React, { useState } from 'react';
import { X, Link as LinkIcon } from 'lucide-react';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, text: string) => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-accent" />
            Вставить ссылку
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Текст ссылки</label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Текст ссылки"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">URL ссылки</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            onClick={() => { onInsert(linkUrl, linkText); setLinkUrl('https://'); setLinkText(''); }}
            disabled={!linkUrl || linkUrl === 'https://'}
            className="w-full py-2 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors"
          >
            Вставить
          </button>
        </div>
      </div>
    </div>
  );
};
