import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, FileText, User, Calendar, Gavel, AlertCircle, Download, Link as LinkIcon, X, Trash2, ExternalLink, Share2, CalendarPlus, Archive, Copy, Scale, Pencil, Save } from 'lucide-react';
import { ParsedCase, CaseEvent } from '../types';
import { useToast } from '../hooks/useToast';
import { courts, cases, caseComments } from '../lib/supabase';
import { Court } from '../types';
import SafeLink from './SafeLink';
import { ConfirmModal } from './ConfirmModal';
import CaseCardHeader from './CaseCardHeader';
import CaseCardEvents from './CaseCardEvents';
import CaseCardComments from './CaseCardComments';
import CaseCardParties from './CaseCardParties';
import CaseCardAppeals from './CaseCardAppeals';

interface CaseCardProps {
  caseData: ParsedCase;
  caseId?: string | null;
  isAdded: boolean;
  isLoading: boolean;
  onAddCase: () => void;
  onUpdateCase?: (updatedData: Partial<ParsedCase>) => void;
  onCommentSaved?: () => void;
  onShowPaymentModal: () => void;
  onDeleteCase?: () => void;
  onRefreshCase?: () => void;
  onDateDoubleClick?: (date: string, time?: string) => void;
  onArchiveCase?: () => void;
  userId?: string;
  subscriptionTier?: string;
  canRefresh?: boolean;
  refreshLimitReason?: string;
}

// Анимации отключены
const CASE_CARD_TABS = ['Информация', 'Движение дела', 'Стороны', 'Обжалование', 'Комментарии'] as const;

function CaseCard({ 
  caseData, 
  caseId,
  isAdded, 
  isLoading, 
  onAddCase, 
  onUpdateCase, 
  onCommentSaved,
  onShowPaymentModal, 
  onDeleteCase, 
  onRefreshCase, 
  onDateDoubleClick,
  onArchiveCase,
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
  const [showDeleteCaseConfirm, setShowDeleteCaseConfirm] = useState(false);
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState(false);
  const [showSourceWarning, setShowSourceWarning] = useState(false);
  const [courtData, setCourtData] = useState<Court | null>(null);
  const { showToast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Состояние для комментариев
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentHistory, setCommentHistory] = useState<{id: string; content: string; created_at: string; author_id: string}[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  // Sync local state when caseData changes
  useEffect(() => {
    setLocalCaseData(caseData);
    setSelectedEventIndex(null);
    
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

  // Загрузка истории комментариев при переключении на вкладку
  useEffect(() => {
    if (activeTab === 'Комментарии' && caseId && userId) {
      setIsLoadingHistory(true);
      caseComments.getByCase(caseId)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error loading comment history:', error);
          } else if (data) {
            setCommentHistory(data);
          }
        })
        .finally(() => setIsLoadingHistory(false));
    }
  }, [activeTab, caseId, userId]);

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
  }, [activeTab, localCaseData.events, localCaseData.events?.length]);

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

  const handleEditStart = (field: 'plaintiff' | 'defendant') => {
    setEditingField(field);
    setEditValue(field === 'plaintiff' ? localCaseData.plaintiff : localCaseData.defendant);
  };

