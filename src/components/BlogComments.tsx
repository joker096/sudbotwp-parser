import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Reply, Flag, Trash2, Edit2, Send, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { blogComments, BlogComment } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

interface BlogCommentsProps {
  postId: string;
}

export default function BlogComments({ postId }: BlogCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // Загрузка комментариев
  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    const { data, error } = await blogComments.getByPostId(postId);
    if (error) {
      console.error('Error loading comments:', error);
      return;
    }
    setComments(data || []);
  };

  // Добавить комментарий
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Войдите, чтобы оставить комментарий');
      return;
    }
    if (!newComment.trim()) return;

    setIsLoading(true);
    const { data, error } = await blogComments.create(postId, newComment);
    setIsLoading(false);

    if (error) {
      showToast('Ошибка при отправке комментария');
      return;
    }

    showToast('Комментарий отправлен на модерацию');
    setNewComment('');
    // Перезагружаем комментарии
    loadComments();
  };

  // Ответить на комментарий
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Войдите, чтобы ответить');
      return;
    }
    if (!replyContent.trim() || !replyTo) return;

    setIsLoading(true);
    const { data, error } = await blogComments.create(postId, replyContent, replyTo);
    setIsLoading(false);

    if (error) {
      showToast('Ошибка при отправке ответа');
      return;
    }

    showToast('Ответ отправлен на модерацию');
    setReplyContent('');
    setReplyTo(null);
    loadComments();
  };

  // Редактировать комментарий
  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    setIsLoading(true);
    const { error } = await blogComments.update(commentId, editContent);
    setIsLoading(false);

    if (error) {
      showToast('Ошибка при редактировании');
      return;
    }

    showToast('Комментарий обновлен');
    setEditingId(null);
    loadComments();
  };

  // Удалить комментарий
  const handleDelete = async (commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;

    setIsLoading(true);
    const { error } = await blogComments.delete(commentId);
    setIsLoading(false);

    if (error) {
      showToast('Ошибка при удалении');
      return;
    }

    showToast('Комментарий удален');
    loadComments();
  };

  // Лайкнуть комментарий
  const handleLike = async (commentId: string) => {
    if (!isAuthenticated) {
      showToast('Войдите, чтобы поставить лайк');
      return;
    }

    if (likedComments.has(commentId)) {
      // Убираем лайк
      await blogComments.unlike(commentId);
      setLikedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    } else {
      // Ставим лайк
      await blogComments.like(commentId);
      setLikedComments(prev => new Set(prev).add(commentId));
    }
    loadComments();
  };

  // Форматировать дату
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Получить имя пользователя
  const getUserName = (comment: BlogComment) => {
    return comment.profile_name || comment.user_name || comment.user_email?.split('@')[0] || 'Аноним';
  };

  // Получить аватар пользователя
  const getUserAvatar = (comment: BlogComment) => {
    return comment.profile_avatar || comment.user_avatar;
  };

  // Проверить, может ли пользователь редактировать
  const canEdit = (comment: BlogComment) => {
    if (!user || comment.user_id !== user.id) return false;
    const createdAt = new Date(comment.created_at);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return createdAt > fifteenMinutesAgo;
  };

  // Проверить, может ли пользователь удалить
  const canDelete = (comment: BlogComment) => {
    if (!user) return false;
    if (comment.user_id === user.id) {
      const createdAt = new Date(comment.created_at);
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      return createdAt > fifteenMinutesAgo;
    }
    return false;
  };

  return (
    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-accent" />
        Комментарии ({comments.length})
      </h3>

      {/* Форма добавления комментария */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Напишите ваш комментарий..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none min-h-[100px]"
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-slate-500">
                {newComment.length} / 2000 • Комментарий будет опубликован после проверки модератором
              </p>
              <button
                type="submit"
                disabled={isLoading || !newComment.trim()}
                className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Отправить
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center mb-8">
          <p className="text-slate-600 dark:text-slate-300 mb-3">
            Войдите, чтобы оставить комментарий
          </p>
          <a
            href="/login"
            className="inline-block bg-accent hover:bg-accent-light text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            Войти
          </a>
        </div>
      )}

      {/* Список комментариев */}
      <div className="space-y-6">
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4"
            >
              {/* Комментарий */}
              <div className="flex gap-3">
                {/* Аватар */}
                <div className="shrink-0">
                  {getUserAvatar(comment) ? (
                    <img
                      src={getUserAvatar(comment)}
                      alt={getUserName(comment)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Контент */}
                <div className="flex-1 min-w-0">
                  {/* Заголовок */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {getUserName(comment)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(comment.created_at)}
                    </span>
                    {comment.status === 'pending' && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> На модерации
                      </span>
                    )}
                    {comment.status === 'approved' && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Одобрено
                      </span>
                    )}
                  </div>

                  {/* Текст комментария */}
                  {editingId === comment.id ? (
                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white resize-none"
                        rows={3}
                        maxLength={2000}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEdit(comment.id)}
                          disabled={isLoading || !editContent.trim()}
                          className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300 text-sm mb-3 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}

                  {/* Действия */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(comment.id)}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                        likedComments.has(comment.id)
                          ? 'text-accent'
                          : 'text-slate-500 hover:text-accent'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${likedComments.has(comment.id) ? 'fill-current' : ''}`} />
                      {comment.likes_count > 0 && comment.likes_count}
                    </button>

                    <button
                      onClick={() => {
                        setReplyTo(replyTo === comment.id ? null : comment.id);
                        setReplyContent('');
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-accent transition-colors"
                    >
                      <Reply className="w-4 h-4" />
                      Ответить
                    </button>

                    {canEdit(comment) && (
                      <button
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-accent transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Редактировать
                      </button>
                    )}

                    {canDelete(comment) && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </button>
                    )}
                  </div>

                  {/* Форма ответа */}
                  <AnimatePresence>
                    {replyTo === comment.id && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleReply}
                        className="mt-4"
                      >
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Напишите ваш ответ..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                          rows={3}
                          maxLength={2000}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setReplyTo(null)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                          >
                            Отмена
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !replyContent.trim()}
                            className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                          >
                            {isLoading ? 'Отправка...' : 'Ответить'}
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Ответы */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-white dark:bg-slate-900 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {getUserName(reply)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDate(reply.created_at)}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 text-sm">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {comments.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Пока нет комментариев. Будьте первым!</p>
          </div>
        )}
      </div>
    </div>
  );
}
