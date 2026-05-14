import React, { useState } from 'react';
import { X, Loader2, Images } from 'lucide-react';

interface GooglePhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImages: (urls: string[]) => void;
}

export const GooglePhotosModal: React.FC<GooglePhotosModalProps> = ({ isOpen, onClose, onInsertImages }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Images className="w-5 h-5 text-accent" />
            Вставить из Google Photos
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
          <p>Интеграция с Google Photos</p>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500">Нажмите на изображение для вставки в статью</p>
        </div>
      </div>
    </div>
  );
};
