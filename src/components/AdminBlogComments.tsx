import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, MessageSquare, UserX, UserCheck, AlertTriangle, Search, Filter, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { blogComments, blockedUsers, BlogComment, BlockedUser } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

export default function AdminBlogComments() {
  const { showToast } = useToast();
  const [comments, setComments] = useState<(BlogComment & { blog_posts?: { title: string; slug: string } })[]>([]);
  const [blockedUsersList, setBlockedUsersList] = useState<BlockedUser[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'spam' | 'blocked'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userToBlock, setUserToBlock] = useState<{ id?: string; email?: string } | null>(null);

  // Загрузка комментариев
  const loadComments = async () => {
    setIsLoading(true);
    const status = activeTab === 'blocked' ? undefined : activeTab;
    const { data, error } = await blogComments.getAllForModeration(status);
    setIsLoading(false);

    if (error) {
      showToast('Ошибка загрузки комментариев');
      return;
    }

    setComments(data || []);
  };

  // Загрузка заблокированных пользователей
  const loadBlockedUsers = async () => {
    const { data, error } = await blockedUsers.getAll();
    if (error) {
      showToast('Ошибка загрузки заблокированных пользователей');
      return;
    }
    setBlockedUsersList(data || []);
  };

  useEffect(() => {
    if (activeTab === 'blocked') {
      loadBlockedUsers();
    } else {
      loadComments();
    }
  }, [activeTab]);

  // Одобрить комментарий
  const handleApprove = async (commentId: string) => {
    setIsLoading(true);
    const { error } = await blogComments.approve(commentId);
    setIsLoading(false);

    if (error) {
      showToast('Ошибка при одобрении');
      return;
    }

    showToast('Комментарий одобрен');
    loadComments();
  };

  // Отклонить комментарий
  const handleReject = async (commentId: string) => {
    if (!rejectionReason.trim()) {
      showToast('Укажите причину отклонения');
      return;
    }

    setIsLoading(true);
    const { error } = await blogComments.reject(commentId, rejectionReason);
    setIsLoading(false);
    setSelectedComment(null);
    setRejectionReason('');

    if (error) {
      showToast('Ошибка при отклонении');
      return;
    }

    showToast('Комментарий отклонен');
    loadComments();
  };

  // Пометить как спам
  const handleSpam = async (commentId: string) => {
    setIsLoading(true);
    const { error } = await blogComments.markAsSpam(commentId);
    setIsLoading(false);

    if (error) {
      showToast('Ошибка при пометке спама');
      return;
    }

    showToast('Комментарий помечен как спам');
    loadComments();
  };

  // Удалить комментарий
  const handleDelete = async (commentId: string) => {
    if (!confirm('Удалить комментарий навсегда?')) return;

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

  // Заблокировать пользователя
  const handleBlockUser = async () => {
    if (!userToBlock || !blockReason.trim()) {
      showToast('Укажите причину блокировки');
      return;
    }

    setIsLoading(true);
    const { error } = await blockedUsers.block({
      userId: userToBlock.id,
      email: userToBlock.email,
      reason: blockReason,
    });
    setIsLoading(false);
    setShowBlockModal(false);
    setBlockReason('');
    setUserToBlock(null);

    if (error) {
      showToast('Ошибка при блокировке');
      return;
    }

    showToast('Пользователь заблокирован');
    if (activeTab === 'blocked') {
      loadBlockedUsers();
    }
  };

  // Разблокировать пользователя
  const handleUnblock = async (blockId: string) => {
    setIsLoading(true);
    const { error } = await blockedUsers.unblock(blockId);
    setIsLoading(false);

    if (error) {
      showToast('Ошибка при разблокировке');
      return;
    }

    showToast('Пользователь разблокирован');
    loadBlockedUsers();
  };

  // Фильтрация комментариев
  const filteredComments = comments.filter(comment => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      comment.content?.toLowerCase().includes(searchLower) ||
      comment.user_email?.toLowerCase().includes(searchLower) ||
      comment.blog_posts?.title?.toLowerCase().includes(searchLower)
    );
  });

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs = [
    { id: 'pending', label: 'На модерации', count: activeTab === 'pending' ? filteredComments.length : undefined },
    { id: 'approved', label: 'Одобренные', count: undefined },
    { id: 'spam', label: 'Спам', count: undefined },
    { id: 'blocked', label: 'Заблокированные', count: blockedUsersList.length },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          Модерация комментариев
        </h2>
        <button
          onClick={activeTab === 'blocked' ? loadBlockedUsers : loadComments}
          className="p-2 text-slate-500 hover:text-accent transition-colors"
          title="Обновить"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab !== 'blocked' && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по комментариям..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      )}

      {/* Content */}
      {activeTab === 'blocked' ? (
        // Список заблокированных пользователей
        <div className="space-y-4">
          {blockedUsersList.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Нет заблокированных пользователей</p>
          ) : (
            blockedUsersList.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {user.email || user.user_id}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      <span className="font-medium">Причина:</span> {user.reason}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Заблокирован: {formatDate(user.blocked_at)}
                      {user.expires_at && ` • Истекает: ${formatDate(user.expires_at)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblock(user.id)}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    Разблокировать
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        // Список комментариев
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-slate-500 mt-2">Загрузка...</p>
            </div>
          ) : filteredComments.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              {searchQuery ? 'Ничего не найдено' : 'Нет комментариев'}
            </p>
          ) : (
            filteredComments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {comment.user_email || 'Аноним'}
                    </p>
                    <a
                      href={`/blog?post=${comment.blog_posts?.slug}`}
                      className="text-xs text-accent hover:underline"
                    >
                      {comment.blog_posts?.title}
                    </a>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      comment.status === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : comment.status === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {comment.status === 'pending' ? 'На модерации' : comment.status === 'approved' ? 'Одобрено' : 'Спам'}
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 text-sm mb-4 bg-white dark:bg-slate-900 rounded-lg p-3">
                  {comment.content}
                </p>

                {comment.rejection_reason && (
                  <p className="text-xs text-red-500 mb-3">
                    Причина отклонения: {comment.rejection_reason}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {comment.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(comment.id)}
                        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Одобрить
                      </button>
                      <button
                        onClick={() => setSelectedComment(selectedComment === comment.id ? null : comment.id)}
                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Отклонить
                      </button>
                      <button
                        onClick={() => handleSpam(comment.id)}
                        className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Спам
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setUserToBlock({ id: comment.user_id || undefined, email: comment.user_email });
                      setShowBlockModal(true);
                    }}
                    className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ml-auto"
                  >
                    <UserX className="w-4 h-4" />
                    Заблокировать
                  </button>

                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </div>

                {/* Rejection reason form */}
                <AnimatePresence>
                  {selectedComment === comment.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Укажите причину отклонения..."
                        className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleReject(comment.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          Подтвердить отклонение
                        </button>
                        <button
                          onClick={() => {
                            setSelectedComment(null);
                            setRejectionReason('');
                          }}
                          className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          Отмена
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Block User Modal */}
      <AnimatePresence>
        {showBlockModal && userToBlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBlockModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-500" />
                Заблокировать пользователя
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Вы собираетесь заблокировать: <strong>{userToBlock.email}</strong>
              </p>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Укажите причину блокировки..."
                className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleBlockUser}
                  disabled={!blockReason.trim()}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Заблокировать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
