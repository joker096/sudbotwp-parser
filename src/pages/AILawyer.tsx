import { useState, useEffect, useRef } from 'react';
import { Scale, Send, Loader2, Bot, User, FileText, Lightbulb, CheckCircle2, AlertCircle, Copy, Trash2, BookOpen, Sparkles, Download, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSeo } from '../hooks/useSeo';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isWelcome?: boolean;
}

interface UsageInfo {
  remaining: number;
  isSubscribed: boolean;
  subscriptionTier: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'claim',
    title: 'Составить иск',
    description: 'Сформирую исковое заявление',
    icon: FileText,
    prompt: 'Составь исковое заявление в суд. Укажи: 1) Наименование суда, 2) Данные истца и ответчика, 3) Предмет спора и обстоятельства, 4) Правовое обоснование (ссылки на законы), 5) Исковые требования, 6) Перечень прилагаемых документов. Формат: официальный юридический документ.',
  },
  {
    id: 'documents',
    title: 'Список документов',
    description: 'Подготовлю перечень нужных документов',
    icon: BookOpen,
    prompt: 'Составь полный перечень документов, необходимых для судебного дела. Укажи: 1) Обязательные документы, 2) Дополнительные доказательства, 3) Документы для подтверждения позиции истца/ответчика. Формат: нумерованный список с пояснениями.',
  },
  {
    id: 'advice',
    title: 'Юридическая консультация',
    description: 'Дам совет по вашей ситуации',
    icon: Lightbulb,
    prompt: 'Дай юридическую консультацию по описанной ситуации. Проанализируй: 1) Правовую позицию, 2) Возможные риски, 3) Рекомендуемые действия, 4) Альтернативные варианты решения. Формат: структурированный ответ с правовым обоснованием.',
  },
  {
    id: 'objection',
    title: 'Возражения',
    description: 'Подготовлю возражения на иск',
    icon: AlertCircle,
    prompt: 'Составь возражения на исковое заявление. Укажи: 1) Несоответствие иска требованиям закона, 2) Фактические ошибки истца, 3) Правовые основания для отказа, 4) Контртребования (при наличии). Формат: официальный документ для суда.',
  },
];

// Контекст для ИИ-юриста
const LAWYER_CONTEXT = `Ты - опытный юрист с 20-летним стажем работы в российских судах. Твоя специализация: гражданское право, арбитраж, административные дела. 

Ты помогаешь пользователям:
- Составлять юридические документы (иски, возражения, жалобы, ходатайства)
- Анализировать правовые ситуации
- Подготавливать списки необходимых документов
- Разъяснять законодательство РФ
- Оценивать перспективы дела в суде

Важные правила:
1. Всегда ссылайся на конкретные статьи законов РФ (ГК РФ, ГПК РФ, АПК РФ, КАС РФ)
2. Указывай актуальную судебную практику
3. Предупреждай о рисках и последствиях
4. Рекомендуй обращаться к профессиональному юристу для сложных дел
5. Не даёшь гарантий выигрыша дела
6. Соблюдаешь принципы адвокатской этики

Формат ответа: структурированный, с заголовками и нумерованными списками.`;