const handleEditSave = async () => {
  if (!editingField || !caseId) {
    showToast('Ошибка: ID дела не найден', 'error');
    return;
  }
  
  setIsSavingField(true);
  const updatedFields = { [editingField]: editValue };

  try {
    const { error } = await cases.updateCase(caseId, updatedFields);
    if (error) {
      console.error('Save error:', error);
      showToast(`Ошибка сохранения: ${error.message}`, 'error');
      return;
    }

    // Update local state
    if (editingField === 'plaintiff') {
      setLocalCaseData({ ...localCaseData, plaintiff: editValue });
    } else if (editingField === 'defendant') {
      setLocalCaseData({ ...localCaseData, defendant: editValue });
    }
    
    onUpdateCase?.(updatedFields);
    showToast('Поле обновлено успешно!');
  } catch (err) {
    showToast('Ошибка при обновлении', 'error');
  } finally {
    setIsSavingField(false);
    setEditingField(null);
  }
};

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Функция для добавления события в календарь
  const handleAddToCalendar = () => {
    // Ищем ближайшее событие с датой и временем
    let targetEvent: CaseEvent | null = null;
    
    if (localCaseData.events && Array.isArray(localCaseData.events) && localCaseData.events.length > 0) {
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

  const handleAddComment = async () => {
    if (newCommentText.trim().length === 0) {
      showToast('Введите текст комментария');
      return;
    }
    if (!caseId || !userId) {
      showToast('Ошибка: не найден ID дела или пользователя', 'error');
      return;
    }

    setIsSavingComment(true);
    try {
      const { error } = await caseComments.create(caseId, userId, newCommentText);
      if (error) throw error;

      setNewCommentText('');
      showToast('✅ Комментарий добавлен');

      const { data } = await caseComments.getByCase(caseId);
      if (data) setCommentHistory(data);

      if (onCommentSaved) onCommentSaved();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      showToast('❌ Ошибка: ' + (err.message || 'Не удалось добавить комментарий'), 'error');
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleSaveEditedComment = async (commentId: string) => {
    try {
      await caseComments.update(commentId, editingCommentText);
      setCommentHistory(commentHistory.map((cm) => cm.id === commentId ? { ...cm, content: editingCommentText } : cm));
      setEditingCommentId(null);
      showToast('Комментарий обновлён');
    } catch (err) {
      showToast('Ошибка обновления', 'error');
    }
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 flex flex-col w-full"
    >
      <CaseCardHeader
        caseNumber={localCaseData.number}
        updatedAt={localCaseData.updated_at}
        isAdded={isAdded}
        canRefresh={canRefresh}
        refreshLimitReason={refreshLimitReason}
        subscriptionTier={subscriptionTier}
        onRefresh={onRefreshCase}
        isRefreshing={false}
        actions={isAdded && onArchiveCase ? (
          <button
            onClick={() => onArchiveCase()}
            className="p-1.5 text-slate-400 hover:text-accent transition-all"
            title="Архивировать дело"
          >
            <Archive className="w-4 h-4" />
          </button>
        ) : null}
      />

      {/* Tabs for Case Details */}
       <div className="flex flex-col sm:flex-row flex-wrap gap-2 pb-2 mb-6 border-b border-slate-100 dark:border-slate-800 shrink-0 px-6 sm:px-8">
         {CASE_CARD_TABS.map((tab) => (
           <button
             key={tab}
             onClick={() => handleTabClick(tab)}
             className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 sm:flex-none min-w-[80px] ${
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
                         className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white hover:text-accent dark:hover:text-accent transition-all group"
                       >
                         <span>{localCaseData.court}</span>
                         <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent transition-all" />
                       </SafeLink>
                     </div>
                   ) : (
                     <SafeLink 
                       href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localCaseData.court)}`}
                       className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white hover:text-accent dark:hover:text-accent transition-all group"
                     >
                       <span>{localCaseData.court}</span>
                       <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent transition-all" />
                     </SafeLink>
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
<button onClick={handleEditSave} disabled={isSavingField} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed">
  {isSavingField ? (
    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
  ) : (
    <Save className="w-4 h-4" />
  )}
</button>
                        <button onClick={handleEditCancel} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex-1">{localCaseData.plaintiff}</p>
                        <button onClick={() => handleEditStart('plaintiff')} className="p-1 text-slate-400 hover:text-accent transition-all">
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
<button onClick={handleEditSave} disabled={isSavingField} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed">
  {isSavingField ? (
    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
  ) : (
    <Save className="w-4 h-4" />
  )}
</button>
                        <button onClick={handleEditCancel} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white flex-1">{localCaseData.defendant}</p>
                        <button onClick={() => handleEditStart('defendant')} className="p-1 text-slate-400 hover:text-accent transition-all">
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
                <CaseCardEvents
                  events={Array.isArray(localCaseData.events) ? localCaseData.events : []}
                  selectedEventIndex={selectedEventIndex}
                  onDateDoubleClick={onDateDoubleClick}
                  onSelectEvent={(newIndex, element) => {
                    setSelectedEventIndex(newIndex);
                    if (newIndex !== null && element) {
                      element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                    }
                  }}
                />
            </div>
            )}

            {activeTab === 'Стороны' && (
              <CaseCardParties
                plaintiff={localCaseData.plaintiff}
                defendant={localCaseData.defendant}
                editingField={editingField}
                editValue={editValue}
                isSavingField={isSavingField}
                setEditValue={setEditValue}
                onEditStart={handleEditStart}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
              />
            )}

            {activeTab === 'Обжалование' && (
              <div className="space-y-4 pb-8">
                <CaseCardAppeals appeals={Array.isArray(localCaseData.appeals) ? localCaseData.appeals : []} />
              </div>
            )}

            {/* Вкладка Комментарии */}
            {activeTab === 'Комментарии' && (
              <CaseCardComments
                caseId={caseId}
                userId={userId}
                isAdded={isAdded}
                newCommentText={newCommentText}
                setNewCommentText={setNewCommentText}
                isSavingComment={isSavingComment}
                isLoadingHistory={isLoadingHistory}
                commentHistory={commentHistory}
                editingCommentId={editingCommentId}
                editingCommentText={editingCommentText}
                setEditingCommentId={setEditingCommentId}
                setEditingCommentText={setEditingCommentText}
                onAddComment={handleAddComment}
                onSaveEditedComment={handleSaveEditedComment}
                onRequestDeleteComment={(commentId) => {
                  setCommentToDelete(commentId);
                  setShowDeleteCommentConfirm(true);
                }}
                onOpenShareModal={() => setShowShareModal(true)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2 sm:gap-1.5 shrink-0 p-3 pt-2">
         {!isAdded && (
            <button
              onClick={onAddCase}
              disabled={isLoading}
              className={`col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-light text-white ${
                isLoading ? 'opacity-60 cursor-wait' : ''
              }`}
            >
              {isLoading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Scale className="w-3 h-3" /><span className="hidden sm:inline ml-1">Добавить</span></>
              )}
            </button>
          )}
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
${localCaseData.events && Array.isArray(localCaseData.events) && localCaseData.events.length > 0 ? `
                    <div class="section">
                      <h2>Движение дела</h2>
                      <table>
                        <tr><th>Дата</th><th>Время</th><th>Событие</th><th>Результат</th></tr>
                        ${(Array.isArray(localCaseData.events) ? localCaseData.events : []).map(e => `
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
${localCaseData.appeals && Array.isArray(localCaseData.appeals) && localCaseData.appeals.length > 0 ? `
                    <div class="section">
                      <h2>Обжалование</h2>
                      <table>
                        <tr><th>Тип</th><th>Дата</th><th>Заявитель</th><th>Суд</th><th>Результат</th></tr>
                        ${(Array.isArray(localCaseData.appeals) ? localCaseData.appeals : []).map(a => `
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
           className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
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
             onClick={() => setShowDeleteCaseConfirm(true)}
             className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400"
              title="Удалить"
            >
              <Trash2 className="w-3 h-3" />
            </button>
         )}
         {/* Кнопка добавления в Google Календарь - только для добавленных дел */}
         {isAdded && (
           <button
             onClick={handleAddToCalendar}
             className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
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
             className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400"
             title="Поделиться с юристом"
           >
             <Share2 className="w-3 h-3" />
             <span className="hidden sm:inline">Поделиться</span>
           </button>
         )}
         {/* Кнопка скрытия всегда видна если передан onDeleteCase и дело не добавлено */}
         {!isAdded && onDeleteCase && (
           <button
             onClick={() => setShowDeleteCaseConfirm(true)}
             className="col-span-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400"
             title="Скрыть из результатов"
           >
             <Trash2 className="w-3 h-3" />
             <span className="hidden sm:inline">Скрыть</span>
           </button>
         )}
       </div>

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
                <Link 
                  to="/monitoring" 
                  className="inline-block text-xs font-bold text-accent hover:underline"
                  onClick={() => setShowSourceWarning(false)}
                >
                  Подключить мониторинг →
                </Link>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSourceWarning(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl text-sm font-bold transition-all"
                >
                  Отмена
                </button>
                <a
                  href={localCaseData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all text-center flex items-center justify-center gap-2"
                >
                  Перейти
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
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
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-xl text-sm font-bold transition-all"
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
                  className="flex-1 bg-accent hover:bg-accent-light text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
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

      {/* Подтверждение удаления комментария */}
      <ConfirmModal
        isOpen={showDeleteCommentConfirm}
        title="Удалить комментарий?"
        message="Вы уверены, что хотите удалить этот комментарий? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={async () => {
          if (!commentToDelete) return;
          try {
            await caseComments.delete(commentToDelete);
            setCommentHistory(commentHistory.filter(cm => cm.id !== commentToDelete));
            showToast('Комментарий удалён');
          } catch (err) {
            showToast('Ошибка удаления', 'error');
          } finally {
            setShowDeleteCommentConfirm(false);
            setCommentToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteCommentConfirm(false);
          setCommentToDelete(null);
        }}
      />
      <ConfirmModal
        isOpen={showDeleteCaseConfirm}
        title={isAdded ? 'Удалить дело?' : 'Скрыть дело?'}
        message={
          isAdded
            ? `Вы уверены, что хотите удалить дело ${localCaseData.number}? Это действие нельзя отменить.`
            : `Вы уверены, что хотите скрыть дело ${localCaseData.number} из результатов?`
        }
        confirmText={isAdded ? 'Удалить' : 'Скрыть'}
        cancelText="Отмена"
        variant="danger"
        onConfirm={() => {
          onDeleteCase?.();
          setShowDeleteCaseConfirm(false);
        }}
        onCancel={() => setShowDeleteCaseConfirm(false)}
      />
    </div>
  );
}

export default CaseCard;
