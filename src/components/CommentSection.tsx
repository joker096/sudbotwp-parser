import { useState } from 'react';
import { MessageSquare, Save, Share2, Send } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import EmojiPicker from './EmojiPicker';

interface CommentSectionProps {
  comment: string;
  onSave: (comment: string) => void;
  isAdded?: boolean;
  onShare?: () => void;
  maxLength?: number;
}

export default function CommentSection({ 
  comment, 
  onSave, 
  isAdded = false,
  onShare,
  maxLength = 1000 
}: CommentSectionProps) {
  const [localComment, setLocalComment] = useState(comment);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleSave = async () => {
    if (localComment.length > maxLength) {
      showToast(`Комментарий слишком длинный (макс. ${maxLength} символов)`);
      return;
    }
    setIsSaving(true);
    try {
      onSave(localComment);
      showToast('Комментарий сохранён');
    } catch (err) {
      showToast('Ошибка сохранения комментария');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setLocalComment(prev => prev + emoji);
  };

  return (
    <div className="pb-4">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-3">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Ваш комментарий</h4>
        </div>
        <div className="relative">
          <textarea
            value={localComment}
            onChange={(e) => setLocalComment(e.target.value)}
            placeholder="Добавьте заметки к делу, напоминания или важные детали..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            rows={3}
          />
          <div className="absolute bottom-2 right-2">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-[10px] text-slate-500">
            {localComment.length} / {maxLength}
          </p>
          <button
            onClick={handleSave}
            disabled={isSaving || localComment === comment}
            className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {isSaving ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Сохранить
          </button>
        </div>
      </div>

      {isAdded && onShare && (
        <div className="bg-gradient-to-r from-accent/10 to-purple-500/10 dark:from-accent/20 dark:to-purple-500/20 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-4 h-4 text-accent" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Поделиться с юристом</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            Отправьте это дело юристу для консультации
          </p>
          <button
            onClick={onShare}
            className="w-full bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Send className="w-3 h-3" />
            Поделиться с юристом
          </button>
        </div>
      )}
    </div>
  );
}
