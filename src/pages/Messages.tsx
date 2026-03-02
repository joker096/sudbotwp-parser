import { useState, useEffect } from 'react';
import { ShieldCheck, Info, CheckCircle2, MoreVertical } from 'lucide-react';
import MentionInput, { useLawyers } from '../components/MentionInput';
import { useSeo } from '../hooks/useSeo';

export default function Messages() {
  const { setSeo } = useSeo('/messages');
  const [message, setMessage] = useState('');
  const { lawyers, fetchLawyers } = useLawyers();
  
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
  
  const handleSend = () => {
    if (message.trim()) {
      // Здесь можно добавить отправку сообщения
      console.log('Отправка сообщения:', message);
      setMessage('');
    }
  };
  
  const chatHistory = [
    { id: 1, sender: 'lawyer', text: 'Здравствуйте! Я ознакомился с вашим делом № 2-1234/2024. Готов взяться за представительство в суде.', time: '10:30' },
    { id: 2, sender: 'user', text: 'Добрый день, Александр. Подскажите, какие шансы на успех и какова стоимость ваших услуг?', time: '10:35' },
    { id: 3, sender: 'lawyer', text: 'Шансы оцениваю высоко, так как есть аналогичная судебная практика. Стоимость ведения дела "под ключ" составит 50 000 рублей.', time: '10:42' },
  ];

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] flex flex-col md:flex-row gap-3 sm:gap-6 p-3 sm:p-0">
      
      {/* Sidebar - Contacts */}
      <div className="w-full md:w-80 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 flex flex-col overflow-hidden shrink-0 h-[150px] md:h-auto">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Сообщения</h2>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 cursor-pointer flex gap-3 items-center">
            <div className="relative">
              <img src="https://picsum.photos/seed/lawyer1/100/100" alt="Lawyer" referrerPolicy="no-referrer" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">Александр Смирнов</h4>
                <span className="text-[8px] sm:text-[10px] text-slate-400">10:42</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Шансы оцениваю высоко...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 flex flex-col overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <img src="https://picsum.photos/seed/lawyer1/100/100" alt="Lawyer" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                Александр Смирнов <ShieldCheck className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Гражданские дела • В сети</p>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Monetization / Secure Deal Banner */}
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 border-b border-accent/20 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          <div className="flex gap-2 sm:gap-3 items-start sm:items-center w-full sm:w-auto">
            <div className="bg-white dark:bg-slate-800 p-1.5 sm:p-2 rounded-full shadow-sm shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 sm:gap-2">
                Безопасная сделка
                <span className="bg-accent text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">Скидка 5%</span>
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 sm:mt-1 leading-relaxed hidden sm:block">
                Оплачивая услуги через платформу, вы получаете скидку 5% и гарантию возврата средств
              </p>
            </div>
          </div>
          <button className="shrink-0 bg-accent hover:bg-accent-light text-white px-3 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Оформить договор</span>
            <span className="sm:hidden">Договор</span>
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
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

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <MentionInput
            value={message}
            onChange={setMessage}
            placeholder="Введите сообщение... Начните с @ чтобы выбрать юриста"
            lawyers={lawyers}
            onSend={handleSend}
          />
          <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-slate-400">
            <ShieldCheck className="w-3 h-3" />
            <span>Сообщения защищены сквозным шифрованием</span>
          </div>
        </div>
      </div>
    </div>
  );
}