export default function AILawyer() {
  const { isAuthenticated, user, profileData } = useAuth();
  const { setSeo } = useSeo('/ai-lawyer');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [usageInfo, setUsageInfo] = useState<UsageInfo>({ remaining: 10, isSubscribed: false, subscriptionTier: 'free' });
  const [limitError, setLimitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // SEO
  useEffect(() => {
    setSeo({
      title: 'ИИ-Юрист - Sud',
      description: 'Персональный юридический помощник. Составлю иск, подготовлю документы, дам юридическую консультацию.',
      keywords: 'ии юрист, юридическая помощь, составить иск, юридическая консультация',
      ogTitle: 'ИИ-Юрист - Sud',
      ogDescription: 'Ваш персональный юридический помощник',
    });
  }, [setSeo]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Приветственное сообщение и проверка подписки
  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isWelcome: true,
        },
      ]);
    }
    
    // Проверяем подписку и обновляем usageInfo
    if (profileData) {
      const subscriptionTier = profileData.subscription_tier || 'free';
      const isSubscribed = subscriptionTier === 'basic' || subscriptionTier === 'premium';
      
      setUsageInfo({
        remaining: isSubscribed ? -1 : 10,
        isSubscribed,
        subscriptionTier,
      });
    }
  }, [isAuthenticated, user, messages.length, profileData]);

  // Загрузка текущего использования при монтировании
  useEffect(() => {
    const loadUsage = async () => {
      if (!user?.id) return;
      
      // Если подписка - не нужно загружать использование
      const subscriptionTier = profileData?.subscription_tier || 'free';
      const isSubscribed = subscriptionTier === 'basic' || subscriptionTier === 'premium';
      
      if (isSubscribed) return;
      
      try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const { data, error } = await supabase
          .from('ai_lawyer_usage')
          .select('messages_count, current_month')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error loading usage:', error);
          return;
        }
        
        if (data) {
          if (data.current_month === currentMonth) {
            const remaining = Math.max(0, 10 - (data.messages_count || 0));
            setUsageInfo(prev => ({ ...prev, remaining }));
          } else {
            // Новый месяц - сбрасываем счётчик
            setUsageInfo(prev => ({ ...prev, remaining: 10 }));
          }
        }
        // Если данных нет (data === null), оставляем значение по умолчанию (10)
      } catch (err) {
        console.error('Error loading usage:', err);
      }
    };
    
    loadUsage();
  }, [user?.id, profileData]);

  const handleSendMessage = async (message?: string) => {
    const finalMessage = message || inputMessage.trim();
    if (!finalMessage || isLoading) return;

    // Проверяем лимит для бесплатных пользователей
    if (!usageInfo.isSubscribed && usageInfo.remaining <= 0) {
      setLimitError('Лимит сообщений исчерпан. Оформите подписку для безлимитного доступа.');
      setIsLoading(false);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: finalMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setShowQuickActions(false);
    setIsLoading(true);

    // Добавляем сообщение "печатается"
    const loadingMessageId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      {
        id: loadingMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    try {
      // Отправляем запрос к Edge Function для Gemini API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-lawyer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          message: finalMessage,
          context: LAWYER_CONTEXT,
          history: messages
            .filter(m => !m.isLoading)
            .slice(-10)
            .map(m => ({
              role: m.role,
              content: m.content,
            })),
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при получении ответа от ИИ');
      }

      const data = await response.json();
      
      // Обновляем информацию об использовании
      if (data.remaining !== undefined) {
        setUsageInfo(prev => ({
          ...prev,
          remaining: data.remaining,
          isSubscribed: data.isSubscribed,
          subscriptionTier: data.subscriptionTier || prev.subscriptionTier,
        }));
      }
      
      // Проверяем ошибку лимита
      if (data.code === 'MESSAGE_LIMIT_EXCEEDED') {
        setLimitError(data.error);
        // Удаляем сообщение об ошибке из чата
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
        setIsLoading(false);
        return;
      }
      
      setLimitError(null);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMessageId
            ? {
                ...msg,
                content: data.response || 'Извините, не удалось получить ответ. Попробуйте ещё раз.',
                isLoading: false,
              }
            : msg
        )
      );
    } catch (error: any) {
      console.error('AI Lawyer error:', error);
      
      // Заменяем сообщение об ошибке
      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMessageId
            ? {
                ...msg,
                content: `Извините, произошла ошибка: ${error.message}. Пожалуйста, попробуйте ещё раз или опишите вашу ситуацию другими словами.`,
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.prompt);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowQuickActions(true);
  };

  // Экспорт истории чата
  const handleExportChat = () => {
    if (messages.length === 0) return;
    
    const chatContent = messages
      .filter(m => !m.isLoading && !m.isWelcome)
      .map(m => {
        const role = m.role === 'user' ? 'Вы' : 'ИИ-Юрист';
        const time = new Date(m.timestamp).toLocaleString('ru-RU');
        return `[${time}] ${role}:\n${m.content}\n`;
      })
      .join('\n' + '='.repeat(50) + '\n\n');
    
    const header = `История чата с ИИ-Юристом\nДата экспорта: ${new Date().toLocaleString('ru-RU')}\n\n${'='.repeat(50)}\n\n`;
    const fullContent = header + chatContent;
    
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-lawyer-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Scale className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            ИИ-Юрист
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Персональный юридический помощник доступен только для зарегистрированных пользователей.
          </p>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">Возможности ИИ-юриста:</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 text-left">
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                Составление исков и заявлений
              </li>
              <li className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                Подготовка списка документов
              </li>
              <li className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-accent" />
                Юридические консультации
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-accent" />
                Возражения на иски
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">ИИ-Юрист</h1>
            <p className="text-xs text-slate-500">Персональный юридический помощник</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Индикатор лимитов */}
          {usageInfo.isSubscribed ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {usageInfo.subscriptionTier === 'premium' ? 'Премиум' : 'Подписка'}
              </span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              usageInfo.remaining > 3 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : usageInfo.remaining > 0
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <span className={`text-xs font-medium ${
                usageInfo.remaining > 3 
                  ? 'text-green-700 dark:text-green-400'
                  : usageInfo.remaining > 0
                  ? 'text-yellow-700 dark:text-yellow-400'
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {usageInfo.remaining} / 10 сообщений
              </span>
            </div>
          )}
          {messages.length > 1 && (
            <button
              onClick={handleExportChat}
              className="p-2 text-slate-500 hover:text-accent transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Экспортировать чат"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-2 text-slate-500 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Очистить чат"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <AnimatePresence>
        {showQuickActions && messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-accent/30 dark:hover:border-accent/30 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{action.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                message.role === 'user' 
                  ? 'bg-slate-900 dark:bg-accent' 
                  : 'bg-gradient-to-br from-accent to-purple-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[85%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-slate-200 dark:bg-accent text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white'
                }`}>
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Думаю...</span>
                    </div>
                  ) : message.isWelcome ? (
                    // Специальный рендеринг приветственного сообщения
                    <div className="space-y-3">
                      <p>
                        Здравствуйте{user?.user_metadata?.full_name ? ', ' + user.user_metadata.full_name : ''}!
                      </p>
                      <p>Я - ваш персональный ИИ-юрист. Я помогу вам:</p>
                      <ul className="space-y-1 list-none pl-0">
                        <li>📝 <strong>Составить иск</strong> — подготовлю исковое заявление в суд</li>
                        <li>📋 <strong>Собрать документы</strong> — составлю перечень нужных документов</li>
                        <li>💡 <strong>Дать консультацию</strong> — проанализирую вашу ситуацию</li>
                        <li>⚖️ <strong>Подготовить возражения</strong> — составлю возражения на иск</li>
                      </ul>
                      <p>Просто опишите вашу ситуацию или выберите действие из быстрых команд ниже.</p>
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                        ⚠️ <strong>Важно:</strong> Я даю общую правовую информацию. Для сложных дел рекомендую{' '}
                        <Link to="/lawyers" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                          обратиться к профессиональному юристу
                        </Link>
                        .
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  )}
                </div>
                {!message.isLoading && message.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-2 justify-start">
                    <button
                      onClick={() => handleCopyMessage(message.content)}
                      className="p-1.5 text-slate-400 hover:text-accent transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Копировать"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Опишите вашу ситуацию или задайте вопрос..."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-accent/20"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors self-end"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            💡 ИИ даёт общую правовую информацию. Для сложных дел рекомендуем <Link to="/lawyers" className="text-accent hover:underline">обратиться к профессиональному юристу</Link>.
          </p>
          {/* Сообщение об ошибке лимита */}
          {limitError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 text-center">{limitError}</p>
              <div className="mt-2 flex justify-center">
                <Link 
                  to="/profile" 
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-light text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Crown className="w-4 h-4" />
                  Оформить подписку
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
