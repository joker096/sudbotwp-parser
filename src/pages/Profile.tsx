import { useState, useEffect, useCallback, useRef } from 'react';
import { Scale, Star, MapPin, MessageCircle, ShieldCheck, Settings, LogOut, ChevronRight, User, Phone, X, Building, FileText, Calendar, Link as LinkIcon, Check, Loader2, Trash2, RotateCcw, CheckSquare, Square, ChevronLeft, ChevronRight as ChevronRightIcon, Clock, Bell, BellOff, Send, Eye, EyeOff, Info, Gavel, Hourglass, Pencil, Download, Globe, BookOpen } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { ParsedCase } from '../types';
import { useToast } from '../hooks/useToast';
import { cases, supabase, calendarEvents, refreshCase } from '../lib/supabase';
import CaseCard from '../components/CaseCard';
import PaymentModal from '../components/PaymentModal';
import { ConfirmModal, useConfirmModal } from '../components/ConfirmModal';
import EventModal from '../components/EventModal';
import NotificationSettings from '../components/NotificationSettings';
import SecuritySettings from '../components/SecuritySettings';
import CalendarSyncSettings from '../components/CalendarSyncSettings';
import { useSeo } from '../hooks/useSeo';
import SeoSettings from '../components/SeoSettings';
import AdminSettings from '../components/AdminSettings';

