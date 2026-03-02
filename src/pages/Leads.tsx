import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Clock, Briefcase, Filter, Search,
  Eye, Lock, CheckCircle, X, ChevronDown, Phone, Mail,
  AlertTriangle, TrendingUp, CreditCard, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { leads, leadPurchases, Lead, LeadPurchase } from '../lib/supabase';

// Иконка рубля
function RubleIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      aria-hidden="true"
    >
      <line x1="12" x2="12" y1="2" y2="22"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}

// Типы для отображения
const caseTypeLabels: Record<string, string> = {
  civil: 'Гражданское',
  criminal: 'Уголовное',
  family: 'Семейное',
  arbitration: 'Арбитраж',
  administrative: 'Административное',
  other: 'Другое',
};

const urgencyLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Низкая', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Средняя', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Срочно', color: 'bg-red-100 text-red-700' },
};

const urgencyOrder = { high: 0, medium: 1, low: 2 };

export default function Leads() {
  // SEO
  const { setSeo } = useSeo();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    setSeo({
      title: 'Лиды юридических дел | Sud — платформа для поиска клиентов',
      description: 'Покупайте готовые лиды юридических дел. База проверенных клиентов, нуждающихся в юридической помощи. Быстрый старт для юристов и адвокатов.',
      keywords: 'лиды юридические, клиенты для юристов, база клиентов, юридические дела, заявки на юридическую помощь',
    });
  }, [setSeo]);

  const [searchParams] = useSearchParams();
  const [purchasedLeads, setPurchasedLeads] = useState<Map<string, LeadPurchase>>(new Map());

  // Кеширование списка лидов с помощью React Query
  const { data: leadsList = [], isLoading: loading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await leads.getAvailable();
      if (error) {
        console.error('Error loading leads:', error);
        return getDemoLeads();
      }
      return data && data.length > 0 ? data : getDemoLeads();
    },
    staleTime: 1000 * 60 * 5, // 5 минут
    gcTime: 1000 * 60 * 10, // 10 минут
  });
  const [activeTab, setActiveTab] = useState<'available' | 'purchased'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCaseType, setFilterCaseType] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  
  // Модальное окно покупки
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  
  // Модальное окно контактов
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactData, setContactData] = useState<{name: string; phone: string; email: string | null} | null>(null);
  const [revealingContact, setRevealingContact] = useState(false);


  // Демо данные для разработки
  const getDemoLeads = (): Lead[] => [
    {
      id: '1',
      client_name: 'Алексей Петров',
      client_phone: '+7 (999) 111-22-33',
      client_email: 'alexey@example.com',
      region: 'Москва',
      case_type: 'civil',
      case_description: 'Спор с застройщиком по качеству квартиры. Застройщик не выполняет обязательства по договору долевого участия. Нужна консультация по взысканию неустойки.',
      budget: '50 000-100 000',
      urgency: 'high',
      status: 'new',
      price: 1500,
      priority: 10,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      client_name: 'Мария Сидорова',
      client_phone: '+7 (999) 222-33-44',
      client_email: 'maria@example.com',
      region: 'Санкт-Петербург',
      case_type: 'family',
      case_description: 'Раздел имущества после развода. Квартира, купленная в браке, машина. Нужна помощь в подготовке документов и переговорах.',
      budget: '30 000-50 000',
      urgency: 'medium',
      status: 'new',
      price: 750,
      priority: 5,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      client_name: 'Иван Иванов',
      client_phone: '+7 (999) 333-44-55',
      client_email: 'ivan@example.com',
      region: 'Казань',
      case_type: 'arbitration',
      case_description: 'Взыскание долга с контрагента. Долг 450 000 рублей по договору поставки. Есть акт сверки, но должник не платит.',
      budget: '100 000+',
      urgency: 'high',
      status: 'new',
      price: 2500,
      priority: 15,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      client_name: 'Елена Козлова',
      client_phone: '+7 (999) 444-55-66',
      client_email: 'elena@example.com',
      region: 'Новосибирск',
      case_type: 'civil',
      case_description: 'ДТП - возмещение ущерба. Виновник ДТП не хочет добровольно возмещать ущерб. Нужна помощь в подготовке иска.',
      budget: 'до 10 000',
      urgency: 'low',
      status: 'new',
      price: 500,
      priority: 2,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      client_name: 'Сергей Смирнов',
      client_phone: '+7 (999) 555-66-77',
      client_email: 'sergey@example.com',
      region: 'Москва',
      case_type: 'criminal',
      case_description: 'Защита по уголовному делу. Человека обвиняют в мошенничестве. Нужна срочная консультация и защита на допросе.',
      budget: '100 000+',
      urgency: 'high',
      status: 'new',
      price: 3000,
      priority: 20,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '6',
      client_name: 'Ольга Новикова',
      client_phone: '+7 (999) 666-77-88',
      client_email: 'olga@example.com',
      region: 'Екатеринбург',
      case_type: 'administrative',
      case_description: 'Обжалование штрафа ГИБДД. Штраф выписан ошибочно, есть видеозапись, подтверждающая невиновность.',
      budget: 'до 10 000',
      urgency: 'medium',
      status: 'new',
      price: 400,
      priority: 3,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Фильтрация лидов (используем leadsList из кеша)
  const filteredLeads = leadsList.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.case_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.region?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCaseType = !filterCaseType || lead.case_type === filterCaseType;
    const matchesUrgency = !filterUrgency || lead.urgency === filterUrgency;
    const matchesRegion = !filterRegion || lead.region?.toLowerCase().includes(filterRegion.toLowerCase());
    const matchesMinPrice = !filterMinPrice || lead.price >= parseInt(filterMinPrice);
    
    return matchesSearch && matchesCaseType && matchesUrgency && matchesRegion && matchesMinPrice;
  }).sort((a, b) => {
    // Сортировка по цене (высокие вверху)
    if (b.price !== a.price) return b.price - a.price;
    // Затем по срочности
    return urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
  });

  // Обработчик покупки
  const handlePurchase = async () => {
    if (!selectedLead) return;
    
    setPurchasing(true);
    
    // Имитация покупки (в реальности - оплата через платёжную систему)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Добавляем в купленные
    const mockPurchase: LeadPurchase = {
      id: `purchase-${Date.now()}`,
      lead_id: selectedLead.id,
      lawyer_id: 'demo-lawyer',
      price: selectedLead.price,
      payment_status: 'paid',
      payment_method: 'demo',
      contact_revealed: true,
      revealed_at: new Date().toISOString(),
      status: 'new',
      client_feedback: null,
      is_useful: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setPurchasedLeads(prev => new Map(prev).set(selectedLead.id, mockPurchase));
    
    setPurchasing(false);
    setPurchaseSuccess(true);
    setContactData({
      name: selectedLead.client_name,
      phone: selectedLead.client_phone,
      email: selectedLead.client_email,
    });
    
    // Инвалидируем кеш лидов после покупки
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    
    // Закрываем и показываем контакты
    setTimeout(() => {
      setShowPurchaseModal(false);
      setShowContactModal(true);
      setPurchaseSuccess(false);
    }, 2000);
  };

  // Обработчик раскрытия контактов для ранее купленного лида
  const handleRevealContact = (lead: Lead) => {
    setSelectedLead(lead);
    setRevealingContact(true);
    
    setTimeout(() => {
      setContactData({
        name: lead.client_name,
        phone: lead.client_phone,
        email: lead.client_email,
      });
      setShowContactModal(true);
      setRevealingContact(false);
    }, 1000);
  };

  // Форматирование цены
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  // Форматирование времени
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Только что';
    if (hours < 24) return `${hours} ч. назад`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Лиды
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Доступные заявки от клиентов
          </p>
        </div>
        
        {/* Stats */}
        <div className="flex gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Доступно</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {filteredLeads.length}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Куплено</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {purchasedLeads.size}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'available'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Доступные
        </button>
        <button
          onClick={() => setActiveTab('purchased')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'purchased'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Мои лиды ({purchasedLeads.size})
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по описанию, региону или имени..."
            className="w-full bg-white dark:bg-slate-900 py-4 pl-12 pr-16 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2 p-2.5 rounded-xl transition-colors ${
              showFilters
                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    Тип дела
                  </label>
                  <select
                    value={filterCaseType}
                    onChange={(e) => setFilterCaseType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white"
                  >
                    <option value="">Все</option>
                    {Object.entries(caseTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    Срочность
                  </label>
                  <select
                    value={filterUrgency}
                    onChange={(e) => setFilterUrgency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white"
                  >
                    <option value="">Любая</option>
                    <option value="high">Срочно</option>
                    <option value="medium">Средняя</option>
                    <option value="low">Низкая</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    Мин. цена
                  </label>
                  <select
                    value={filterMinPrice}
                    onChange={(e) => setFilterMinPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white"
                  >
                    <option value="">Любая</option>
                    <option value="1000">от 1 000 ₽</option>
                    <option value="2000">от 2 000 ₽</option>
                    <option value="3000">от 3 000 ₽</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    Регион
                  </label>
                  <input
                    type="text"
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                    placeholder="Город..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <button
                    onClick={() => {
                      setFilterCaseType('');
                      setFilterUrgency('');
                      setFilterMinPrice('');
                      setFilterRegion('');
                    }}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Сбросить
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Лиды не найдены</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredLeads.map((lead) => {
            const isPurchased = purchasedLeads.has(lead.id);
            const purchase = purchasedLeads.get(lead.id);
            
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left: Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${urgencyLabels[lead.urgency].color}`}>
                        {urgencyLabels[lead.urgency].label}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {caseTypeLabels[lead.case_type]}
                      </span>
                      {lead.region && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3 h-3" />
                          {lead.region}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatTime(lead.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-2">
                      {lead.case_description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {lead.budget && (
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <RubleIcon className="w-4 h-4" />
                          Бюджет: {lead.budget}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Price & Action */}
                  <div className="flex lg:flex-col items-center lg:items-end gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-accent">{formatPrice(lead.price)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isPurchased ? 'Куплено' : 'Стоимость'}
                      </p>
                    </div>
                    
                    {isPurchased ? (
                      <button
                        onClick={() => handleRevealContact(lead)}
                        disabled={revealingContact}
                        className="flex items-center gap-2 px-4 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-base font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        {revealingContact ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                        Контакты
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowPurchaseModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-accent text-white rounded-xl text-base font-bold hover:bg-slate-800 dark:hover:bg-accent-light transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Купить
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchaseModal && selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !purchasing && setShowPurchaseModal(false)} />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl"
            >
              {purchaseSuccess ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Лид приобретён!
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Контакты клиента раскрыты
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                  
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Покупка лида
                    </h3>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Клиент</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedLead.client_name}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Тип дела</span>
                      <span className="font-medium text-slate-900 dark:text-white">{caseTypeLabels[selectedLead.case_type]}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Регион</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedLead.region || 'Не указан'}</span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white">Итого</span>
                      <span className="text-2xl font-bold text-accent">{formatPrice(selectedLead.price)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    {purchasing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Оплата...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Оплатить {formatPrice(selectedLead.price)}
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-center text-slate-500 mt-4">
                    Демо-режим. Оплата не производится.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && contactData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContactModal(false)} />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl"
            >
              <button
                onClick={() => setShowContactModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Контакты клиента
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-600 dark:text-slate-300">
                      {contactData.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Имя</p>
                    <p className="font-bold text-slate-900 dark:text-white">{contactData.name}</p>
                  </div>
                </div>
                
                <a
                  href={`tel:${contactData.phone}`}
                  className="bg-accent/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-accent/20 transition-colors"
                >
                  <Phone className="w-6 h-6 text-accent" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Телефон</p>
                    <p className="font-bold text-accent">{contactData.phone}</p>
                  </div>
                </a>
                
                {contactData.email && (
                  <a
                    href={`mailto:${contactData.email}`}
                    className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Mail className="w-6 h-6 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                      <p className="font-medium text-slate-900 dark:text-white">{contactData.email}</p>
                    </div>
                  </a>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  📞 Рекомендуем связаться с клиентом в течение 30 минут для повышения шансов на успех!
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
