import { MessageSquare, Pencil, Send, Share2, Trash2 } from 'lucide-react';

interface CaseCardCommentItem {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
}

interface CaseCardCommentsProps {
  caseId?: string | null;
  userId?: string;
  isAdded: boolean;
  newCommentText: string;
  setNewCommentText: (value: string) => void;
  isSavingComment: boolean;
  isLoadingHistory: boolean;
  commentHistory: CaseCardCommentItem[];
  editingCommentId: string | null;
  editingCommentText: string;
  setEditingCommentId: (value: string | null) => void;
  setEditingCommentText: (value: string) => void;
  onAddComment: () => Promise<void>;
  onSaveEditedComment: (commentId: string) => Promise<void>;
  onRequestDeleteComment: (commentId: string) => void;
  onOpenShareModal: () => void;
}

export default function CaseCardComments({
  caseId,
  userId,
  isAdded,
  newCommentText,
  setNewCommentText,
  isSavingComment,
  isLoadingHistory,
  commentHistory,
  editingCommentId,
  editingCommentText,
  setEditingCommentId,
  setEditingCommentText,
  onAddComment,
  onSaveEditedComment,
  onRequestDeleteComment,
  onOpenShareModal,
}: CaseCardCommentsProps) {
  return (
    <div className="pb-4">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Добавить комментарий</h4>
        </div>
        <div className="relative">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Напишите комментарий..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            rows={3}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-[10px] text-slate-500">
            {newCommentText.length} / 1000
          </p>
          <button
            onClick={onAddComment}
            disabled={isSavingComment || !newCommentText.trim() || !caseId || !userId}
            className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {isSavingComment ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Добавить
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm">История комментариев</h4>

        {isLoadingHistory ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : commentHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Пока нет комментариев</p>
          </div>
        ) : (
          commentHistory.map((comment) => (
            <div key={comment.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comment.author_id === userId ? 'bg-accent/20 text-accent' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                  {comment.author_id === userId ? 'Вы' : 'Юрист'}
                </span>
                <div className="flex items-center gap-2">
                  {comment.author_id === userId && (
                    <>
                      <button
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditingCommentText(comment.content);
                        }}
                        className="p-1 text-slate-400 hover:text-accent transition-all"
                        title="Редактировать"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRequestDeleteComment(comment.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-all"
                        title="Удалить"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {new Date(comment.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              {editingCommentId === comment.id ? (
                <div>
                  <textarea
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onSaveEditedComment(comment.id)}
                      className="px-2 py-1 bg-accent text-white text-xs rounded-lg"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => setEditingCommentId(null)}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-xs rounded-lg"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
              )}
            </div>
          ))
        )}
      </div>

      {isAdded && (
        <div className="bg-gradient-to-r from-accent/10 to-purple-500/10 dark:from-accent/20 dark:to-purple-500/20 p-4 rounded-2xl mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-4 h-4 text-accent" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Поделиться с юристом</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            Отправьте это дело юристу для консультации
          </p>
          <button
            onClick={onOpenShareModal}
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