export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasProcessedParams = useRef(false);
  const eventTypesForFilter = [
    { id: 'hearing', label: 'Заседания', color: 'bg-blue-500', icon: Gavel },
    { id: 'deadline', label: 'Сроки', color: 'bg-red-500', icon: Hourglass },
    { id: 'reminder', label: 'Напоминания', color: 'bg-yellow-500', icon: Bell },
    { id: 'custom', label: 'Личные', color: 'bg-purple-500', icon: Pencil },
  ];

  const { setSeo } = useSeo('/profile');
  const [activeTab, setActiveTab] = useState('cases');
  const [selectedCase, setSelectedCase] = useState<ParsedCase | null>(null);
  const [userCases, setUserCases] = useState<ParsedCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Состояние для календаря
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('month');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventInitialDate, setNewEventInitialDate] = useState('');
  const [newEventInitialTime, setNewEventInitialTime] = useState('');
  // Состояние для пользовательских событий календаря (из Supabase)
  const [customEvents, setCustomEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [calendarFilters, setCalendarFilters] = useState<Set<string>>(new Set(eventTypesForFilter.map(t => t.id)));

  // Состояние для перетаскивания событий
  const [draggedEvent, setDraggedEvent] = useState<{ caseId: string; eventId: string; } | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);

  // Состояние для всплывающего окна с подробностями события
  const [selectedEventDetails, setSelectedEventDetails] = useState<{
    caseNumber: string;
    court: string;
    eventName: string;
    date: string;
    time: string;
    location: string;
    result: string;
  } | null>(null);

  // Состояние для подсказки в календаре
  const [hoveredEventDetails, setHoveredEventDetails] = useState<{
    details: {
        caseNumber: string;
        eventName: string;
        time: string;
    };
    x: number;
    y: number;
  } | null>(null);

  // Хуки - должны быть определены перед использованием
  const { user, profileData, logout, updateProfile } = useAuth();
  const { showToast } = useToast();
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
      setUserCases(cachedCases);
    }
  }, [cachedCases]);

  // Обновляем isLoading на основе isCasesLoading
  useEffect(() => {
    setIsLoading(isCasesLoading);
  }, [isCasesLoading]);
  const navigate = useNavigate();
  const { confirm, confirmModalProps } = useConfirmModal();
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);

  const handleEditEvent = (eventToEdit: any, caseId?: string) => {
    setEditingEvent({ ...eventToEdit, caseId }); // Store event and its parent caseId if it exists
    setShowAddEventModal(true);
  };

  // Обработчик двойного клика на дату в движении дела
  const handleDateDoubleClick = (dateStr: string, timeStr?: string) => {
    // Парсим дату из формата ДД.ММ.ГГГГ
    const dateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!dateMatch) {
      showToast('Некорректный формат даты');
      return;
    }

    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // Месяцы 0-11
    const year = parseInt(dateMatch[3], 10);
    const targetDate = new Date(year, month, day);

    // Переключаемся на вкладку календаря
    setActiveTab('calendar');
    setCalendarViewDate(targetDate);
    setSelectedCalendarDate(targetDate);

    // Форматируем дату для проверки событий (YYYY-MM-DD)
    const dateIsoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Проверяем есть ли события на эту дату
    setTimeout(() => {
      const caseEvents = userCases
        .filter(c => c.status !== 'deleted' && c.events)
        .flatMap(c => 
          (c.events || [])
            .filter(e => {
              const parts = e.date.split('.');
              if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}` === dateIsoStr;
              return false;
            })
        );

      const customEventsOnDate = customEvents.filter(e => {
        const parts = e.date.split('.');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}` === dateIsoStr;
        return e.event_date === dateIsoStr;
      });

      const hasEvents = caseEvents.length > 0 || customEventsOnDate.length > 0;

      if (!hasEvents) {
        // Если событий нет - открываем модальное окно для создания
        setNewEventInitialDate(dateIsoStr);
        setNewEventInitialTime(timeStr || '');
        setEditingEvent(null);
        setShowAddEventModal(true);
        showToast('На эту дату нет событий. Создайте новое событие.');
      } else {
        showToast(`На эту дату ${caseEvents.length + customEventsOnDate.length} событий`);
      }
    }, 100);
  };

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Профиль - Sud',
      description: 'Управление вашим профилем, делами и настройками на платформе Sud.',
      keywords: 'профиль, настройки, мои дела, уведомления',
      ogTitle: 'Профиль - Sud',
      ogDescription: 'Управляйте вашим профилем и делами на Sud.',
      noindex: true,
    });
  }, [setSeo]);

  // Обработка query-параметров для перехода в календарь (из CaseSearch)
  useEffect(() => {
    // Предотвращаем повторную обработку параметров
    if (hasProcessedParams.current) return;
    
    const tab = searchParams.get('tab');
    const date = searchParams.get('date');
    const time = searchParams.get('time');

    if (tab === 'calendar' && date) {
      // Валидируем формат даты YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        console.error('Invalid date format:', date);
        showToast('Некорректный формат даты в URL');
        hasProcessedParams.current = true;
        setSearchParams({});
        return;
      }

      // Парсим дату компонентно для избежания проблем с часовыми поясами
      const [year, month, day] = date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      
      // Проверяем валидность даты
      if (isNaN(targetDate.getTime()) || year < 2000 || year > 2100) {
        console.error('Invalid date value:', date);
        showToast('Некорректная дата');
        hasProcessedParams.current = true;
        setSearchParams({});
        return;
      }

      // Переключаемся на вкладку календаря
      setActiveTab('calendar');
      setCalendarViewDate(targetDate);
      setSelectedCalendarDate(targetDate);

      // Функция для проверки событий с ожиданием загрузки данных
      const checkEventsAndOpenModal = () => {
        const dateIsoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Проверяем события из дел
        const caseEvents = userCases
          .filter(c => c.status !== 'deleted' && c.events)
          .flatMap(c =>
            (c.events || [])
              .filter(e => {
                if (!e.date) return false;
                const parts = e.date.split('.');
                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}` === dateIsoStr;
                return false;
              })
          );

        // Проверяем пользовательские события
        const customEventsOnDate = customEvents.filter(e => {
          if (!e.date && !e.event_date) return false;
          if (e.event_date) return e.event_date === dateIsoStr;
          const parts = e.date?.split('.');
          if (parts?.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}` === dateIsoStr;
          return false;
        });

        const hasEvents = caseEvents.length > 0 || customEventsOnDate.length > 0;

        if (!hasEvents) {
          // Если событий нет - открываем модальное окно для создания
          setNewEventInitialDate(dateIsoStr);
          setNewEventInitialTime(time || '');
          setEditingEvent(null);
          setShowAddEventModal(true);
          showToast('На эту дату нет событий. Создайте новое событие.');
        } else {
          showToast(`На эту дату ${caseEvents.length + customEventsOnDate.length} событий`);
        }

        // Помечаем параметры как обработанные и очищаем URL
        hasProcessedParams.current = true;
        setSearchParams({}, { replace: true });
      };

      // Если данные еще не загружены - ждем
      if (isLoading || isLoadingEvents) {
        const checkInterval = setInterval(() => {
          if (!isLoading && !isLoadingEvents) {
            clearInterval(checkInterval);
            checkEventsAndOpenModal();
          }
        }, 100);

        // Таймаут на случай если загрузка зависла
        const timeoutId = setTimeout(() => {
          clearInterval(checkInterval);
          checkEventsAndOpenModal();
        }, 2000);

        return () => {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
        };
      } else {
        // Данные уже загружены - проверяем сразу
        checkEventsAndOpenModal();
      }
    }
  }, [searchParams, setSearchParams, userCases, customEvents, showToast, isLoading, isLoadingEvents]);

  // Загрузка пользовательских событий календаря из Supabase
  useEffect(() => {
    const loadCalendarEvents = async () => {
      if (user) {
        try {
          const { data, error } = await calendarEvents.getByUser(user.id);
          if (!error && data) {
            // Преобразуем формат из БД в формат для UI
            const formattedEvents = (data as any[]).map(event => ({
              id: event.id,
              title: event.title,
              name: event.title, // для совместимости с UI
              date: event.event_date.split('-').reverse().join('.'), // ДД.ММ.ГГГГ
              event_date: event.event_date, // ISO для сортировки
              time: event.event_time ? event.event_time.slice(0, 5) : '', // ЧЧ:ММ
              type: event.event_type,
              description: event.description,
              caseId: event.case_id,
              custom: true,
            }));
            setCustomEvents(formattedEvents);
          }
        } catch (err) {
          console.error('Error loading calendar events:', err);
        }
      }
      setIsLoadingEvents(false);
    };

    loadCalendarEvents();
  }, [user]);

  // Загрузка данных профиля в форму редактирования
  useEffect(() => {
    if (profileData) {
      setEditData({
        fullName: profileData.full_name || '',
        phone: profileData.phone || '',
      });
    }
  }, [profileData]);

  const favoriteLawyers = [
    { id: 1, name: 'Александр Смирнов', spec: 'Гражданские', city: 'Москва', rating: 4.9, reviews: 124, verified: true, img: 'https://picsum.photos/seed/lawyer1/200/200' },
    { id: 2, name: 'Елена Волкова', spec: 'Семейные', city: 'Санкт-Петербург', rating: 5.0, reviews: 89, verified: true, img: 'https://picsum.photos/seed/lawyer2/200/200' },
  ];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { error } = await updateProfile({
      full_name: editData.fullName,
      phone: editData.phone,
    });

    if (!error) {
      setIsEditing(false);
    } else {
      console.error('Failed to save profile:', error);
      // TODO: Show error toast to user
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleUpdateCase = async (updatedData: Partial<ParsedCase>) => {
    if (!selectedCase) return;

    const updatedCase = { ...selectedCase, ...updatedData };

    // Optimistic UI update
    setSelectedCase(updatedCase);
    setUserCases(userCases.map(c => c.id === updatedCase.id ? updatedCase : c));

    // Persist changes to the database
    // Note: `cases.updateCase` needs to be implemented in your Supabase helper.
    const { error } = await cases.updateCase(updatedCase.id, updatedData);
    if (error) {
      console.error("Failed to update case:", error);
      showToast('Ошибка: не удалось обновить данные');
    } else {
      showToast('Данные дела успешно обновлены!');
    }
  };

  const handleShowPaymentModal = useCallback(() => {
    setShowPaymentModal(true);
  }, []);

  const handleClosePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    console.log('PDF purchased from profile');
    showToast('Отчет скоро будет доступен для скачивания!');
  }, [showToast]);

  const brandingInfo = (user && profileData) ? {
    logoUrl: user.user_metadata?.avatar_url,
    name: profileData.full_name,
    phone: profileData.phone,
    email: user.email,
  } : null;

  // Открыть модальное окно подтверждения удаления
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
            setUserCases(prevCases =>
              prevCases.map(c => c.id === caseId ? { ...c, status: 'deleted' } : c)
            );
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

  const handleRestoreCase = async (caseId: string) => {
    try {
      // Assuming a new method cases.restoreCase exists
      const { error } = await cases.restoreCase(caseId);
      if (!error) {
        setUserCases(prevCases =>
          prevCases.map(c => c.id === caseId ? { ...c, status: 'active' } : c)
        );
        // Инвалидируем кеш для обновления данных
        queryClient.invalidateQueries({ queryKey: ['userCases', user?.id] });
        showToast('Дело восстановлено');
      }
    } catch (err) {
      console.error('Error restoring case:', err);
      showToast('Ошибка при восстановлении дела');
    }
  };

  // Обновление дела через повторный парсинг
  const handleRefreshCase = async (caseId: string) => {
    const caseToRefresh = userCases.find(c => c.id === caseId);
    if (!caseToRefresh) {
      console.error('Case not found:', caseId);
      return;
    }
    
    console.log('=== REFRESH CASE DEBUG ===');
    console.log('Case ID:', caseId);
    console.log('Case Link:', caseToRefresh.link);
    
    try {
      showToast('Обновление данных дела...');
      console.log('Calling refreshCase...');
      const { data, error } = await refreshCase(caseId, caseToRefresh.link);
      console.log('refreshCase result:', { data, error });
      
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
        
        // Инвалидируем кеш для обновления данных
        queryClient.invalidateQueries({ queryKey: ['userCases', user?.id] });
        
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

  // Массовое восстановление дел
  const handleBulkRestore = async () => {
    if (selectedCaseIds.size === 0) return;

    try {
      const idsToRestore = Array.from(selectedCaseIds);
      // Assuming cases.restoreMultipleCases exists
      const { error } = await cases.restoreMultipleCases(idsToRestore);
      if (!error) {
        setUserCases(prevCases =>
          prevCases.map(c =>
            idsToRestore.includes(c.id) ? { ...c, status: 'active' } : c
          )
        );
        setSelectedCaseIds(new Set());
        setIsSelectionMode(false);
        // Инвалидируем кеш для обновления данных
        queryClient.invalidateQueries({ queryKey: ['userCases', user?.id] });
        showToast(`Восстановлено ${idsToRestore.length} дел`);
      }
    } catch (err) {
      console.error('Error bulk restoring cases:', err);
      showToast('Ошибка при массовом восстановлении дел');
    }
  };

  // Переключение выбора дела
  const toggleCaseSelection = (caseId: string) => {
    setSelectedCaseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  // Выбрать все дела
  const selectAllCases = () => {
    const activeCases = userCases.filter(c => c.status !== 'deleted').map(c => c.id);
    setSelectedCaseIds(new Set(activeCases));
  };

  // Снять выбор со всех дел
  const deselectAllCases = () => {
    setSelectedCaseIds(new Set());
  };

  // Массовое удаление дел
  const handleBulkDelete = async () => {
    if (selectedCaseIds.size === 0) return;
    
    try {
      const idsToDelete = Array.from(selectedCaseIds);
      const { error } = await cases.deleteMultipleCases(idsToDelete);
      if (!error) {
        setUserCases(prevCases => prevCases.filter(c => !selectedCaseIds.has(c.id)));
        setSelectedCaseIds(new Set());
        setIsSelectionMode(false);
        // Инвалидируем кеш для обновления данных
        queryClient.invalidateQueries({ queryKey: ['userCases', user?.id] });
        showToast(`Удалено ${idsToDelete.length} дел`);
      }
    } catch (err) {
      console.error('Error bulk deleting cases:', err);
      showToast('Ошибка при массовом удалении дел');
    }
  };

  // Перетаскивание события в календаре
  const handleEventDrop = async (caseId: string, eventId: string, newDate: string) => {
    const caseToUpdate = userCases.find(c => c.id === caseId);
    if (!caseToUpdate || !caseToUpdate.events) return;

    const eventToUpdate = caseToUpdate.events.find((e: any) => e.id === eventId);
    if (!eventToUpdate) return;

    const formattedNewDate = newDate.split('-').reverse().join('.');
    if (eventToUpdate.date === formattedNewDate) return;

    const updatedEvents = caseToUpdate.events.map((e: any) => 
      e.id === eventId ? { ...e, date: formattedNewDate } : e
    );
    
    const originalCase = { ...caseToUpdate }; // Для отката в случае ошибки
    const updatedCase = { ...caseToUpdate, events: updatedEvents };

    // Оптимистичное обновление UI
    setUserCases(userCases.map(c => c.id === caseId ? updatedCase : c));
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(updatedCase);
    }

    // Сохранение в БД
    const { error } = await cases.updateCase(caseId, { events: updatedEvents });
    if (error) {
      setUserCases(userCases.map(c => c.id === caseId ? originalCase : c));
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase(originalCase);
      }
      showToast('Ошибка при переносе события');
    } else {
      showToast(`Событие "${eventToUpdate.name}" перенесено на ${formattedNewDate}`);
    }
  };

  const handleDeleteCustomEvent = (eventId: string) => {
    confirm({
      title: 'Удалить событие?',
      message: 'Вы уверены, что хотите удалить это пользовательское событие? Это действие нельзя отменить.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Удаляем из Supabase
          const { error } = await calendarEvents.delete(eventId);
          if (!error) {
            setCustomEvents(prev => prev.filter(e => e.id !== eventId));
            showToast('Событие удалено');
          } else {
            console.error('Error deleting event:', error);
            showToast('Ошибка при удалении события');
          }
        } catch (err) {
          console.error('Error deleting event:', err);
          showToast('Ошибка при удалении события');
        }
      },
    });
  };

  // Добавление нового события в календарь
  const handleSaveEvent = async (eventData: any) => {
    if (!eventData) {
      showToast('Заполните обязательные поля: Название и Дата.');
      return;
    }

    if (editingEvent) {
      // UPDATE LOGIC
      if (editingEvent.custom) {
        // Обновляем в Supabase
        try {
          const dateParts = eventData.date.split('.');
          const eventDate = dateParts.length === 3 
            ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` 
            : eventData.date;
          
          const { error } = await calendarEvents.update(editingEvent.id, {
            title: eventData.title || eventData.name,
            event_date: eventDate,
            event_time: eventData.time || null,
            event_type: eventData.type || 'custom',
            description: eventData.description || null,
          });
          
          if (!error) {
            setCustomEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventData, custom: true } : e));
            showToast('Пользовательское событие обновлено!');
          } else {
            console.error('Error updating event:', error);
            showToast('Ошибка при обновлении события');
          }
        } catch (err) {
          console.error('Error updating event:', err);
          showToast('Ошибка при обновлении события');
        }
      } else {
        // Update in userCases
        const caseId = editingEvent.caseId;
        const caseToUpdate = userCases.find(c => c.id === caseId);
        if (caseToUpdate) {
          const updatedEvents = (caseToUpdate.events || []).map((e: any) => e.id === editingEvent.id ? { ...e, ...eventData, custom: false } : e);
          
          const originalCase = { ...caseToUpdate };
          const updatedCase = { ...caseToUpdate, events: updatedEvents };

          setUserCases(userCases.map(c => c.id === caseId ? updatedCase : c));
          if (selectedCase && selectedCase.id === caseId) {
            setSelectedCase(updatedCase);
          }

          const { error } = await cases.updateCase(caseId, { events: updatedEvents });
          if (error) {
            setUserCases(userCases.map(c => c.id === caseId ? originalCase : c));
            if (selectedCase && selectedCase.id === caseId) {
              setSelectedCase(originalCase);
            }
            showToast('Ошибка обновления события в деле');
          } else {
            showToast('Событие в деле обновлено!');
          }
        }
      }
    } else {
      // CREATE LOGIC (for custom events) - сохранение в Supabase
      if (!user) {
        showToast('Для создания событий необходимо войти в систему');
        return;
      }
      
      try {
        const dateParts = eventData.date.split('.');
        const eventDate = dateParts.length === 3 
          ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` 
          : eventData.date;
        
        const { data, error } = await calendarEvents.create({
          user_id: user.id,
          title: eventData.title || eventData.name,
          event_date: eventDate,
          event_time: eventData.time || null,
          event_type: eventData.type || 'custom',
          description: eventData.description || null,
        });
        
        if (!error && data) {
          // Добавляем в локальный state с преобразованием формата
          const eventDataResponse = data as any;
          const newEvent = {
            id: eventDataResponse.id,
            title: eventDataResponse.title,
            name: eventDataResponse.title,
            date: eventDate.split('-').reverse().join('.'),
            event_date: eventDate,
            time: eventDataResponse.event_time ? eventDataResponse.event_time.slice(0, 5) : '',
            type: eventDataResponse.event_type,
            description: eventDataResponse.description,
            custom: true,
          };
          setCustomEvents(prev => [...prev, newEvent]);
          showToast('Событие добавлено в календарь!');
        } else {
          console.error('Error creating event:', error);
          showToast('Ошибка при создании события');
        }
      } catch (err) {
        console.error('Error creating event:', err);
        showToast('Ошибка при создании события');
      }
    }
    
    setShowAddEventModal(false);
    setEditingEvent(null);
  };

  const handleExportToIcs = () => {
    const caseEvents = userCases
      .filter(c => c.status !== 'deleted' && c.events && c.events.length > 0)
      .flatMap(c => c.events.map(e => ({ ...e, caseNumber: c.number, court: c.court })));
      
    const allCustomEvents = customEvents.map(e => ({
        ...e,
        caseNumber: 'Календарь',
        court: 'Личное событие'
    }));
    
    const allBaseEvents = [...caseEvents, ...allCustomEvents];

    // Expand all events including recurring ones
    const allOccurrences = allBaseEvents.flatMap(event => 
        expandEvents([event], { caseNumber: event.caseNumber, court: event.court })
    );

    // Helper function to generate ICS content
    const generateIcsContent = (eventsToExport: any[], userName: string): string => {
        let icsString = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sud.app//Calendar Export//RU
CALSCALE:GREGORIAN
NAME:Календарь дел (${userName})
X-WR-CALNAME:Календарь дел (${userName})
DESCRIPTION:События по судебным делам из Sud.app
`;

        const toIcsUtcString = (d: Date) => {
            return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        for (const event of eventsToExport) {
            if (!event.date) continue;

            const eventDate = new Date(event.date); // event.date is YYYY-MM-DD from expandEvents
            if (isNaN(eventDate.getTime())) continue;

            const time = event.time || '09:00';
            const [hours, minutes] = time.split(':');

            const startDateTimeUTC = new Date(Date.UTC(
                eventDate.getUTCFullYear(),
                eventDate.getUTCMonth(),
                eventDate.getUTCDate(),
                Number(hours),
                Number(minutes)
            ));
            
            const endDateTimeUTC = new Date(startDateTimeUTC.getTime() + (60 * 60 * 1000)); // 1 hour duration

            const uid = `${event.id}-${event.date}@sud.app`;
            const created = new Date().toISOString().replace(/[-:.]/g, '') + 'Z';
            const summary = `${event.name}: ${event.caseNumber || 'Личное'}`;
            const description = `Дело: ${event.caseNumber || 'Личное событие'}\\nСуд: ${event.court || ''}\\nСобытие: ${event.name}${event.time ? `\\nВремя: ${event.time}` : ''}`;
            const location = event.location || event.court || '';

            icsString += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${created}
DTSTART:${toIcsUtcString(startDateTimeUTC)}
DTEND:${toIcsUtcString(endDateTimeUTC)}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
`;
        }

        icsString += `END:VCALENDAR`;
        return icsString;
    };

    const icsContent = generateIcsContent(allOccurrences, profileData?.full_name || user?.email || 'Пользователь');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sud_calendar.ics");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Экспорт календаря начат...');
  };

  const expandEvents = (events: any[], caseInfo?: { caseNumber: string; court: string; }) => {
    return events.flatMap((event: any) => {
      const baseEvent = { ...event, ...caseInfo };
      const occurrences = [];
      const startDateParts = baseEvent.date.split('.');
      
      if (startDateParts.length !== 3) return [];

      const startDate = new Date(`${startDateParts[2]}-${startDateParts[1]}-${startDateParts[0]}`);
      if (isNaN(startDate.getTime())) return [];

      occurrences.push({
        ...baseEvent,
        date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
      });

      if (baseEvent.recurrence && baseEvent.recurrence.until) {
        const endDate = new Date(baseEvent.recurrence.until);
        let currentDate = new Date(startDate);

        while (true) {
          if (baseEvent.recurrence.frequency === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (baseEvent.recurrence.frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (baseEvent.recurrence.frequency === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          } else {
            break;
          }

          if (currentDate > endDate) break;

          occurrences.push({
            ...baseEvent,
            date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
            isOccurrence: true,
          });
        }
      }
      
      return occurrences;
    });
  };

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  return (
    <div className="space-y-6 transition-colors duration-300 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Профиль</h1>

      {/* User Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-6 transition-colors">
        <div className="relative group shrink-0">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              referrerPolicy="no-referrer"
              loading="lazy"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shadow-lg border-4 border-white dark:border-slate-800"
            />
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-accent/10 rounded-full flex items-center justify-center text-accent text-4xl font-bold border-4 border-white dark:border-slate-800">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          )}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute bottom-0 right-0 bg-slate-900 dark:bg-accent text-white p-2 rounded-full shadow-sm hover:bg-slate-800 dark:hover:bg-accent-light transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left">
          {isEditing ? (
            <div className="space-y-3 mb-4">
              <input 
                type="text"
                value={editData.fullName}
                onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                placeholder="Ваше ФИО"
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              <input 
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="Ваш телефон"
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
              />
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {profileData?.full_name || user?.email?.split('@')[0]}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">
                {user?.email}
              </p>
            </>
          )}
          
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4 text-slate-400" />
              {profileData?.is_legal_entity ? 'Юридическое лицо' : 'Физическое лицо'}
            </div>
            {profileData?.phone && !isEditing && (
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-slate-400" />
                {profileData.phone}
              </div>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <button onClick={handleSaveProfile} disabled={isSaving} className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Сохранить
            </button>
            <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold transition-colors">Отмена</button>
          </div>
        ) : (
          <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 mt-4 sm:mt-0">
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
        {[
          { id: 'cases', label: 'Мои дела', icon: Scale, count: userCases.filter(c => c.status !== 'deleted').length },
          { id: 'calendar', label: 'Календарь', icon: Calendar, count: null },
          { id: 'trash', label: 'Корзина', icon: Trash2, count: userCases.filter(c => c.status === 'deleted').length },
          { id: 'lawyers', label: 'Избранные юристы', icon: Star, count: favoriteLawyers.length },
          { id: 'settings', label: 'Настройки', icon: Settings, count: null },
          ...(profileData?.role === 'admin' ? [{ id: 'seo', label: 'Управление SEO', icon: Globe, count: null }] : []),
          ...(profileData?.role === 'admin' ? [{ id: 'admin', label: 'Админ', icon: Settings, count: null }] : []),
          ...(profileData?.role === 'admin' ? [{ id: 'blog', label: 'Блог', icon: BookOpen, count: null }] : [])
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => { setActiveTab(tab.id); setIsSelectionMode(false); setSelectedCaseIds(new Set()); }}
            className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-slate-900 dark:bg-accent text-white' 
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon && <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? '' : 'text-slate-400'}`} />}
            {tab.label}
            {tab.count !== null && (
              <span className={`px-2 py-0.5 rounded-md text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Панель массового удаления */}
      {activeTab === 'cases' && userCases.filter(c => c.status !== 'deleted').length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
          {isSelectionMode ? (
            <>
              <div className="flex items-center gap-3">
                <button 
                  onClick={selectedCaseIds.size === userCases.filter(c => c.status !== 'deleted').length ? deselectAllCases : selectAllCases}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-accent"
                >
                  {selectedCaseIds.size === userCases.filter(c => c.status !== 'deleted').length ? (
                    <><CheckSquare className="w-4 h-4" /> Снять выбор</>
                  ) : (
                    <><CheckSquare className="w-4 h-4" /> Выбрать все</>
                  )}
                </button>
                <span className="text-sm text-slate-500">
                  Выбрано: {selectedCaseIds.size}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedCaseIds.size === 0}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить выбранные
                </button>
                <button
                  onClick={() => { setIsSelectionMode(false); setSelectedCaseIds(new Set()); }}
                  className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setIsSelectionMode(true)}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              Выбрать дела для удаления
            </button>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'cases' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userCases.filter(c => c.status !== 'deleted').length > 0 ? (
              userCases.filter(c => c.status !== 'deleted').map(caseItem => (
                <div 
                  key={caseItem.id} 
                  className={`relative bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-lg transition-all border border-transparent dark:border-slate-800 cursor-pointer group ${isSelectionMode ? 'cursor-default' : ''}`}
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.stopPropagation();
                      toggleCaseSelection(caseItem.id);
                    } else {
                      setSelectedCase(caseItem);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    {isSelectionMode && (
                      <div className="mt-1">
                        {selectedCaseIds.has(caseItem.id) ? (
                          <CheckSquare className="w-5 h-5 text-accent shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 shrink-0" />
                        )}
                      </div>
                    )}
                    <div className="w-11 h-11 bg-gradient-to-br from-accent to-accent-light rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg shadow-accent/30">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-accent transition-colors">{caseItem.number}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mb-2">{caseItem.court}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {caseItem.category && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-medium">{caseItem.category}</span>
                        )}
                        {caseItem.status && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${caseItem.status?.includes('удовлетвор') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : caseItem.status?.includes('отказ') ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : caseItem.status?.includes('рассмотр') ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            {caseItem.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-medium">{caseItem.date}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefreshCase(caseItem.id);
                        }}
                        className="mt-1 p-1 text-slate-400 hover:text-accent transition-colors"
                        title="Обновить данные дела"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Кнопка быстрого удаления внизу карточки */}
                  {!isSelectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCase(caseItem.id);
                      }}
                      className="mt-3 w-full py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                      title="Удалить дело"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                <Scale className="w-12 h-12 text-slate-400" />
                <p className="text-sm font-bold">У вас пока нет добавленных дел</p>
                <Link to="/search" className="bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                  Найти и добавить дело
                </Link>
              </div>
            )}

          </div>
        )}

        {/* Вкладка Календарь */}
        {activeTab === 'calendar' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Календарь дел</h3>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportToIcs}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Экспорт .ics</span>
                  <span className="sm:hidden">Экспорт</span>
                </button>
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="bg-accent hover:bg-accent-light text-white px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Добавить событие</span>
                  <span className="sm:hidden">Добавить</span>
                </button>
              </div>
            </div>

            {/* Фильтры */}
            <div className="flex flex-wrap gap-2 mb-4">
              {eventTypesForFilter.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    setCalendarFilters(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(type.id)) {
                        newSet.delete(type.id);

                      } else {
                        newSet.add(type.id);
                      }
                      return newSet;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    calendarFilters.has(type.id)

                      ? 'bg-accent text-white'

                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${type.color}`}></span>
                  {type.label}
                </button>
              ))}
            </div>

            {/* Навигация по месяцам */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <h4 className="font-bold text-slate-900 dark:text-white">
                {calendarViewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </h4>
              <button
                onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <ChevronRightIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* Сетка календаря */}
            {(() => {
              const caseEvents = userCases
                .filter(c => c.status !== 'deleted' && c.events && c.events.length > 0)
                .flatMap(c => expandEvents(c.events || [], { caseNumber: c.number, court: c.court }));

              const allCustomEvents = expandEvents(customEvents);

              const allEvents = [...caseEvents, ...allCustomEvents];
              const allHearingData = allEvents.filter(event => calendarFilters.has(event.type || 'custom'));

              if (calendarViewMode === 'month') {
                return (
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                      <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                    {(() => {
                      const year = calendarViewDate.getFullYear();
                      const month = calendarViewDate.getMonth();
                      const firstDay = new Date(year, month, 1);
                      const lastDay = new Date(year, month + 1, 0);
                      const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                      const daysInMonth = lastDay.getDate();
                      const hearingDatesSet = new Set(allHearingData.map(h => h.date).filter(Boolean));
                      const days = [];
                      
                      for (let i = 0; i < startDay; i++) {
                        days.push(<div key={`empty-${i}`} className="h-20" />);
                      }
                      
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasHearing = hearingDatesSet.has(dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isSelected = selectedCalendarDate?.toISOString().split('T')[0] === dateStr;
                        const eventsOnThisDay = allHearingData.filter(h => h.date === dateStr);
                        const eventTypesOnThisDay = new Set(eventsOnThisDay.map(e => e.type || 'custom'));
                        
                        days.push(
                          <div
                            key={day}
                            onClick={() => setSelectedCalendarDate(new Date(year, month, day))}
                            onDoubleClick={() => {
                              const date = new Date(year, month, day);
                              const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                const eventsOnThisDay = allHearingData.filter(h => h.date === dateStr);

                                if (eventsOnThisDay.length === 1) {
                                  // If there's only one event, open it for editing.
                                  handleEditEvent(eventsOnThisDay[0], eventsOnThisDay[0].caseId);
                                } else {
                                  // Otherwise, open a new event modal with pre-filled date and time (if any).
                                  setNewEventInitialDate(dateString);
                                  setNewEventInitialTime(eventsOnThisDay[0]?.time || '');
                                  setEditingEvent(null);
                                  setShowAddEventModal(true);
                                }
                              }}
                            onDragOver={(e) => { e.preventDefault(); setDropTargetDate(dateStr); }}
                            onDragLeave={() => setDropTargetDate(null)}
                            onDrop={(e) => { e.preventDefault(); if (draggedEvent) { handleEventDrop(draggedEvent.caseId, draggedEvent.eventId, dateStr); } setDropTargetDate(null); }}
                            onMouseEnter={(e) => { if (hasHearing) { const eventDetails = allHearingData.find(h => h.date === dateStr); if (eventDetails) { const rect = e.currentTarget.getBoundingClientRect(); setHoveredEventDetails({ details: { caseNumber: eventDetails.caseNumber, eventName: eventDetails.name, time: eventDetails.time || 'не указано', }, x: rect.left + rect.width / 2, y: rect.top, }); } } }}
                            onMouseLeave={() => { setHoveredEventDetails(null); }}                            
                            className={`h-20 p-2 rounded-lg border cursor-pointer transition-all duration-200 ${ hasHearing ? 'bg-accent/10 border-accent/30 hover:bg-accent/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700' } ${isToday ? 'ring-2 ring-accent' : ''} ${isSelected ? 'ring-2 ring-purple-500' : ''} ${dropTargetDate === dateStr ? 'ring-2 ring-blue-500 bg-blue-500/10 scale-105' : 'scale-100'}`}
                          >
                            <span className={`text-sm font-bold ${hasHearing ? 'text-accent' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
                            {hasHearing && (
                              <div className="mt-1 flex items-center gap-1 flex-wrap">
                                {Array.from(eventTypesOnThisDay).map(type => {
                                  const typeInfo = eventTypesForFilter.find(f => f.id === type);
                                  const Icon = typeInfo?.icon;
                                  return Icon ? (
                                    <Icon key={type} className={`w-3 h-3 ${typeInfo?.color.replace('bg-', 'text-') || 'text-slate-400'}`} />
                                  ) : (
                                    <div key={type} className={`w-1.5 h-1.5 rounded-full ${eventTypesForFilter.find(f => f.id === type)?.color || 'bg-gray-400'}`}></div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return days;
                    })()}
                  </div>
                );
              } else { // Week view
                return (
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-1">
                    {(() => {
                      const startOfWeek = getStartOfWeek(calendarViewDate);
                      const weekDays = [];
                      for (let i = 0; i < 7; i++) {
                          const day = new Date(startOfWeek);
                          day.setDate(startOfWeek.getDate() + i);
                          weekDays.push(day);
                      }

                      return weekDays.map(day => {
                          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                          const isToday = new Date().toISOString().split('T')[0] === dateStr;
                          const eventsOnThisDay = allHearingData.filter(h => h.date === dateStr);

                          return (
                              <div 
                                  key={dateStr}                                   className={`p-3 rounded-lg border min-h-[200px] transition-all duration-200 ${isToday ? 'bg-accent/5 border-accent/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'} ${dropTargetDate === dateStr ? 'ring-2 ring-blue-500 bg-blue-500/10 scale-[1.02]' : 'scale-100'}`}
                                  onDragOver={(e) => { e.preventDefault(); setDropTargetDate(dateStr); }}
                                  onDragLeave={() => setDropTargetDate(null)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedEvent) {
                                      handleEventDrop(draggedEvent.caseId, draggedEvent.eventId, dateStr);
                                    }
                                    setDropTargetDate(null);
                                  }}
                              >
                                  <div className="flex items-center justify-between mb-3">
                                      <span className={`font-bold text-sm ${isToday ? 'text-accent' : 'text-slate-700 dark:text-slate-300'}`}>{day.getDate()}</span>
                                      <span className="text-xs text-slate-500">{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                                  </div>
                                  <div className="space-y-2">
                                      {eventsOnThisDay.length > 0 ? (
                                          eventsOnThisDay.map(event => {
                                            const eventTypeInfo = eventTypesForFilter.find(f => f.id === (event.type || 'custom'));
                                            const Icon = eventTypeInfo?.icon;
                                            return (
                                              <div 
                                                  key={event.id}
                                                  draggable={!event.custom}                                                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; !event.custom && setDraggedEvent({ caseId: event.caseId, eventId: event.id }); }}
                                                  onDragEnd={() => setDraggedEvent(null)}
                                                  onClick={() => !event.custom && setSelectedCase(userCases.find(c => c.id === event.caseId) || null)}
                                                  onMouseEnter={(e) => {
                                                      const rect = e.currentTarget.getBoundingClientRect();
                                                      setHoveredEventDetails({
                                                          details: {
                                                              caseNumber: event.caseNumber,
                                                              eventName: event.name,
                                                              time: event.time || 'не указано',
                                                          },
                                                          x: rect.left + rect.width / 2,
                                                          y: rect.top,
                                                      });
                                                  }}
                                                  onMouseLeave={() => {
                                                      setHoveredEventDetails(null);
                                                  }}
                                                  className={`p-2 bg-white dark:bg-slate-900 rounded-lg cursor-grab hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-l-4 ${eventTypeInfo?.color.replace('bg-', 'border-') || 'border-slate-400'} ${draggedEvent?.eventId === event.id ? 'opacity-50 scale-95' : ''}`}
                                              >
                                                  <div className="flex items-start gap-2">
                                                      {Icon && <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${eventTypeInfo?.color.replace('bg-', 'text-') || 'text-slate-400'}`} />}
                                                      <div className="flex-1 min-w-0">
                                                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={event.name}>{event.name}</p>
                                                          <p className="text-[10px] text-slate-500 truncate" title={event.caseNumber}>{event.caseNumber}</p>
                                                      </div>
                                                  </div>
                                                  {event.time && <p className="text-[10px] text-accent font-mono text-right mt-1">{event.time}</p>}
                                              </div>
                                          )})
                                      ) : (
                                          <div className="h-full"></div>
                                      )}
                                  </div>
                              </div>
                          );
                      });
                    })()}
                  </div>
                );
              }
            })()}

            {/* Список дел на выбранную дату */}
            {calendarViewMode === 'month' && selectedCalendarDate && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <h4 className="font-bold text-slate-900 dark:text-white mb-3">
                  {selectedCalendarDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </h4>
                {(() => {
                  const selectedDateStr = selectedCalendarDate.toISOString().split('T')[0];
                  
                  const caseEventsOnDate = userCases
                    .filter(c => c.status !== 'deleted' && c.events)
                    .flatMap(c => 
                        (c.events || [])
                            .filter(e => {
                                const parts = e.date.split('.');
                                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}` === selectedDateStr;
                                return false;
                            })
                            .map(e => ({ ...e, caseId: c.id, caseNumber: c.number, court: c.court, custom: false }))
                    );

                  const customEventsOnDate = expandEvents(customEvents)
                    .filter(e => e.date === selectedDateStr)
                    .map(e => ({ ...e, custom: true }));

                  const allEventsOnDateRaw = [...caseEventsOnDate, ...customEventsOnDate];
                  const allEventsOnDate = allEventsOnDateRaw.filter(event => calendarFilters.has(event.type || 'custom'));

                  if (allEventsOnDate.length === 0) {
                    return <p className="text-sm text-slate-500">Нет событий на эту дату</p>;
                  }
                  
                  return (
                    <div className="space-y-2">
                      {allEventsOnDate.map(event => {
                          const eventTypeInfo = eventTypesForFilter.find(f => f.id === (event.type || 'custom'));
                          const Icon = eventTypeInfo?.icon;
                          return (
                          <div 
                            key={event.id}
                            draggable={!event.custom}
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; !event.custom && setDraggedEvent({ caseId: event.caseId, eventId: event.id }); }}
                            onDragEnd={() => setDraggedEvent(null)}
                            className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg cursor-grab hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 ${
                              draggedEvent?.eventId === event.id ? 'opacity-50 scale-95 shadow-lg' : 'shadow-sm'
                            }`}
                          >
                            {Icon ? <Icon className={`w-4 h-4 ${eventTypeInfo?.color.replace('bg-', 'text-') || 'text-slate-400'} shrink-0`} /> : <Clock className="w-4 h-4 text-accent shrink-0" />}
                            <div className="flex-1 min-w-0" onClick={() => !event.custom && setSelectedCase(userCases.find(c => c.id === event.caseId) || null)}>
                              <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{event.caseNumber}</p>
                              <p className="text-xs text-slate-500 truncate">{event.name}</p>
                            </div>
                            {event.time && (
                              <span className="text-xs text-slate-400 shrink-0 font-medium">{event.time}</span>
                            )}
                            {event.custom && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCustomEvent(event.id); }}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                title="Удалить событие"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleEditEvent(event, event.caseId); }} className="p-1.5 text-slate-400 hover:text-accent rounded-lg transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          );
                      })},
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trash' && (
        <>
          {userCases.filter(c => c.status === 'deleted').length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-4">
              {isSelectionMode ? (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const deletedCasesIds = userCases.filter(c => c.status === 'deleted').map(c => c.id);
                        if (selectedCaseIds.size === deletedCasesIds.length) {
                          setSelectedCaseIds(new Set());
                        } else {
                          setSelectedCaseIds(new Set(deletedCasesIds));
                        }
                      }}
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-accent"
                    >
                      {selectedCaseIds.size === userCases.filter(c => c.status === 'deleted').length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      Выбрать все
                    </button>
                    <span className="text-sm text-slate-500">Выбрано: {selectedCaseIds.size}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkRestore}
                      disabled={selectedCaseIds.size === 0}
                      className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Восстановить
                    </button>
                    <button onClick={() => setIsSelectionMode(false)} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors">Отмена</button>
                  </div>
                </>
              ) : (
                <button onClick={() => setIsSelectionMode(true)} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                  <CheckSquare className="w-4 h-4" />
                  Выбрать дела для восстановления
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {userCases.filter(c => c.status === 'deleted').length > 0 && !isSelectionMode && (
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: 'Очистить корзину',
                      message: 'Вы уверены, что хотите удалить все дела из корзины? Это действие нельзя отменить.',
                      confirmText: 'Очистить',
                      cancelText: 'Отмена',
                      variant: 'danger',
                      onConfirm: async () => {
                        try {
                          const deletedCases = userCases.filter(c => c.status === 'deleted');
                          const idsToDelete = deletedCases.map(c => c.id);
                          const { error } = await cases.deleteMultipleCases(idsToDelete, true);
                          if (!error) {
                            setUserCases(prevCases => prevCases.filter(c => c.status !== 'deleted'));
                            showToast('Корзина очищена');
                          }
                        } catch (err) {
                          console.error('Error clearing trash:', err);
                          showToast('Ошибка при очистке корзины');
                        }
                      },
                    });
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Очистить корзину
                </button>
              </div>
            )}
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userCases.filter(c => c.status === 'deleted').length > 0 ? (
              userCases.filter(c => c.status === 'deleted').map(caseItem => (
                <div
                  key={caseItem.id}
                  onClick={() => isSelectionMode && toggleCaseSelection(caseItem.id)}
                  className={`bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 transition-colors ${isSelectionMode ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {isSelectionMode ? (
                      selectedCaseIds.has(caseItem.id) ? (
                        <CheckSquare className="w-5 h-5 text-accent shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 shrink-0" />
                      )
                    ) : (
                      <Trash2 className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm truncate">{caseItem.number}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{caseItem.court}</p>
                    </div>
                  </div>
                  {!isSelectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreCase(caseItem.id);
                      }}
                      className="flex items-center gap-2 text-accent text-sm font-bold hover:underline shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Восстановить
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                <Trash2 className="w-12 h-12 text-slate-400" />
                <p className="text-sm font-bold">Корзина пуста</p>
              </div>
            )}
          </div>
        </>
        )}

        {activeTab === 'lawyers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {favoriteLawyers.map(lawyer => (
              <div key={lawyer.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col gap-4 border border-transparent dark:border-slate-800 transition-colors">
                <div className="flex gap-4">
                  <div className="relative shrink-0">
                    <img src={lawyer.img} alt={lawyer.name} referrerPolicy="no-referrer" loading="lazy" className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                    {lawyer.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-0.5 rounded-full shadow-sm">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1">
                      {lawyer.name}
                    </h3>
                    <p className="text-xs text-primary font-semibold mb-1.5">{lawyer.spec}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-accent fill-accent" /> {lawyer.rating}</span>
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {lawyer.city}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-bold transition-colors">
                    Профиль
                  </button>
                  <button className="flex-1 bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Написать
                  </button>
                </div>
              </div>
            ))}
            <Link to="/lawyers" className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[150px]">
              <Star className="w-6 h-6" />
              <span className="text-sm font-bold">Найти юриста</span>
            </Link>
          </div>
        )}

        {activeTab === 'seo' && profileData?.role === 'admin' && (
          <SeoSettings />
        )}

        {activeTab === 'admin' && profileData?.role === 'admin' && (
          <AdminSettings />
        )}

        {activeTab === 'blog' && profileData?.role === 'admin' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 transition-colors space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Управление блогом</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Создавайте и редактируйте статьи блога</p>
              </div>
            </div>
            <div className="flex gap-4">
              <a
                href="/admin/blog"
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Список статей
              </a>
              <a
                href="/admin/blog/new"
                className="flex-1 bg-accent hover:bg-accent-light text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Создать статью
              </a>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800 transition-colors space-y-6">
            <div>
              <NotificationSettings profileData={profileData} updateProfile={updateProfile} user={user} />

            </div>


            {/* Безопасность */}
            <SecuritySettings />

            {/* Синхронизация с календарем */}
            <CalendarSyncSettings profileData={profileData} updateProfile={updateProfile} user={user} />
          </div>
        )}
      </div>

      {/* Case Details Modal - используем CaseCard с вкладками */}
      <AnimatePresence>
        {selectedCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCase(null)}>
            <div className="relative w-full max-w-2xl max-h-[90vh] flex" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedCase(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <CaseCard
                key={selectedCase.id}
                caseData={selectedCase}
                isAdded={true}
                isLoading={false}
                onAddCase={() => {}}
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
        caseData={selectedCase}
        onSuccess={handlePaymentSuccess}
        userEmail={user?.email}
        branding={brandingInfo}
      />

      <ConfirmModal {...confirmModalProps} />

      {/* Подсказка для календаря */}
      <AnimatePresence>
        {hoveredEventDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: hoveredEventDetails.y,
              left: hoveredEventDetails.x,
              transform: 'translate(-50%, -105%)',
            }}
            className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl z-[100] w-60 pointer-events-none border border-slate-200 dark:border-slate-700"
          >
            <p className="text-xs font-bold text-slate-800 dark:text-white truncate mb-1">{hoveredEventDetails.details.caseNumber}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Событие: <span className="font-bold text-slate-800 dark:text-white">{hoveredEventDetails.details.eventName}</span></p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Время: <span className="font-bold text-slate-800 dark:text-white">{hoveredEventDetails.details.time}</span></p>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white dark:border-t-slate-800"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Всплывающее окно с подробностями события */}
      <AnimatePresence>
        {selectedEventDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEventDetails(null)}
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
                  <Calendar className="w-5 h-5 text-accent" />
                  Детали заседания
                </h3>
                <button
                  onClick={() => setSelectedEventDetails(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Номер дела</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedEventDetails.caseNumber}</p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Суд</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedEventDetails.court}</p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Событие</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedEventDetails.eventName}</p>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Дата</p>
                    <p className="font-bold text-slate-900 dark:text-white">{selectedEventDetails.date}</p>
                  </div>
                  {selectedEventDetails.time && (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Время</p>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedEventDetails.time}</p>
                    </div>
                  )}
                </div>
                
                {selectedEventDetails.location && (
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Место</p>
                    <p className="font-bold text-slate-900 dark:text-white">{selectedEventDetails.location}</p>
                  </div>
                )}
                
                {selectedEventDetails.result && (
                  <div className="bg-accent/10 p-4 rounded-xl border border-accent/20">
                    <p className="text-[10px] text-accent font-bold uppercase tracking-wider mb-1">Результат</p>
                    <p className="font-bold text-accent">{selectedEventDetails.result}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedCase(userCases.find(c => c.number === selectedEventDetails.caseNumber) || null);
                    setSelectedEventDetails(null);
                  }}
                  className="flex-1 bg-accent hover:bg-accent-light text-white py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  Открыть дело
                </button>
                <button
                  onClick={() => setSelectedEventDetails(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EventModal
        isOpen={showAddEventModal}
        onClose={() => {
          setShowAddEventModal(false);
          setEditingEvent(null);
          setNewEventInitialDate('');
          setNewEventInitialTime('');
        }}
        onSave={handleSaveEvent}
        eventToEdit={editingEvent}
        initialDate={newEventInitialDate}
        initialTime={newEventInitialTime}
      />
    </div>
  );
}
