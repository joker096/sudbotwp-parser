import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Info, CheckCircle2, MoreVertical, ChevronDown, Paperclip, X, ArrowLeft, Phone, Video } from 'lucide-react';
import MentionInput, { useLawyers } from '../components/MentionInput';
import EncryptedFileUpload from '../components/EncryptedFileUpload';
import { useSeo } from '../hooks/useSeo';
import SafeDealModal from '../components/SafeDealModal';

// Типы для чата
interface Chat {
  id: string;
  lawyerId: string;
  lawyerName: string;
  lawyerAvatar: string;
  lawyerSpec: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
}

// Демо данные чатов
const DEMO_CHATS: Chat[] = [
  { id: '1', lawyerId: '1', lawyerName: 'Александр Смирнов', lawyerAvatar: 'https://picsum.photos/seed/lawyer1/100/100', lawyerSpec: 'Гражданские дела', lastMessage: 'Шансы оцениваю высоко...', lastTime: '10:42', unread: 0, online: true },
  { id: '2', lawyerId: '2', lawyerName: 'Елена Волкова', lawyerAvatar: 'https://picsum.photos/seed/lawyer2/100/100', lawyerSpec: 'Семейные дела', lastMessage: 'Готова взяться за ваше дело', lastTime: 'Вчера', unread: 2, online: true },
  { id: '3', lawyerId: '3', lawyerName: 'Дмитрий Иванов', lawyerAvatar: 'https://picsum.photos/seed/lawyer3/100/100', lawyerSpec: 'Уголовные дела', lastMessage: 'Нужны дополнительные документы', lastTime: 'Вчера', unread: 0, online: false },
  { id: '4', lawyerId: '4', lawyerName: 'Анна Петрова', lawyerAvatar: 'https://picsum.photos/seed/lawyer4/100/100', lawyerSpec: 'Арбитраж', lastMessage: 'Спасибо за доверие!', lastTime: 'Пн', unread: 0, online: false },
];

