import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, CheckCircle2, Building, FileText, User, Calendar, Gavel, Clock, MapPin, AlertCircle, Download, Link as LinkIcon, Pencil, X, Save, Copy, Trash2, ExternalLink, MessageSquare, Share2, Send, CalendarPlus, RotateCcw } from 'lucide-react';
import { ParsedCase, CaseEvent, CaseAppeal } from '../types';
import { useToast } from '../hooks/useToast';
import { courts, supabase } from '../lib/supabase';
import { Court } from '../types';
import SafeLink from './SafeLink';

interface CaseCardProps {
  caseData: ParsedCase;
  isAdded: boolean;
  isLoading: boolean;
  onAddCase: () => void;
  onUpdateCase?: (updatedData: Partial<ParsedCase>) => void;
  onShowPaymentModal: () => void;
  onDeleteCase?: () => void;
  onRefreshCase?: () => void;
  onDateDoubleClick?: (date: string, time?: string) => void;
  userId?: string;
  subscriptionTier?: string;
  canRefresh?: boolean;
  refreshLimitReason?: string;
}

// Анимации отключены
const cardVariants = {};
const itemVariants = {};

function CaseCard({ 
  caseData, 
  isAdded, 
  isLoading, 
  onAddCase, 
  onUpdateCase, 
  onShowPaymentModal, 
  onDeleteCase, 
  onRefreshCase, 
  onDateDoubleClick,
  userId,
  subscriptionTier,
  canRefresh,
  refreshLimitReason,
}: CaseCardProps) {
  const [activeTab, setActiveTab] = useState('Движение дела');
  const [editingField, setEditingField] = useState<'plaintiff' | 'defendant' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localCaseData, setLocalCaseData] = useState<ParsedCase>(caseData);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSourceWarning, setShowSourceWarning] = useState(false);
  const [courtData, setCourtData] = useState<Court | null>(null);
  const { showToast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Состояние для комментариев
  const [comment, setComment] = useState(localCaseData.comment || '');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync local state when caseData changes
  useEffect(() => {
    setLocalCaseData(caseData);
    setSelectedEventIndex(null);
    setComment(caseData.comment || '');
    
    // Ищем данные о суде - с защитой от повторных вызовов
    let isMounted = true;
    
    if (caseData.court) {
      const fetchCourtData = async () => {
        try {
          const result = await courts.findByName(caseData.court!);
          if (isMounted && result.data) {
            setCourtData(result.data);
          }
        } catch (err) {
          console.error('Error fetching court data:', err);
        }
      };
      
      // Добавляем небольшую задержку чтобы избежать слишком частых запросов
      const timeoutId = setTimeout(fetchCourtData, 100);
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [caseData]);

  // Закрытие popup с эмодзи при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Scroll to bottom when 'Движение дела' tab is active
  useEffect(() => {
    if (activeTab === 'Движение дела' && scrollContainerRef.current) {
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, localCaseData.events]);

  const handleTabClick = (tab: string) => {
    if (tab === 'Движение дела' && activeTab === 'Движение дела') {
      scrollContainerRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      setActiveTab(tab);
    }
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(localCaseData.number);
      showToast('Номер дела скопирован!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEditStart = (field: 'plaintiff' | 'defendant') => {
    setEditingField(field);
    setEditValue(field === 'plaintiff' ? localCaseData.plaintiff : localCaseData.defendant);
  };

  const handleEditSave = () => {
    if (!editingField) return;
    const updatedFields = { [editingField]: editValue };

    if (editingField === 'plaintiff') {
      setLocalCaseData({ ...localCaseData, plaintiff: editValue });
    } else if (editingField === 'defendant') {
      setLocalCaseData({ ...localCaseData, defendant: editValue });
    }
    onUpdateCase?.(updatedFields);
    setEditingField(null);
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Функция для добавления события в календарь
  const handleAddToCalendar = () => {
    // Ищем ближайшее событие с датой и временем
    let targetEvent: CaseEvent | null = null;
    
    if (localCaseData.events && localCaseData.events.length > 0) {
      // Ищем последнее событие с датой
      for (let i = localCaseData.events.length - 1; i >= 0; i--) {
        const event = localCaseData.events[i];
        if (event.date && event.date.trim() !== '') {
          targetEvent = event;
          break;
        }
      }
    }

    if (!targetEvent || !targetEvent.date) {
      showToast('Нет информации о дате заседания');
      return;
    }

    // Парсим дату и время
    const dateStr = targetEvent.date;
    const timeStr = targetEvent.time || '09:00';
    
    // Пытаемся распознать дату
    let year = new Date().getFullYear();
    let month = 0;
    let day = 1;
    
    // Формат ДД.ММ.ГГГГ или ДД.ММ.ГГГГ ГГ:ММ
    const dateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.?(\d{0,4})/);
    if (dateMatch) {
      day = parseInt(dateMatch[1], 10);
      month = parseInt(dateMatch[2], 10) - 1;
      if (dateMatch[3] && dateMatch[3].length === 4) {
        year = parseInt(dateMatch[3], 10);
      }
    }

    // Время
    let hours = 9;
    let minutes = 0;
    const timeMatch = timeStr.match(/(\d{1,2})[\s:]*(\d{0,2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    }

    const startDate = new Date(year, month, day, hours, minutes);
    const endDate = new Date(year, month, day, hours + 1, minutes); // 1 час длительность

    // Форматируем дату для Google Calendar
    const formatGoogleDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const eventName = targetEvent.name || 'Заседание по делу ' + localCaseData.number;
    const eventDescription = `Дело: ${localCaseData.number}\nСуд: ${localCaseData.court}\nКатегория: ${localCaseData.category}\n${targetEvent.result ? 'Результат: ' + targetEvent.result : ''}`;
    const eventLocation = targetEvent.location || localCaseData.court;

    // Создаём ссылку для Google Calendar
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventName)}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;

    // Открываем Google Calendar в новой вкладке
    window.open(googleCalUrl, '_blank');
    showToast('Открываю Google Календарь...');
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 flex flex-col w-full"
    >
      <div className="flex items-center gap-3 mb-6 p-6 sm:p-8 pb-0 shrink-0">
        <div className="bg-accent/10 p-1.5 rounded-2xl">
          <Scale className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{localCaseData.number}</h2>
            <button
              onClick={handleCopyNumber}
              className="p-1.5 text-slate-400 hover:text-accent transition-colors"
              title="Копировать номер дела"
            ><Copy className="w-4 h-4" /></button>
            {isAdded && onRefreshCase && (
              <button
                onClick={() => {
                  // Проверяем ограничения перед обновлением
                  if (subscriptionTier === 'free') {
                    showToast('Ручное обновление доступно только для подписчиков. Оформите подписку или дождитесь автоматического обновления (1 раз в день).', 'info');
                    return;
                  }
                  if (canRefresh === false) {
                    showToast(refreshLimitReason || 'Вы уже обновляли дело сегодня. Следующее обновление будет доступно завтра.', 'info');
                    return;
                  }
                  onRefreshCase();
                }}
                disabled={isRefreshing}
                className="p-1.5 text-slate-400 hover:text-accent transition-colors disabled:opacity-50 relative"
                title={subscriptionTier === 'free' 
                  ? 'Ручное обновление доступно только для подписчиков' 
                  : canRefresh === false 
                    ? refreshLimitReason || 'Лимит обновлений исчерпан'
                    : 'Обновить данные дела'}
              >
                {isRefreshing ? (
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <RotateCcw className={`w-4 h-4 ${subscriptionTier === 'free' || canRefresh === false ? 'opacity-50' : ''}`} />
                    {/* Иконка замка для бесплатных пользователей */}
                    {(subscriptionTier === 'free' || canRefresh === false) && (
                      <span className="absolute -bottom-1 -right-1 text-[8px] text-slate-400">🔒</span>
                    )}
                  </>
                )}
              </button>
            )}
          </div>

          {localCaseData.updated_at && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Обновлено: {new Date(localCaseData.updated_at).toLocaleString('ru-RU', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          )}
        </div>
      </div>

      {/* Tabs for Case Details */}
       <div className="flex flex-col sm:flex-row flex-wrap gap-2 pb-2 mb-6 border-b border-slate-100 dark:border-slate-800 shrink-0 px-6 sm:px-8">
         {['Информация', 'Движение дела', 'Стороны', 'Обжалование', 'Комментарии'].map((tab) => (
           <button
             key={tab}
             onClick={() => handleTabClick(tab)}
             className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex-1 sm:flex-none min-w-[80px] ${
               activeTab === tab
                 ? 'bg-slate-900 dark:bg-accent text-white'
                 : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
             }`}
           >
             {tab}
             {tab === 'Комментарии' && localCaseData.comment && (
               <span className="ml-1 w-2 h-2 bg-accent rounded-full inline-block"></span>
             )}
           </button>
         ))}
       </div>

     <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-800">
       <div className="px-6 sm:px-8">
         <div>
           {activeTab === 'Информация' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                <Building className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Суд</p>
                  {courtData?.website ? (
                    <div className="flex flex-col gap-2">
                      <SafeLink 
                        href={courtData.website}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white hover:text-accent dark:hover:text-accent transition-colors group"
                      >
                        <span>{localCaseData.court}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent transition-colors" />
                      </SafeLink>
                      <div className="flex items-center gap-2 mt-1">
                        <SafeLink 
                          href={`https://yandex.ru/maps/?text=${encodeURIComponent(courtData.full_address || courtData.name)}`}
                          className="text-[10px] font-medium px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-all"
                          title="Яндекс.Карты"
                        >
                          Яндекс
                        </SafeLink>
                        <SafeLink 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(courtData.full_address || courtData.name)}`}
                          className="text-[10px] font-medium px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded shadow-sm transition-all"
                          title="Google Maps"
                        >
                          Google
                        </SafeLink>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SafeLink 
                        href={`https://yandex.ru/maps/?text=${encodeURIComponent(localCaseData.court)}`}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white hover:text-accent dark:hover:text-accent transition-colors group"
                      >
                        <span>{localCaseData.court}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent transition-colors" />
                      </SafeLink>
                      <div className="flex items-center gap-2 mt-1">
                        <SafeLink 
                          href={`https://yandex.ru/maps/?text=${encodeURIComponent(localCaseData.court)}`}
                          className="text-[10px] font-medium px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-all"
                          title="Яндекс.Карты"
                        >
                          Яндекс
                        </SafeLink>
                        <SafeLink 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localCaseData.court)}`}
                          className="text-[10px] font-medium px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded shadow-sm transition-all"
                          title="Google Maps"
                        >
                          Google
                        </SafeLink>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                <FileText className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Категория</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{localCaseData.category}</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                <User className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Судья</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{localCaseData.judge}</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Дата регистрации</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{localCaseData.date}</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                <User className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Истец</p>
                  {localCaseData.plaintiff && !localCaseData.plaintiff.includes('скрыта') ? (
                    editingField === 'plaintiff' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                          placeholder="Введите имя истца"
                        />
                        <button onClick={handleEditSave} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={handleEditCancel} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex-1">{localCaseData.plaintiff}</p>
                        <button onClick={() => handleEditStart('plaintiff')} className="p-1 text-slate-400 hover:text-accent transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm font-bold text-slate-400">Информация скрыта</p>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                <User className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Ответчик</p>
                  {localCaseData.defendant && !localCaseData.defendant.includes('скрыта') ? (
                    editingField === 'defendant' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                          placeholder="Введите имя ответчика"
                        />
                        <button onClick={handleEditSave} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={handleEditCancel} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex-1">{localCaseData.defendant}</p>
                        <button onClick={() => handleEditStart('defendant')} className="p-1 text-slate-400 hover:text-accent transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm font-bold text-slate-400">Информация скрыта</p>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                <Gavel className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Результат рассмотрения</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{localCaseData.status}</p>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'Движение дела' && (
              <div className="pb-8">
              {localCaseData.events && localCaseData.events.length > 0 ? (
                <>
                  {localCaseData.events.map((event: CaseEvent, index: number) => (
                    <div 
                      key={index} 
                      onClick={(e) => {
                        const newIndex = selectedEventIndex === index ? null : index;
                        setSelectedEventIndex(newIndex);
                        if (newIndex !== null) {
                          e.currentTarget.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          });
                        }
                      }}
                      className={`relative flex items-start gap-4 mb-4 p-4 rounded-xl border transition-colors duration-200 cursor-pointer ${
                        selectedEventIndex === index ? 'bg-accent/10 dark:bg-accent/20 border-accent/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                      }`}>
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        {index < localCaseData.events.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span 
                            className="font-bold text-slate-900 dark:text-white text-sm cursor-pointer hover:text-accent transition-colors select-none"
                            onDoubleClick={() => {
                              if (event.date && onDateDoubleClick) {
                                onDateDoubleClick(event.date, event.time);
                              }
                            }}
                            title="Двойной клик для перехода в календарь"
                          >
                            {event.date}
                          </span>
                          <span className="text-xs font-medium text-slate-500">{event.time}</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">{event.name}</p>
                        {event.location && <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> {event.location}</p>}
                        {event.result && <p className="text-xs font-bold text-accent flex items-center gap-1 mt-2"><CheckCircle2 className="w-3 h-3" /> {event.result}</p>}
                        {event.reason && <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {event.reason}</p>}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет данных о движении дела</p>
                </div>
              )}
            </div>
            )}

            {activeTab === 'Стороны' && (
              <div className="space-y-4 pb-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Истец</p>
                  {localCaseData.plaintiff && !localCaseData.plaintiff.includes('скрыта') ? (
                    editingField === 'plaintiff' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                          placeholder="Введите имя истца"
                        />
                        <button onClick={handleEditSave} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={handleEditCancel} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex-1">{localCaseData.plaintiff}</p>
                        <button onClick={() => handleEditStart('plaintiff')} className="p-1 text-slate-400 hover:text-accent transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm font-bold text-slate-400">Информация скрыта</p>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Ответчик</p>
                  {localCaseData.defendant && !localCaseData.defendant.includes('скрыта') ? (
                    editingField === 'defendant' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                          placeholder="Введите имя ответчика"
                        />
                        <button onClick={handleEditSave} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={handleEditCancel} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex-1">{localCaseData.defendant}</p>
                        <button onClick={() => handleEditStart('defendant')} className="p-1 text-slate-400 hover:text-accent transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm font-bold text-slate-400">Информация скрыта</p>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Третье лицо</p>
                  <p className="text-sm font-bold text-slate-400">Информация скрыта</p>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'Обжалование' && (
              <div className="space-y-4 pb-8">
              {localCaseData.appeals && localCaseData.appeals.length > 0 ? (
                <>
                  {localCaseData.appeals.map((appeal: CaseAppeal) => (
                    <div key={appeal.id} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{appeal.type}</h4>
                        <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">{appeal.date || '—'}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="flex justify-between"><span className="text-slate-500">Заявитель:</span> <span className="font-medium text-slate-900 dark:text-white">{appeal.applicant}</span></p>
                        <p className="flex justify-between"><span className="text-slate-500">Вышестоящий суд:</span> <span className="font-medium text-slate-900 dark:text-white text-right">{appeal.court}</span></p>
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Результат обжалования</p>
                          <p className="font-bold text-accent text-sm">{appeal.result}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет данных об обжаловании</p>
                </div>
              )}
            </div>
            )}

            {/* Вкладка Комментарии */}
            {activeTab === 'Комментарии' && (
              <div className="pb-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Ваш комментарий</h4>
                  </div>
                  <div className="relative">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Добавьте заметки к делу, напоминания или важные детали..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                      rows={3}
                    />
                    {/* Кнопка эмодзи с пикером */}
                    <div ref={emojiPickerRef} className="relative">
                      <button
                        ref={emojiButtonRef}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!showEmojiPicker && emojiButtonRef.current) {
                            const rect = emojiButtonRef.current.getBoundingClientRect();
                            // Вычисляем позицию с учётом границ экрана
                            const pickerWidth = 220;
                            const pickerHeight = 200;
                            
                            let left = rect.right - pickerWidth;
                            let top = rect.top - pickerHeight;
                            
                            // Корректируем если выходит за левый край
                            if (left < 10) left = 10;
                            // Корректируем если выходит за правый край
                            if (left + pickerWidth > window.innerWidth - 10) {
                              left = window.innerWidth - pickerWidth - 10;
                            }
                            // Корректируем если выходит за верхний край
                            if (top < 10) top = rect.bottom + 5;
                            
                            setEmojiPickerPosition({ top, left });
                          }
                          setShowEmojiPicker(!showEmojiPicker);
                        }}
                        className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Добавить эмодзи"
                      >
                        <span className="text-base">😀</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-[10px] text-slate-500">
                      {comment.length} / 1000
                    </p>
                    <button
                      onClick={async () => {
                        if (comment.length > 1000) {
                          showToast('Комментарий слишком длинный (макс. 1000 символов)');
                          return;
                        }
                        setIsSavingComment(true);
                        try {
                          // Обновляем локальное состояние
                          setLocalCaseData({ ...localCaseData, comment });
                          // Вызываем коллбэк для сохранения в родительском компоненте
                          onUpdateCase?.({ comment });
                          showToast('Комментарий сохранён');
                        } catch (err) {
                          showToast('Ошибка сохранения комментария');
                        } finally {
                          setIsSavingComment(false);
                        }
                      }}
                      disabled={isSavingComment || comment === (localCaseData.comment || '')}
                      className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {isSavingComment ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Сохранить
                    </button>
                  </div>
                </div>

                {/* Поделиться с юристами */}
                {isAdded && (
                  <div className="bg-gradient-to-r from-accent/10 to-purple-500/10 dark:from-accent/20 dark:to-purple-500/20 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 className="w-4 h-4 text-accent" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Поделиться с юристом</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                      Отправьте это дело юристу для консультации
                    </p>
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="w-full bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      Поделиться с юристом
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2 sm:gap-1.5 shrink-0 p-3 pt-2">
         <button
           onClick={onAddCase}
           disabled={isAdded || isLoading}
           className={`col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
             isAdded
               ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-default'
               : 'bg-accent hover:bg-accent-light text-white'
           }`}
         >
           {isLoading ? (
             <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /></>
           ) : isAdded ? (
             <><CheckCircle2 className="w-3 h-3" /><span className="hidden sm:inline ml-1">Добавлено</span></>
           ) : (
             <><Scale className="w-3 h-3" /><span className="hidden sm:inline ml-1">Добавить</span></>
           )}
         </button>
         <button
           onClick={() => {
             // Free PDF export using browser print
             const printWindow = window.open('about:blank');
             if (printWindow) {
               const content = `
                 <!DOCTYPE html>
                 <html>
                 <head>
                   <title>${localCaseData.number}</title>
                   <style>
                     body { font-family: Arial, sans-serif; padding: 15px; font-size: 11px; }
                     h1 { color: #333; font-size: 16px; }
                     h2 { color: #333; font-size: 13px; margin-top: 15px; }
                     .section { margin-bottom: 12px; }
                     .label { font-weight: bold; color: #666; font-size: 10px; }
                     .value { margin-bottom: 5px; font-size: 11px; }
                     table { width: 100%; border-collapse: collapse; font-size: 10px; }
                     th, td { border: 1px solid #ddd; padding: 4px; text-align: left; font-size: 10px; }
                     th { background: #f5f5f5; font-size: 10px; }
                     p { margin: 3px 0; font-size: 10px; }
                   </style>
                 </head>
                 <body>
                   <div class="section">
                     <div class="label">Суд:</div>
                     <div class="value">${localCaseData.court}</div>
                     <div class="label">Категория:</div>
                     <div class="value">${localCaseData.category}</div>
                     <div class="label">Судья:</div>
                     <div class="value">${localCaseData.judge}</div>
                     <div class="label">Дата регистрации:</div>
                     <div class="value">${localCaseData.date}</div>
                     <div class="label">Истец:</div>
                     <div class="value">${localCaseData.plaintiff || '—'}</div>
                     <div class="label">Ответчик:</div>
                     <div class="value">${localCaseData.defendant || '—'}</div>
                     <div class="label">Результат:</div>
                     <div class="value">${localCaseData.status}</div>
                   </div>
                   ${localCaseData.events && localCaseData.events.length > 0 ? `
                   <div class="section">
                     <h2>Движение дела</h2>
                     <table>
                       <tr><th>Дата</th><th>Время</th><th>Событие</th><th>Результат</th></tr>
                       ${localCaseData.events.map(e => `
                         <tr>
                           <td>${e.date}</td>
                           <td>${e.time || '—'}</td>
                           <td>${e.name}</td>
                           <td>${e.result || '—'}</td>
                         </tr>
                       `).join('')}
                     </table>
                   </div>
                   ` : ''}
                   ${localCaseData.appeals && localCaseData.appeals.length > 0 ? `
                   <div class="section">
                     <h2>Обжалование</h2>
                     <table>
                       <tr><th>Тип</th><th>Дата</th><th>Заявитель</th><th>Суд</th><th>Результат</th></tr>
                       ${localCaseData.appeals.map(a => `
                         <tr>
                           <td>${a.type}</td>
                           <td>${a.date || '—'}</td>
                           <td>${a.applicant}</td>
                           <td>${a.court}</td>
                           <td>${a.result}</td>
                         </tr>
                       `).join('')}
                     </table>
                   </div>
                   ` : ''}
                 </body>
                 </html>
               `;
               printWindow.document.write(content);
               printWindow.document.close();
               printWindow.print();
             }
           }}
           className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
         >
           <Download className="w-3 h-3" />
           <span className="hidden sm:inline">PDF</span>
         </button>
         <a
           href={localCaseData.link}
           target="_blank"
           rel="noopener noreferrer"
           className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
           onClick={(e) => {
             e.preventDefault();
             setShowSourceWarning(true);
           }}
         >
           <LinkIcon className="w-3 h-3" />
           <span className="hidden sm:inline">Источник</span>
         </a>
         {isAdded && onDeleteCase && (
           <button
             onClick={() => setShowDeleteConfirm(true)}
             className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400"
             title="Удалить"
           >
             <Trash2 className="w-3 h-3" />
             <span className="hidden sm:inline">Удалить</span>
           </button>
         )}
         {/* Кнопка добавления в Google Календарь - только для добавленных дел */}
         {isAdded && (
           <button
             onClick={handleAddToCalendar}
             className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
             title="Добавить дату заседания в Google Календарь"
           >
             <CalendarPlus className="w-3 h-3" />
             <span className="hidden sm:inline">Google</span>
           </button>
         )}
         {/* Кнопка поделиться - только для добавленных дел */}
         {isAdded && (
           <button
             onClick={() => setShowShareModal(true)}
             className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400"
             title="Поделиться с юристом"
           >
             <Share2 className="w-3 h-3" />
             <span className="hidden sm:inline">Поделиться</span>
           </button>
         )}
         {/* Кнопка скрытия всегда видна если передан onDeleteCase и дело не добавлено */}
         {!isAdded && onDeleteCase && (
           <button
             onClick={() => setShowDeleteConfirm(true)}
             className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400"
             title="Скрыть из результатов"
           >
             <Trash2 className="w-3 h-3" />
             <span className="hidden sm:inline">Скрыть</span>
           </button>
         )}
       </div>

     {/* Подтверждение удаления */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Удалить дело?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Вы уверены, что хотите удалить дело {localCaseData.number}? Это действие нельзя отменить.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    onDeleteCase();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Предупреждение о переходе на сайт суда */}
      <AnimatePresence>
        {showSourceWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSourceWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Внимание!</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 text-center">
                Вы переходите на сайт суда, который может содержать информацию, не связанную с вашим делом. Мы не несем ответственности за информацию, размещенную на сайте суда.
              </p>
              {/* Рекламный блок */}
              <div className="bg-gradient-to-r from-accent/10 to-purple-500/10 dark:from-accent/20 dark:to-purple-500/20 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-accent mb-2">📢 Реклама</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  Хотите получать уведомления о новых событиях по вашему делу?
                </p>
                <a 
                  href="/monitoring" 
                  className="inline-block text-xs font-bold text-accent hover:underline"
                  onClick={() => setShowSourceWarning(false)}
                >
                  Подключить мониторинг →
                </a>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSourceWarning(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Отмена
                </button>
                <a
                  href={localCaseData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors text-center flex items-center justify-center gap-2"
                >
                  Перейти
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Эмодзи-пикер с fixed позиционированием */}
      <AnimatePresence>
        {showEmojiPicker && emojiPickerPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-[9999]"
            style={{
              top: `${emojiPickerPosition.top}px`,
              left: `${emojiPickerPosition.left}px`,
            }}
          >
            <div className="grid grid-cols-6 gap-1">
              {['😀', '😂', '🤣', '😊', '😍', '🤔', '👍', '👎', '❤️', '⚠️', '✅', '❌', '📌', '🔔', '📎', '💼', '📋', '⚖️', '🏛', '📅', '⏰', '💰', '🏠', '🚗'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setComment(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно шеринга с юристом */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-accent" />
                  Поделиться с юристом
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-4">
                <p className="text-xs text-slate-500 mb-2">Дело:</p>
                <p className="font-bold text-slate-900 dark:text-white">{localCaseData.number}</p>
                <p className="text-sm text-slate-500">{localCaseData.court}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Сообщение для юриста
                </label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Добавьте вопрос или описание ситуации..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    // Создаем текст для копирования/отправки
                    const shareText = `📋 Дело: ${localCaseData.number}\n🏛 Суд: ${localCaseData.court}\n📅 Дата: ${localCaseData.date}\n⚖️ Категория: ${localCaseData.category}\n\n${shareMessage ? `💬 Сообщение: ${shareMessage}\n` : ''}🔗 Ссылка: ${localCaseData.link}`;
                    
                    // Копируем в буфер обмена
                    navigator.clipboard.writeText(shareText).then(() => {
                      showToast('Информация о деле скопирована! Теперь вы можете отправить её юристу.');
                      setShowShareModal(false);
                      setShareMessage('');
                    }).catch(() => {
                      showToast('Не удалось скопировать. Попробуйте ещё раз.');
                    });
                  }}
                  className="flex-1 bg-accent hover:bg-accent-light text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Копировать
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-3">
                Скопируйте данные и отправьте их юристу любым удобным способом
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CaseCard;
