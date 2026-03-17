import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Scale, Users, Calculator, BookOpen, Star, Plus, Link as LinkIcon, ArrowRight, ChevronLeft, ChevronRight, X, Trash2, ExternalLink, RotateCcw, Loader2, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdBanner from '../components/AdBanner';
import { supabase, cases, refreshCase, parseCase } from '../lib/supabase';
import { ParsedCase } from '../types';
import CaseCard from '../components/CaseCard';
import { useSeo } from '../hooks/useSeo';
import { useAuth } from '../hooks/useAuth';
import PaymentModal from '../components/PaymentModal';
import { useToast } from '../hooks/useToast';
import { ConfirmModal, useConfirmModal } from '../components/ConfirmModal';

export default function Home() {
  const navigate = useNavigate();
  const { setSeo } = useSeo('/');
  const { showToast } = useToast();
  const { user, profileData } = useAuth();
  
  // Установка SEO мета тегов для главной страницы
  useEffect(() => {
    setSeo({
      title: 'Отслеживание судебных дел онлайн - Мониторинг дел в судах РФ',
      description: 'Отслеживайте судебные дела в режиме онлайн. Поиск по базе судов РФ, мониторинг дел, уведомления о новых событиях.',
      keywords: 'суд, мониторинг, судебные дела, поиск судов, РФ',
      ogTitle: 'Отслеживание судебных дел онлайн - Мониторинг дел в судах РФ',
      ogDescription: 'Отслеживайте судебные дела в режиме онлайн. Поиск по базе судов РФ. Мониторинг дел, уведомления о новых событиях.',
    });
  }, [setSeo]);
  const [searchQuery, setSearchQuery] = useState('');
  const [caseUrl, setCaseUrl] = useState('');
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [userCases, setUserCases] = useState<ParsedCase[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCase, setSelectedCase] = useState<ParsedCase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const casesPerPage = 6;
  const { confirm, confirmModalProps } = useConfirmModal();
  const queryClient = useQueryClient();

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

  // Fetch user's cases on mount
  useEffect(() => {
    const fetchUserCases = async () => {
      setIsLoadingCases(true);
      try {
        if (user) {
          console.log('Fetching user cases...');
          const { data, error } = await cases.getCasesByUser(user.id);
          if (data && !error) {
            // Фильтруем только активные дела (не удалённые)
            const activeCases = (data as ParsedCase[]).filter(c => c.status !== 'deleted');
            setUserCases(activeCases);
          }
        }
      } catch (err) {
        console.error('Error fetching cases:', err);
      } finally {
        setIsLoadingCases(false);
      }
    };
    fetchUserCases();
  }, [user]);

  const totalPages = Math.ceil(userCases.length / casesPerPage);
  const paginatedCases = userCases.slice(currentPage * casesPerPage, (currentPage + 1) * casesPerPage);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Если в запросе есть цифры, предполагаем, что это номер дела
    if (/\d/.test(searchQuery)) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/lawyers?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleTrackCase = async () => {
    if (!caseUrl.trim()) return;
    
    // Если пользователь не авторизован - перенаправляем на страницу поиска
    if (!user) {
      navigate(`/search?q=${encodeURIComponent(caseUrl)}`);
      return;
    }
    
    setIsLoadingCase(true);
    try {
      showToast('Поиск дела...');
      
      // Парсим дело напрямую
      const { data, error } = await parseCase(caseUrl);
      
      if (error) {
        console.error('Error parsing case:', error);
        if (error.message.includes('URL is required') || error.message.includes('Invalid URL format')) {
          showToast('Пожалуйста, введите корректную ссылку на дело');
        } else if (error.message.includes('Connection refused') || error.message.includes('Network') || error.message.includes('503')) {
          showToast('Сервер временно недоступен. Попробуйте позже.');
        } else if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
          showToast('Не удалось найти дело. Проверьте ссылку.');
        } else {
          showToast(error.message || 'Ошибка при поиске дела');
        }
        return;
      }
      
      if (!data) {
        showToast('Не удалось получить данные о деле');
        return;
      }
      
      // Проверяем, не существует ли уже это дело
      const { data: existingCases } = await cases.getCasesByUser(user.id);
      const caseNumber = data.number?.toLowerCase().trim();
      const exists = existingCases?.some((c: ParsedCase) => c.number?.toLowerCase().trim() === caseNumber);
      
      if (exists) {
        showToast('Это дело уже есть в Моих делах');
        return;
      }
      
      // Сохраняем дело
      const { data: newCase, error: createError } = await cases.createCase({
        user_id: user.id,
        ...data,
      });
      
      if (createError) {
        console.error('Error creating case:', createError);
        showToast('Ошибка при сохранении дела');
        return;
      }
      
      showToast('Дело успешно добавлено в Мои дела!');
      
      // Инвалидируем кеш для обновления списка дел
      queryClient.invalidateQueries({ queryKey: ['userCases', user.id] });
      
      // Обновляем локальное состояние
      if (newCase) {
        setUserCases(prev => [{
          ...data,
          id: newCase.id,
          status: 'active',
          events: data.events || [],
          appeals: data.appeals || [],
        }, ...prev]);
      }
      
      // Очищаем поле ввода
      setCaseUrl('');
      
    } catch (err) {
      console.error('Error adding case:', err);
      showToast('Произошла ошибка при добавлении дела');
    } finally {
      setIsLoadingCase(false);
    }
  };

  const handleShowPaymentModal = useCallback(() => {
    setShowPaymentModal(true);
  }, []);

  const handleClosePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    console.log('PDF purchased from home');
    showToast('Отчет скоро будет доступен для скачивания!');
  }, [showToast]);

  const brandingInfo = (user && profileData) ? {
    logoUrl: user.user_metadata?.avatar_url,
    name: profileData.full_name,
    phone: profileData.phone,
    email: user.email,
  } : null;

  // Проверка: может ли пользователь использовать ручную проверку дела
  // Доступно для админов и пользователей с оплаченным планом (basic или premium)
  const canManualRefresh = user && profileData && (
    profileData.role === 'admin' || 
    profileData.subscription_tier === 'basic' || 
    profileData.subscription_tier === 'premium'
  );

  // Обновление дела через повторный парсинг
  const handleRefreshCase = async (caseId: string) => {
    const caseToRefresh = userCases.find(c => c.id === caseId);
    if (!caseToRefresh) {
      console.error('Case not found:', caseId);
      return;
    }
    
    try {
      showToast('Обновление данных дела...');
      const { data, error } = await refreshCase(caseId, caseToRefresh.link);
      
      if (error) {
        console.error('Error refreshing case:', error);
        showToast(error.message || 'Ошибка при обновлении дела');
        return;
      }
      
      if (data) {
        // Обновляем локальное состояние
        const updatedCase = {
          ...caseToRefresh,
          ...data,
          events: typeof data.events === 'string' ? JSON.parse(data.events) : data.events || [],
          appeals: typeof data.appeals === 'string' ? JSON.parse(data.appeals) : data.appeals || [],
        };
        
        setUserCases(prevCases =>
          prevCases.map(c => c.id === caseId ? updatedCase : c)
        );
        
        if (selectedCase && selectedCase.id === caseId) {
          setSelectedCase(updatedCase);
        }
        
        showToast('Дело успешно обновлено!');
      } else {
        console.warn('No data returned from refreshCase');
        showToast('Не удалось получить данные о деле');
      }
    } catch (err) {
      console.error('Error refreshing case (catch):', err);
      showToast('Ошибка при обновлении дела');
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
          const { error } = await cases.deleteCase(caseId);
          if (!error) {
            // Меняем статус на удалённый вместо полного удаления
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

  const categories = [
    { id: 'cases', name: 'Дела', icon: Scale, active: true, link: '/search' },
    { id: 'lawyers', name: 'Юристы', icon: Users, active: false, link: '/lawyers' },
    { id: 'calc', name: 'Пошлины', icon: Calculator, active: false, link: '/calculator' },
    { id: 'blog', name: 'Блог', icon: BookOpen, active: false, link: '/blog' },
  ];

  const topLawyers = [
    { id: 1, name: 'Александр С.', spec: 'Гражданское право', rating: 4.9, img: 'https://picsum.photos/seed/lawyer1/200/200', price: 'от 5000 ₽' },
    { id: 2, name: 'Елена В.', spec: 'Семейное право', rating: 5.0, img: 'https://picsum.photos/seed/lawyer2/200/200', price: 'от 3000 ₽' },
    { id: 3, name: 'Дмитрий И.', spec: 'Уголовное право', rating: 4.8, img: 'https://picsum.photos/seed/lawyer3/200/200', price: 'от 7000 ₽' },
  ];

  return (
    <div className="space-y-8 md:space-y-12 transition-colors duration-300">
      
      {/* H1 и SEO-блок с описанием сервиса */}
      <section className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-700 transition-colors duration-300">
        <h1 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white mb-3 md:mb-4 leading-tight">
          Мониторинг судебных дел онлайн — отслеживайте дела в судах РФ
        </h1>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
          Сервис для автоматического отслеживания судебных дел в режиме реального времени.
          Получайте мгновенные уведомления о новых событиях, следите за изменениями статусов дел
          и управляйте всеми процессами в одном месте.
        </p>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Link to="/search" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Поиск по всем судам</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Найдите любое дело по номеру или ссылке</p>
          </Link>
          <Link to="/monitoring" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-3">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Автоматический мониторинг</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Система отслеживает изменения 24/7</p>
          </Link>
          <Link to="/lawyers" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">База юристов</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Найдите проверенного специалиста</p>
          </Link>
          <Link to="/calculator" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-3">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Калькулятор пошлин</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Рассчитайте госпошлину за минуту</p>
          </Link>
        </div>
      </section>

      {/* Hero Banner Image - Telegram Bot Interface */}
      <div className="w-full overflow-hidden rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-700">
        <img 
          src="https://lh3.googleusercontent.com/pw/AP1GczN7QF3mMXeel62r3mfhQzkX6rIiJ8EM0bnCG3GamxG16L7umRNIjTqs2YRdLT_TKMKQEmgTh6nqGs48JzwdThtFAcOlBb6n4n5CiWUS4zOR-tA3xgE=s0" 
          alt="Интерфейс Telegram бота для мониторинга судебных дел - отслеживайте дела в мессенджере" 
          className="w-full h-auto object-cover"
          loading="eager"
        />
      </div>

      {/* Add Case Section */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Добавить дело</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Вставьте ссылку на дело (sudrf.ru, mos-sud.ru) или номер</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={caseUrl}
              onChange={(e) => setCaseUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrackCase()}
              placeholder="https://sudrf.ru/..." 
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
            />
          </div>
          <button 
            onClick={handleTrackCase}
            disabled={isLoadingCase}
            className="bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light disabled:opacity-50 text-white px-8 py-4 rounded-2xl text-sm font-bold transition-colors shadow-sm shrink-0 flex items-center gap-2"
          >
            {isLoadingCase ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isLoadingCase ? 'Добавление...' : 'Отслеживать'}
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex items-center max-w-3xl">
        <Search className="absolute left-4 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск дел, юристов..." 
          className="w-full bg-white dark:bg-slate-900 py-4 md:py-5 pl-12 pr-16 rounded-2xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm md:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
        />
        <button type="submit" className="absolute right-2 md:right-3 bg-accent text-white p-2.5 md:p-3.5 rounded-xl md:rounded-2xl shadow-lg shadow-accent/30 hover:bg-accent-light transition-colors">
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </form>

      {/* Categories */}
      <div>
        <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white mb-4 md:mb-6">Категории</h2>
        <div className="flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto sm:overflow-visible scrollbar-hide pb-2 -mx-6 px-6 sm:mx-0 sm:px-0">
          {categories.map(cat => (
            <Link to={cat.link} key={cat.id} className={`flex flex-col items-center justify-center gap-2 sm:gap-3 shrink-0 w-20 sm:w-auto py-3 sm:py-6 px-2 sm:px-4 sm:rounded-[2rem] sm:bg-white dark:sm:bg-slate-900 sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:sm:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all ${cat.active ? 'sm:ring-2 sm:ring-accent' : 'opacity-80 hover:opacity-100'}`}>
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.25rem] sm:rounded-2xl flex items-center justify-center shadow-sm transition-colors ${cat.active ? 'bg-accent text-white shadow-accent/30 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                <cat.icon className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <span className={`text-xs sm:text-sm font-bold ${cat.active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Lawyers */}
      <div>
        <div className="flex justify-between items-end mb-4 md:mb-6">
          <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">Топ юристы</h2>
          <Link to="/lawyers" className="text-accent text-sm md:text-base font-bold hover:underline">Все</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {topLawyers.map(lawyer => (
            <div key={lawyer.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative hover:shadow-lg transition-all border border-transparent dark:border-slate-800">
              <img src={lawyer.img} alt={lawyer.name} referrerPolicy="no-referrer" className="w-full h-32 sm:h-48 object-cover rounded-2xl mb-4 shadow-sm" />
              <div className="absolute top-6 sm:top-8 left-6 sm:left-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 text-accent fill-accent" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{lawyer.rating}</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg mb-1">{lawyer.name}</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">{lawyer.spec}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{lawyer.price}</span>
                <button className="bg-slate-900 dark:bg-slate-800 text-white p-2 sm:px-4 sm:py-2 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-bold">Написать</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Native Ad Banner */}
      <AdBanner />

      {/* Recent Cases */}
      <div>
        <div className="flex justify-between items-end mb-4 md:mb-6">
          <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">Мои дела</h2>
          {userCases.length > casesPerPage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {isLoadingCases ? (
          <div className="grid md:grid-cols-2 gap-4">
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="relative bg-white dark:bg-slate-900 p-3 md:p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-lg transition-all border border-transparent dark:border-slate-800 cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedCase(caseItem)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-accent to-accent-light rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg shadow-accent/30">
                      <Scale className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm md:text-base mb-0.5 truncate group-hover:text-accent transition-colors">{caseItem.number}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{caseItem.court}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {caseItem.category && (
                          <span className="text-[9px] md:text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-medium max-w-[150px] md:max-w-none truncate">{caseItem.category}</span>
                        )}
                        {caseItem.status && (
                          <span className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap truncate max-w-[120px] md:max-w-none ${caseItem.status?.includes('удовлетвор') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : caseItem.status?.includes('отказ') ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : caseItem.status?.includes('рассмотр') ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            {caseItem.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{caseItem.date}</span>
                      {caseItem.updated_at && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium" title="Дата обновления">
                          Обновл: {new Date(caseItem.updated_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {canManualRefresh ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshCase(caseItem.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-accent dark:hover:text-accent transition-colors"
                          title="Обновить данные дела"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div
                          className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                          title="Функция доступна для админов и пользователей с подпиской Бизнес или Премиум"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <a 
                        href={caseItem.link}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-accent dark:hover:text-accent transition-colors"
                        title="Открыть в суде"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  {/* Кнопка удаления - компактная справа внизу */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCase(caseItem.id);
                    }}
                    className="absolute bottom-3 right-3 p-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 rounded-lg transition-all"
                    title="Удалить дело"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-bold"
                >
                  Предыдущая
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                        currentPage === i
                          ? 'bg-accent text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-bold"
                >
                  Следующая
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl text-center border border-slate-100 dark:border-slate-800">
            <Scale className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">У вас пока нет сохранённых дел</p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 text-accent font-bold hover:underline"
            >
              Найти дело <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Модальное окно с карточкой дела */}
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
              caseData={selectedCase}
              isAdded={true}
              isLoading={false}
              onAddCase={() => {}}
              onUpdateCase={() => {}}
              onShowPaymentModal={handleShowPaymentModal}
              onDeleteCase={() => handleDeleteCase(selectedCase.id)}
              onRefreshCase={() => handleRefreshCase(selectedCase.id)}
            />
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handleClosePaymentModal}
        caseData={selectedCase}
        onSuccess={handlePaymentSuccess}
        userEmail={user?.email}
        branding={brandingInfo}
      />

      {/* SEO-блок с дополнительной информацией */}
      <section className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Почему стоит использовать наш сервис мониторинга дел
        </h2>
        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed space-y-4">
          <p>
            <strong>Отслеживание судебных дел</strong> — это важная задача для юристов, предпринимателей и граждан,
            участвующих в судебных процессах. Наш сервис автоматизирует этот процесс, экономя ваше время и обеспечивая
            своевременное получение информации об изменениях в делах.
          </p>
          <p>
            Мы работаем с открытыми базами данных судов Российской Федерации, включая ГАС «Правосудие» и региональные
            системы судов общей юрисдикции, арбитражных судов и мировых судей. Просто добавьте ссылку на дело или
            введите его номер — система автоматически найдет всю необходимую информацию и начнет мониторинг.
          </p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-2">
            Ключевые преимущества сервиса
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Экономия времени.</strong> Больше не нужно вручную проверять сайты судов — мы делаем это за вас
              и мгновенно уведомляем о новых событиях в деле.
            </li>
            <li>
              <strong>Удобное хранилище.</strong> Все ваши дела собраны в одном месте с быстрым доступом к карточкам,
              документам и истории изменений.
            </li>
            <li>
              <strong>Мгновенные уведомления.</strong> Получайте оповещения о новых заседаниях, решениях суда и других
              важных событиях в режиме реального времени.
            </li>
            <li>
              <strong>Интеграция с календарем.</strong> Синхронизируйте судебные заседания с Google Calendar,
              чтобы ничего не пропустить.
            </li>
          </ul>
          <p>
            Сервис подходит для индивидуальных предпринимателей, юридических компаний, корпоративных юристов и
            частных лиц. Начните использовать систему мониторинга прямо сейчас — просто добавьте первое дело
            и оцените удобство автоматического отслеживания.
          </p>
        </div>
      </section>

      <ConfirmModal {...confirmModalProps} />
    </div>
  );
}
