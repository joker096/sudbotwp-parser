import React, { useState } from 'react';
import { X, Youtube } from 'lucide-react';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [youTubeUrl, setYouTubeUrl] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            Вставить YouTube видео
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">URL видео</label>
            <input
              type="url"
              value={youTubeUrl}
              onChange={(e) => setYouTubeUrl(e.target.value)}
              placeholder="https://youtu.be/..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            onClick={() => { onInsert(youTubeUrl); setYouTubeUrl(''); }}
            disabled={!youTubeUrl}
            className="w-full py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors"
          >
            Вставить
          </button>
        </div>
      </div>
    </div>
  );
};
