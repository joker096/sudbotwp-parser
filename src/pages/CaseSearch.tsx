import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Scale, ChevronRight, Loader2, Link as LinkIcon, Building, User, Calendar, FileText, CheckCircle2, Clock, MapPin, AlertCircle, Gavel, Download, Pencil, X, Trash2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { parseCase, cases } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import ManualCaseEntryForm from '../components/ManualCaseEntryForm';
import { ParsedCase } from '../types';
import CaseCard from '../components/CaseCard';
import PaymentModal from '../components/PaymentModal';
import { useSeo } from '../hooks/useSeo';
import { ConfirmModal, useConfirmModal } from '../components/ConfirmModal';
import { normalizeParsedCase } from '../lib/caseNormalization';
import { useUserCases } from '../hooks/useUserCases';
import { useCaseActions } from '../hooks/useCaseActions';
import { apiConfig } from '../lib/apiConfig';

export default function CaseSearch() {
  const { setSeo } = useSeo('/search');
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedCase, setParsedCase] = useState<{ data: ParsedCase; comment: string } | null>(null);
  const [selectedCase, setSelectedCase] = useState<ParsedCase | null>(null);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualData, setManualData] = useState({
    number: '',
    court: 'Всеволожский городской суд Ленинградской области',
    category: '',
    judge: '',
    date: '',
    hearingDate: '',
    status: '',
    plaintiff: '',
    defendant: '',
    link: ''
  });

  const { user, profileData } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { confirm, confirmModalProps } = useConfirmModal();
  const { data: userCases = [], isLoading: isLoadingCases } = useUserCases(user?.id);
  const { addCase, archiveCase, deleteCase, refreshUserCase, updateComment } = useCaseActions(user?.id);

  useEffect(() => {
    if (!selectedCase?.id) return;
    const freshSelectedCase = userCases.find((caseItem) => caseItem.id === selectedCase.id);
    if (!freshSelectedCase) {
      setSelectedCase(null);
      return;
    }
    if (freshSelectedCase !== selectedCase) {
      setSelectedCase(freshSelectedCase);
    }
  }, [selectedCase, userCases]);

  // Обработчик двойного клика на дату - переход в календарь
  const handleDateDoubleClick = (dateStr: string, timeStr?: string) => {
    // Парсим дату из формата ДД.ММ.ГГГГ
    const dateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!dateMatch) {
      showToast('Некорректный формат даты');
      return;
    }

    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const year = parseInt(dateMatch[3], 10);
    const dateIsoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Переходим в профиль с параметрами для открытия календаря на конкретной дате
    navigate(`/profile?tab=calendar&date=${dateIsoStr}&time=${timeStr || ''}`);
    showToast('Переход в календарь...');
  };

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Поиск судебных дел - Sud',
      description: 'Найдите и отслеживайте судебные дела по номеру или ссылке. Мониторинг судебных дел в РФ.',
      keywords: 'поиск суд, судебные дела, мониторинг дел, суд рф, номер дела',
      ogTitle: 'Поиск судебных дел - Sud',
      ogDescription: 'Найдите и отслеживайте судебные дела онлайн.',
    });
  }, [setSeo]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
      // Directly call search with the new query
      handleSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    if (query && !parsedCase) {
      handleSearch(query);
    }
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery) return;
    
    setIsLoading(true);
    setParsedCase(null);
    setIsAdded(false);
    setError(null);
    
    parseCase(searchQuery)
      .then(({ data, error }) => {
        setIsLoading(false);
        
        if (error) {
          // Display specific error messages based on error type
          if (error.message.includes('URL is required') || error.message.includes('Invalid URL format')) {
            setError('Пожалуйста, введите корректную ссылку на дело');
          } else if (error.message.includes('Connection refused')) {
            setError(error.message); // Показываем специфичное сообщение об ошибке
          } else if (error.message.includes('недоступны') || error.message.includes('временно')) {
            setError(error.message); // Сайты судов недоступны
          } else if (error.message.includes('Превышен таймаут') || error.message.includes('медленно')) {
            setError('Судный сайт работает очень медленно. Попробуйте повторить запрос через несколько минут или скопируйте ссылку и откройте её в другом браузере.');
          } else if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
            setError('Не удалось получить данные о деле. Проверьте, что ссылка существует');
          } else if (error.message.includes('Network') || error.message.includes('503')) {
            setError('Ошибка соединения. Проверьте интернет-соединение и попробуйте снова');
          } else {
            setError(`Ошибка при парсинге дела: ${error.message}`);
          }
        } else if (data) {
          setParsedCase({ data: normalizeParsedCase(data as ParsedCase), comment: (data as any).comment || '' });
        } else {
          setError('Не удалось распознать данные о деле');
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setError('Произошла ошибка при запросе');
        console.error('Error parsing case:', err);
      });
  }, []);

      const handleAddCase = async () => {
        if (!user || !parsedCase) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
          // Проверяем, не существует ли уже это дело у пользователя
          const { data: existingCases } = await cases.getCasesByUser(user.id);
          const caseNumber = parsedCase.data.number?.toLowerCase().trim();
          const exists = existingCases?.some(c => c.number?.toLowerCase().trim() === caseNumber);
          
          if (exists) {
            setError('Это дело уже есть в Моих делах');
            setIsLoading(false);
            return;
          }
          
          const { data, error } = await addCase({
            userId: user.id,
            caseData: parsedCase.data,
            comment: parsedCase.comment || '',
          });
          
          if (error) {
            setError(error.message);
          } else {
            setIsAdded(true);
            showToast('Дело добавлено в Мои дела');
            
            // Сбрасываем состояние для нового поиска
            setTimeout(() => {
              setParsedCase(null);
              setIsAdded(false);
              setQuery('');
              setError(null);
            }, 1500);
          }
        } catch (err) {
          setError('Произошла ошибка при добавлении дела');
          console.error('Error adding case:', err);
        } finally {
          setIsLoading(false);
        }
      };

  const handleUpdateCase = async (updatedData: Partial<ParsedCase>) => {
    // Обновляем локальное состояние
    if (parsedCase) {
      setParsedCase({ ...parsedCase, data: { ...parsedCase.data, ...updatedData }, ...(updatedData.comment !== undefined ? { comment: updatedData.comment || '' } : {}) });
    }
    
    // Если это существующее дело (selectedCase), сохраняем в базу
    if (selectedCase && updatedData.comment !== undefined) {
      try {
        const { error } = await updateComment(selectedCase.id, updatedData.comment);
        
        if (error) {
          console.error('Error saving comment:', error);
          showToast('Ошибка сохранения комментария');
          return;
        }
        
        // Обновляем selectedCase
        setSelectedCase({ ...selectedCase, comment: updatedData.comment });
        showToast('Комментарий сохранён');
      } catch (err) {
        console.error('Error saving comment:', err);
        showToast('Ошибка сохранения комментария');
      }
    } else if (parsedCase) {
      showToast('Комментарий сохранён локально');
    }
  };

  const handleDeleteCase = (caseId: string) => {
    confirm({
      title: 'Удалить дело',
      message: 'Вы уверены, что хотите удалить это дело? Его можно будет восстановить из корзины.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
      onConfirm: async () => {
        try {
            const { error } = await deleteCase(caseId);
            if (!error) {
              setSelectedCase(null);
              showToast('Дело перемещено в корзину');
            }
        } catch (err) {
          console.error('Error deleting case:', err);
          showToast('Ошибка при удалении дела');
        }
      },
    });
  };

  const handleArchiveCase = (caseId: string) => {
    confirm({
      title: 'Архивировать дело',
      message: 'Дело будет перемещено в архив. Вы сможете восстановить его позже.',
      confirmText: 'Архивировать',
      cancelText: 'Отмена',
      onConfirm: async () => {
        try {
            const { error } = await archiveCase(caseId);
            if (!error) {
              setSelectedCase(null);
              showToast('Дело архивировано');
            }
        } catch (err) {
          console.error('Error archiving case:', err);
          showToast('Ошибка при архивировании');
        }
      },
    });
  };

  const handleRefreshCase = async (caseId: string) => {
    const caseToRefresh = userCases.find(c => c.id === caseId);
    if (!caseToRefresh?.link) {
      showToast('У дела нет ссылки для обновления');
      return;
    }
    
    showToast('Обновление данных дела...');
    const { data, error, normalizedCase } = await refreshUserCase(caseId, caseToRefresh);
    
    if (error) {
      showToast('Ошибка при обновлении: ' + error.message);
    } else if (data && normalizedCase) {
      if (selectedCase?.id === caseId) {
        setSelectedCase(normalizedCase);
      }
      showToast('Дело обновлено');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const handleManualSubmit = useCallback(async () => {
    if (!manualData.number || !manualData.link) {
      setError('Пожалуйста, заполните номер дела и ссылку');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(apiConfig.manualCaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create case');
      }
      
      const data = await response.json();
      setParsedCase(data);
      setShowManualEntry(false);
    } catch (err: any) {
      setError('Ошибка при создании дела');
      console.error('Error creating case:', err);
    } finally {
      setIsLoading(false);
    }
  }, [manualData]);

  const handleShowPaymentModal = useCallback(() => {
    setShowPaymentModal(true);
  }, []);

  const handleClosePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    console.log('PDF purchased');
  }, []);

  const brandingInfo = (user && profileData) ? {
    logoUrl: user.user_metadata?.avatar_url,
    name: profileData.full_name,
    phone: profileData.phone,
    email: user.email,
  } : null;

  return (
    <div className="space-y-6 transition-colors duration-300 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Поиск и добавление дел</h1>
      </div>

      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Вставьте ссылку на дело (sudrf.ru, mos-sud.ru) или номер..." 
          className="w-full bg-white dark:bg-slate-900 py-4 pl-12 pr-16 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
        />
        <button 
          onClick={() => handleSearch(query)}
          className="absolute right-2 bg-accent text-white p-2.5 rounded-xl shadow-lg shadow-accent/30 hover:bg-accent-light transition-colors flex items-center justify-center"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
        </button>
      </div>

      {/* Кнопка ручного ввода дела */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent transition-colors"
        >
          {showManualEntry ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          {showManualEntry ? 'Отмена' : 'Ввести дело вручную'}
        </button>
      </div>

      {/* Форма ручного ввода */}
      <AnimatePresence>
        {showManualEntry && (
          <ManualCaseEntryForm
            manualData={manualData}
            setManualData={setManualData}
            onSubmit={handleManualSubmit}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>

        <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          </motion.div>
        )}
        {parsedCase ? (
          <div className="relative w-full max-h-[85vh] flex">
            <CaseCard 
              caseData={parsedCase!.data} 
              caseId={null}
              isAdded={isAdded}
              isLoading={isLoading}
              onAddCase={handleAddCase}
              onUpdateCase={handleUpdateCase}
              onCommentSaved={undefined}
              onShowPaymentModal={handleShowPaymentModal}
              onDateDoubleClick={handleDateDoubleClick}
              userId={user?.id}
            />
          </div>
        ) : (
          <motion.div 
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Мои дела</h2>
            </div>
            {isLoadingCases ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center gap-4 animate-pulse">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : userCases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-lg transition-all border border-transparent dark:border-slate-800 cursor-pointer group overflow-hidden"
                    onClick={() => setSelectedCase(caseItem)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-accent to-accent-light rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg shadow-accent/30">
                        <Scale className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm md:text-base mb-0.5 truncate group-hover:text-accent transition-colors">{caseItem.number}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{caseItem.court}</p>
                        {caseItem.updated_at && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5" title="Дата обновления">
                            Обновл: {new Date(caseItem.updated_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Scale className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400">У вас пока нет сохранённых дел</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно с карточкой дела */}
      <AnimatePresence>
        {selectedCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-full sm:max-w-2xl max-h-[90vh] flex" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedCase(null)}
                className="absolute -top-2 -right-2 sm:top-4 sm:right-4 z-[60] p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <CaseCard
                key={selectedCase.id}
                caseData={selectedCase}
                caseId={selectedCase.id}
                isAdded={true}
                isLoading={isLoading}
                onAddCase={handleAddCase}
                onUpdateCase={handleUpdateCase}
                onCommentSaved={undefined}
                onShowPaymentModal={handleShowPaymentModal}
                onDeleteCase={() => handleDeleteCase(selectedCase.id)}
                onRefreshCase={() => handleRefreshCase(selectedCase.id)}
                onArchiveCase={() => handleArchiveCase(selectedCase.id)}
                onDateDoubleClick={handleDateDoubleClick}
                userId={user?.id}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={handleClosePaymentModal}
        caseData={parsedCase?.data || null}
        onSuccess={handlePaymentSuccess}
        userEmail={user?.email}
        branding={brandingInfo}
      />

      <ConfirmModal {...confirmModalProps} />
    </div>
  );
}
