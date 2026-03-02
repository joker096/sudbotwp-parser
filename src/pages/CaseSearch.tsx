import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Scale, ChevronRight, Loader2, Link as LinkIcon, Building, User, Calendar, FileText, CheckCircle2, Clock, MapPin, AlertCircle, Gavel, Download, Pencil, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { parseCase, cases, refreshCase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import ManualCaseEntryForm from '../components/ManualCaseEntryForm';
import { ParsedCase } from '../types';
import CaseCard from '../components/CaseCard';
import PaymentModal from '../components/PaymentModal';
import { useSeo } from '../hooks/useSeo';
import { ConfirmModal, useConfirmModal } from '../components/ConfirmModal';

export default function CaseSearch() {
  const { setSeo } = useSeo('/search');
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedCase, setParsedCase] = useState<ParsedCase | null>(null);
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
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userCases, setUserCases] = useState<ParsedCase[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const { confirm, confirmModalProps } = useConfirmModal();

  // Кеширование списка дел с помощью React Query
  const { data: cachedCases, isLoading: isCasesLoading, refetch: refetchCases } = useQuery({
    queryKey: ['userCases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await cases.getCasesByUser(user.id);
      if (error) throw error;
      return (data || []).map((c: ParsedCase) => ({
        ...c,
        status: c.status || 'active',
        events: c.events?.map((e: any, index: number) => ({ ...e, id: e.id || `${c.id}-evt-${index}` }))
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 минут
    gcTime: 1000 * 60 * 10, // 10 минут
    enabled: !!user,
  });

  // Синхронизация кешированных данных с локальным состоянием
  useEffect(() => {
    if (cachedCases) {
      const activeCases = (cachedCases as ParsedCase[]).filter(c => c.status !== 'deleted');
      setUserCases(activeCases);
    }
  }, [cachedCases]);

  // Обновляем isLoading на основе isCasesLoading
  useEffect(() => {
    setIsLoadingCases(isCasesLoading);
  }, [isCasesLoading]);

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

  // Fetch user's cases on mount if no search query
  useEffect(() => {
    const fetchUserCases = async () => {
      if (user) {
        setIsLoadingCases(true);
        const { data, error } = await cases.getCasesByUser(user.id);
        if (data && !error) {
          const activeCases = (data as ParsedCase[]).filter(c => c.status !== 'deleted');
          setUserCases(activeCases);
        }
        setIsLoadingCases(false);
      } else {
        setIsLoadingCases(false);
      }
    };
    if (!query) fetchUserCases();
  }, [user, query]);

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
          setParsedCase(data);
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
      const caseNumber = parsedCase.number?.toLowerCase().trim();
      const exists = existingCases?.some(c => c.number?.toLowerCase().trim() === caseNumber);
      
      if (exists) {
        setError('Это дело уже есть в Моих делах');
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await cases.createCase({
        user_id: user.id,
        ...parsedCase,
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

  const handleUpdateCase = (updatedData: Partial<ParsedCase>) => {
    if (!parsedCase) return;
    // Update local state. The changes will be saved when the user clicks "Add Case".
    setParsedCase({ ...parsedCase, ...updatedData });
    showToast('Изменения сохранены локально');
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
          const { error } = await cases.deleteCase(caseId);
          if (!error) {
            setUserCases(userCases.map(c => c.id === caseId ? { ...c, status: 'deleted' } : c).filter(c => c.status !== 'deleted'));
            setSelectedCase(null);
            // Инвалидируем кеш для обновления данных
            queryClient.invalidateQueries({ queryKey: ['userCases', user?.id] });
            showToast('Дело перемещено в корзину');
          }
        } catch (err) {
          console.error('Error deleting case:', err);
          showToast('Ошибка при удалении дела');
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
    const { data, error } = await refreshCase(caseId, caseToRefresh.link);
    
    if (error) {
      showToast('Ошибка при обновлении: ' + error.message);
    } else if (data) {
      setUserCases(userCases.map(c => c.id === caseId ? { ...c, ...data } : c));
      if (selectedCase?.id === caseId) {
        setSelectedCase({ ...selectedCase, ...data });
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
      const response = await fetch('http://localhost:3000/add-case-manual', {
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
              caseData={parsedCase}
              isAdded={isAdded}
              isLoading={isLoading}
              onAddCase={handleAddCase}
              onUpdateCase={handleUpdateCase}
              onShowPaymentModal={handleShowPaymentModal}
              onDateDoubleClick={handleDateDoubleClick}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCase(null)}>
            <div className="relative w-full max-w-full sm:max-w-2xl max-h-[90vh] flex" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedCase(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <CaseCard
                key={selectedCase.id}
                caseData={selectedCase}
                isAdded={userCases.some(c => c.id === selectedCase.id)}
                isLoading={isLoading}
                onAddCase={handleAddCase}
                onUpdateCase={handleUpdateCase}
                onShowPaymentModal={handleShowPaymentModal}
                onDeleteCase={() => handleDeleteCase(selectedCase.id)}
                onRefreshCase={() => handleRefreshCase(selectedCase.id)}
                onDateDoubleClick={handleDateDoubleClick}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={handleClosePaymentModal}
        caseData={parsedCase}
        onSuccess={handlePaymentSuccess}
        userEmail={user?.email}
        branding={brandingInfo}
      />

      <ConfirmModal {...confirmModalProps} />
    </div>
  );
}
