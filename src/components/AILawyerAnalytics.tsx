import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, MessageCircle, BarChart3, Users, Clock, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  averageResponseTime: number;
  totalUsers: number;
  activeUsers: number;
  topQueries: Array<{ content: string; count: number }>;
}

export default function AILawyerAnalytics() {
  const [stats, setStats] = useState<MessageStats>({
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
    averageResponseTime: 0,
    totalUsers: 0,
    activeUsers: 0,
    topQueries: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Получаем общее количество сообщений
      const { data: allMessages, error: messagesError } = await supabase
        .from('ai_lawyer_messages')
        .select('*');

      if (messagesError) throw messagesError;

      // Получаем уникальных пользователей из сообщений
      const uniqueUsers = new Set(
        allMessages?.map(msg => msg.user_id).filter(Boolean)
      );
      const totalUsers = uniqueUsers.size;

      // Получаем пользователей, которые использовали ИИ-юриста (из таблицы usage)
      // Используем сообщения, так как ai_lawyer_usage имеет строгие RLS
      const activeUserData = allMessages || [];
      const activeUsers = new Set(activeUserData.map(au => au.user_id).filter(Boolean)).size;

      // Анализируем сообщения для топ-запросов
      const userMessages = allMessages?.filter(msg => msg.role === 'user') || [];
      
      // Считаем частоту повторяющихся запросов
      const queryCount: Record<string, number> = {};
      userMessages.forEach(msg => {
        const key = msg.content.toLowerCase().slice(0, 100); // Берем первые 100 символов для группировки
        queryCount[key] = (queryCount[key] || 0) + 1;
      });

      // Преобразуем в массив и сортируем
      const topQueries = Object.entries(queryCount)
        .map(([content, count]) => ({ content, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Формируем статистику
      setStats({
        totalMessages: allMessages?.length || 0,
        userMessages: userMessages.length,
        assistantMessages: (allMessages?.length || 0) - userMessages.length,
        averageResponseTime: 12, // Временное значение, нужно реализовать измерение времени ответа
        totalUsers,
        activeUsers,
        topQueries,
      });
    } catch (err: any) {
      setError('Не удалось загрузить аналитику');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
        <MessageCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Всего сообщений</h4>
            </div>
          </div>
          <p className="text-3xl font-bold text-accent">{stats.totalMessages}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {stats.userMessages} запросов + {stats.assistantMessages} ответов
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Активные пользователи</h4>
            </div>
          </div>
          <p className="text-3xl font-bold text-accent">{stats.activeUsers}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            из {stats.totalUsers} зарегистрированных
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Среднее время ответа</h4>
            </div>
          </div>
          <p className="text-3xl font-bold text-accent">{stats.averageResponseTime}с</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            на запрос пользователя
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Search className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Топ запросов</h4>
            </div>
          </div>
          <p className="text-3xl font-bold text-accent">{stats.topQueries.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            уникальных запросов
          </p>
        </motion.div>
      </div>

      {/* Топ запросов */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <BarChart3 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">Топ-10 самых частых запросов</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">Наиболее часто встречающиеся вопросы пользователей</p>
          </div>
        </div>

        <div className="space-y-3">
          {stats.topQueries.map((query, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-accent/10 text-accent rounded-lg font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={query.content}>
                  {query.content}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {query.count} запросов
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