export default function Messages() {
  const { setSeo } = useSeo('/messages');
  const [message, setMessage] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(DEMO_CHATS[0]);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const { lawyers, fetchLawyers } = useLawyers();
  const [showContractButton, setShowContractButton] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showSafeDealModal, setShowSafeDealModal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; url: string; path: string }>>([]);
  
  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Сообщения - Sud',
      description: 'Общение с юристами через защищённый чат платформы Sud.',
      keywords: 'сообщения, чат, юристы, общение',
      ogTitle: 'Сообщения - Sud',
      ogDescription: 'Общайтесь с юристами через защищённый чат.',
      noindex: true,
    });
  }, [setSeo]);
  
  // Загружаем юристов при монтировании
  useEffect(() => {
    fetchLawyers();
  }, [fetchLawyers]);

  // Выбор чата (мобильная версия)
  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setMobileShowChat(true);
  };

  // Возврат к списку чатов (мобильная версия)
  const handleBackToChats = () => {
    setMobileShowChat(false);
  };
  
  const handleSend = () => {
    if (message.trim() || attachedFiles.length > 0) {
      // Здесь можно добавить отправку сообщения с вложенными файлами
      console.log('Отправка сообщения:', message, 'Файлы:', attachedFiles);
      setMessage('');
      setAttachedFiles([]);
      setShowFileUpload(false);
    }
  };

  const handleFileUploaded = (fileName: string, fileUrl: string) => {
    setAttachedFiles(prev => [...prev, {
      name: fileName,
      url: fileUrl,
      path: fileUrl,
    }]);
  };

  const handleFileDeleted = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(file => file.name !== fileName));
  };
  
  const chatHistory = [
    { id: 1, sender: 'lawyer', text: 'Здравствуйте! Я ознакомился с вашим делом № 2-1234/2024. Готов взяться за представительство в суде.', time: '10:30' },
    { id: 2, sender: 'user', text: 'Добрый день, Александр. Подскажите, какие шансы на успех и какова стоимость ваших услуг?', time: '10:35' },
    { id: 3, sender: 'lawyer', text: 'Шансы оцениваю высоко, так как есть аналогичная судебная практика. Стоимость ведения дела "под ключ" составит 50 000 рублей.', time: '10:42' },
  ];

  // Форматирование времени для мобильных
  const formatTime = (time: string) => time;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] flex flex-col md:flex-row gap-3 sm:gap-6 p-3 sm:p-0">
      
      {/* ===== МОБИЛЬНАЯ ВЕРСИЯ: СПИСОК ЧАТОВ ===== */}
      <div className={`w-full md:w-80 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 flex flex-col overflow-hidden shrink-0 h-full ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Сообщения</h2>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {DEMO_CHATS.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => handleSelectChat(chat)}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl cursor-pointer flex gap-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedChat?.id === chat.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
            >
              <div className="relative">
                <img src={chat.lawyerAvatar} alt={chat.lawyerName} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover" />
                {chat.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-0.5">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{chat.lawyerName}</h4>
                  <span className="text-xs text-slate-400">{chat.lastTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{chat.lastMessage}</p>
                  {chat.unread > 0 && (
                    <span className="ml-2 bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{chat.unread}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== ОСНОВНАЯ ОБЛАСТЬ ЧАТА ===== */}
      <div className={`flex-1 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 flex flex-col overflow-hidden relative ${!mobileShowChat && 'hidden md:flex'}`}>
        
        {/* ===== КОМПАКТНАЯ ШАПКА ЧАТА ===== */}
        <div className="p-2 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
          {/* Левая часть - кнопка назад и юрист */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Кнопка назад (мобильная) */}
            <button 
              onClick={handleBackToChats}
              className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <img 
              src={selectedChat?.lawyerAvatar || 'https://picsum.photos/seed/lawyer1/100/100'} 
              alt={selectedChat?.lawyerName} 
              referrerPolicy="no-referrer" 
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover shrink-0" 
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate flex items-center gap-1">
                {selectedChat?.lawyerName || 'Выберите чат'}
                <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
              </h3>
              <p className="text-xs text-green-500 truncate">
                {selectedChat?.online ? 'В сети' : 'Был(а) недавно'}
              </p>
            </div>
          </div>
          
          {/* Правая часть - действия (скрыты на мобильных для экономии места) */}
          <div className="hidden sm:flex items-center gap-1">
            <button className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Компактный баннер безопасной сделки - скрыт по умолчанию на мобильных */}
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 border-b border-accent/20 p-2 sm:p-3 flex items-center justify-between gap-2">
          <div className="flex gap-2 items-center min-w-0">
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm shrink-0">
              <ShieldCheck className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 cursor-pointer" onClick={() => setShowContractButton(!showContractButton)}>
                Безопасная сделка
                <span className="bg-accent text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">-5%</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showContractButton ? 'rotate-180' : ''}`} />
              </h4>
              {showContractButton && (
                <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Гарантия возврата средств
                </p>
              )}
            </div>
          </div>
          {showContractButton && (
            <button 
              className="shrink-0 bg-accent hover:bg-accent-light text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              onClick={() => setShowSafeDealModal(true)}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Оформить</span>
            </button>
          )}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50 min-h-0">
          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Сегодня</span>
          </div>
          
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-4 ${
                msg.sender === 'user' 
                  ? 'bg-accent text-white rounded-tr-sm shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <span className={`text-[10px] block mt-2 text-right ${msg.sender === 'user' ? 'text-accent-light/50 text-white/70' : 'text-slate-400'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area - компактная версия */}
        <div className="p-2 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {/* Кнопка прикрепления - показываем как иконку на мобильных */}
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Прикрепить документ"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            {showFileUpload && (
              <div className="flex-1">
                <EncryptedFileUpload
                  onFileUploaded={handleFileUploaded}
                  existingFiles={attachedFiles}
                  onFileDeleted={handleFileDeleted}
                  folder="shared"
                />
              </div>
            )}
          </div>

          {/* Вложенные файлы */}
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs"
                >
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{file.name}</span>
                  <button
                    onClick={() => handleFileDeleted(file.name)}
                    className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <MentionInput
            value={message}
            onChange={setMessage}
            placeholder="Сообщение..."
            lawyers={lawyers}
            onSend={handleSend}
          />
          <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-slate-400">
            <ShieldCheck className="w-3 h-3" />
            <span>Зашифровано</span>
          </div>
        </div>

        {/* Safe Deal Modal */}
        {showSafeDealModal && selectedChat && (
          <SafeDealModal
            chatId={selectedChat.id}
            userId="demo-user-id"
            lawyerId={selectedChat.lawyerId}
            onClose={() => setShowSafeDealModal(false)}
          />
        )}
      </div>
    </div>
  );
}