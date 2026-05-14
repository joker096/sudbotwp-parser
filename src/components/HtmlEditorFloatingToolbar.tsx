import React, { useState, useEffect } from 'react';
import { X, Link, Image, Youtube } from 'lucide-react';

interface FloatingToolbarProps {
  isOpen: boolean;
  position: { top: number; left: number };
  type: 'link' | 'image' | 'youtube' | null;
  onClose: () => void;
  onInsertLink?: (url: string, text: string) => void;
  onInsertImage?: (url: string) => void;
  onInsertYouTube?: (url: string) => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  isOpen, position, type, onClose,
  onInsertLink, onInsertImage, onInsertYouTube,
}) => {
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('https://');
  const [youTubeUrl, setYouTubeUrl] = useState('');

  // Reset states when type changes
  useEffect(() => {
    setLinkUrl('https://');
    setLinkText('');
    setImageUrl('https://');
    setYouTubeUrl('');
  }, [type]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-80"
      style={{ top: position.top, left: position.left }}
    >
      <button
        onClick={() => { onClose(); setLinkUrl('https://'); setLinkText(''); setImageUrl('https://'); setYouTubeUrl(''); }}
        className="absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <X className="w-4 h-4" />
      </button>

      {type === 'link' && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Link className="w-4 h-4 text-accent" />
            Вставить ссылку
          </h4>
          <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Текст ссылки" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
          <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
          <button onClick={() => { onInsertLink?.(linkUrl, linkText); onClose(); }} disabled={!linkUrl || linkUrl === 'https://'} className="w-full py-2 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors">
            Вставить
          </button>
        </div>
      )}

      {type === 'image' && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Image className="w-4 h-4 text-accent" />
            Вставить изображение
          </h4>
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
          {imageUrl && imageUrl.startsWith('http') && (
            <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 h-24">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
            </div>
          )}
          <button onClick={() => { onInsertImage?.(imageUrl); onClose(); }} disabled={!imageUrl || !imageUrl.startsWith('http')} className="w-full py-2 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors">
            Вставить
          </button>
        </div>
      )}

      {type === 'youtube' && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-500" />
            Вставить YouTube
          </h4>
          <input type="url" value={youTubeUrl} onChange={(e) => setYouTubeUrl(e.target.value)} placeholder="https://youtu.be/..." className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
          <button onClick={() => { onInsertYouTube?.(youTubeUrl); onClose(); }} disabled={!youTubeUrl} className="w-full py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors">
            Вставить
          </button>
        </div>
      )}
    </div>
  );
};
