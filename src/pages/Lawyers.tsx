import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MapPin, Star, ShieldCheck, MessageCircle, MessageSquare, Filter, Search, Globe, Phone, Briefcase, X, ChevronDown, Loader2, Eye, Building2, ArrowDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AdBanner from '../components/AdBanner';
import LeadModal from '../components/LeadModal';
import StarRating from '../components/StarRating';
import SafeLink from '../components/SafeLink';
import { useSeo } from '../hooks/useSeo';
import { lawyers, Lawyer, supabase, lawyerViewLimits, yandexMaps } from '../lib/supabase';

// Полный список регионов России
const RUSSIAN_REGIONS = [
  'Москва и Московская область',
  'Санкт-Петербург и Ленинградская область',
  'Адыгея',
  'Алтай',
  'Амурская область',
  'Архангельская область',
  'Астраханская область',
  'Башкортостан',
  'Белгородская область',
  'Брянская область',
  'Бурятия',
  'Владимирская область',
  'Волгоградская область',
  'Вологодская область',
  'Воронежская область',
  'Дагестан',
  'Еврейская АО',
  'Забайкальский край',
  'Ивановская область',
  'Ингушетия',
  'Иркутская область',
  'Кабардино-Балкария',
  'Калининградская область',
  'Калмыкия',
  'Калужская область',
  'Камчатский край',
  'Карачаево-Черкесия',
  'Кемеровская область',
  'Кировская область',
  'Коми',
  'Костромская область',
  'Краснодарский край',
  'Красноярский край',
  'Крым',
  'Курганская область',
  'Курская область',
  'Липецкая область',
  'Магаданская область',
  'Марий Эл',
  'Мордовия',
  'Мурманская область',
  'Нижегородская область',
  'Новгородская область',
  'Новосибирская область',
  'Омская область',
  'Оренбургская область',
  'Орловская область',
  'Пензенская область',
  'Пермский край',
  'Приморский край',
  'Псковская область',
  'Ростовская область',
  'Рязанская область',
  'Самарская область',
  'Саратовская область',
  'Саха (Якутия)',
  'Сахалинская область',
  'Свердловская область',
  'Севастополь',
  'Северная Осетия',
  'Смоленская область',
  'Ставропольский край',
  'Тамбовская область',
  'Татарстан',
  'Тверская область',
  'Томская область',
  'Тульская область',
  'Тыва',
  'Тюменская область',
  'Удмуртия',
  'Ульяновская область',
  'Хабаровский край',
  'Хакасия',
  'Ханты-Мансийский АО',
  'Челябинская область',
  'Чечня',
  'Чувашия',
  'Чукотский АО',
  'Ямало-Ненецкий АО',
  'Ярославская область',
];

// Крупные города для быстрого доступа
const POPULAR_CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград', 'Саратов',
  'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Ульяновск', 'Иркутск',
  'Хабаровск', 'Ярославль', 'Владивосток', 'Махачкала', 'Томск',
  'Оренбург', 'Кемерово', 'Новокузнецк', 'Астрахань', 'Пенза',
];

export default function Lawyers() {
  const { setSeo } = useSeo('/lawyers');
  
  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Юристы и адвокаты - поиск и рейтинг',
      description: 'Найдите лучшего юриста или адвоката. Отзывы, рейтинги, контакты специалистов по всей России.',
      keywords: 'юрист, адвокат, поиск юриста, рейтинг юристов',
      ogTitle: 'Юристы и адвокаты - Поиск и рейтинг',
      ogDescription: 'Найдите лучшего юриста или адвоката. Отзывы, рейтинги, контакты специалистов.',
    });
  }, [setSeo]);
  
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('Все');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [filterExperience, setFilterExperience] = useState('');
  const [filterVerified, setFilterVerified] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Дополнительные данные юриста
  const [showExtraData, setShowExtraData] = useState(false);
  const [extraDataLoading, setExtraDataLoading] = useState(false);
  const [extraDataFetched, setExtraDataFetched] = useState(false);
  const [extraData, setExtraData] = useState<any>(null);
  const [viewLimitReached, setViewLimitReached] = useState(false);
  const [remainingViews, setRemainingViews] = useState<number | null>(null);

  const formatUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://' + url;
  };


  useEffect(() => {
    loadLawyers();
  }, []);

  const loadLawyers = async () => {
    setLoading(true);
    try {
      const { data } = await lawyers.getActive();
      if (data) {
        setAllLawyers(data);
      }
    } catch (error) {
      console.error('Error loading lawyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseLeadModal = useCallback(() => {
    setShowLeadModal(false);
  }, []);

  const [allLawyers, setAllLawyers] = useState<Lawyer[]>([]);

  const tabs = ['Все', 'Гражданские', 'Уголовные', 'Семейные', 'Арбитраж', 'Недвижимость', 'Трудовое право', 'Наследство', 'Банкротство'];

  // Уникальные регионы из данных юристов + полный список регионов России
  const availableRegions = Array.from(new Set([
    ...allLawyers.map(l => l.region),
    ...RUSSIAN_REGIONS
  ])).sort();

  // Для фильтрации: объединяем уникальные регионы и города
  const uniqueCities = Array.from(new Set(allLawyers.map(l => l.city))).sort();

  const filteredLawyers = allLawyers.filter(lawyer => {
    const matchesTab = activeTab === 'Все' || lawyer.spec === activeTab;
    const matchesSearch = lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lawyer.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lawyer.region.toLowerCase().includes(searchQuery.toLowerCase());
    // Фильтр по региону или городу
    const matchesRegion = filterCity === '' || lawyer.region === filterCity || lawyer.city === filterCity;
    const matchesRating = lawyer.rating >= filterRating;
    const matchesVerified = !filterVerified || lawyer.verified;
    const matchesExperience = filterExperience === '' || parseInt(lawyer.experience) >= parseInt(filterExperience);
    return matchesTab && matchesSearch && matchesRegion && matchesRating && matchesVerified && matchesExperience;
  }).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'reviews') return b.reviews - a.reviews;
    if (sortBy === 'experience') return parseInt(b.experience) - parseInt(a.experience);
    return 0;
  });

  // Показать доп. данные юриста
  const handleShowExtraData = async () => {
    if (!selectedLawyer) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setShowExtraData(true);
      setExtraDataFetched(true);
      setViewLimitReached(false);
      setRemainingViews(5);
      return;
    }

    const { hasLimit, remaining } = await lawyerViewLimits.checkLimit(session.user.id, selectedLawyer.id);
    setRemainingViews(remaining);
    
    if (hasLimit) {
      setViewLimitReached(true);
      return;
    }

    setExtraDataLoading(true);
    setShowExtraData(true);
    setExtraDataFetched(false);
    setExtraData(null);

    try {
      // Сначала ищем по имени, потом по городу + "юрист"
      let result: any = null;
      let searchQuery: string;
      
      searchQuery = selectedLawyer.name;
      result = await yandexMaps.searchOrganization(searchQuery);
      
      // Если не нашли по имени — ищем по городу + юрист
      if (!result?.data?.places || result.data.places.length === 0) {
        searchQuery = `${selectedLawyer.name} юрист`;
        result = await yandexMaps.searchOrganization(searchQuery);
      }
      
      // Если всё ещё не нашли — ищем по городу + юридическая компания
      if (!result?.data?.places || result.data.places.length === 0) {
        searchQuery = `юрист ${selectedLawyer.city}`;
        result = await yandexMaps.searchOrganization(searchQuery);
      }
      
      // Если всё ещё не нашли — ищем по городу
      if (!result?.data?.places || result.data.places.length === 0) {
        searchQuery = selectedLawyer.city;
        result = await yandexMaps.searchOrganization(searchQuery);
      }
      
      if (result.data && result.data.places?.length > 0) {
        await lawyerViewLimits.trackView(session.user.id, selectedLawyer.id);
        setExtraData(result.data.places[0]);
        setExtraDataFetched(true);
        
        const yandexData = result.data.places[0];
        const yandexRating = yandexData.meta?.organization?.rating || null;
        
        if (yandexRating && (!selectedLawyer.yandex_rating || selectedLawyer.yandex_rating === 0)) {
          const { error } = await supabase
            .from('lawyers')
            .update({ yandex_rating: yandexRating })
            .eq('id', selectedLawyer.id);
          if (error) console.error('Error saving yandex rating:', error);
        }
      } else {
        setExtraDataFetched(true);
      }
    } catch (error) {
      console.error('Error fetching extra data:', error);
      setExtraDataFetched(true);
    } finally {
      setExtraDataLoading(false);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Юристы</h1>
      </div>

      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по ФИО или городу..." 
          className="w-full bg-white dark:bg-slate-900 py-4 pl-12 pr-16 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
        />
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-2 p-2.5 rounded-xl transition-colors ${showFilters ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden -mt-2"
          >
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Регион / Город</label>
                <select 
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                >
                  <option value="">Все регионы</option>
                  {availableRegions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Рейтинг</label>
                <select 
                  value={filterRating}
                  onChange={(e) => setFilterRating(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                >
                  <option value={0}>Любой</option>
                  <option value={4.5}>От 4.5</option>
                  <option value={4.8}>От 4.8</option>
                  <option value={4.9}>От 4.9</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Опыт работы</label>
                <select 
                  value={filterExperience}
                  onChange={(e) => setFilterExperience(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                >
                  <option value="">Любой</option>
                  <option value="5">От 5 лет</option>
                  <option value="8">От 8 лет</option>
                  <option value="10">От 10 лет</option>
                  <option value="15">От 15 лет</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Сортировка</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                >
                  <option value="rating">По рейтингу</option>
                  <option value="reviews">По отзывам</option>
                  <option value="experience">По опыту</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row items-center gap-3 mt-2">
                <button 
                  onClick={() => {
                    setFilterCity('');
                    setFilterRating(0);
                    setFilterExperience('');
                    setFilterVerified(false);
                    setSortBy('rating');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  Сбросить фильтры
                </button>
                <Link 
                  to="/apply-lawyer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold text-accent hover:text-accent/80 transition-colors text-center"
                >
                  Стать юристом
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap items-center">
        {tabs.map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab 
                ? 'bg-slate-900 dark:bg-accent text-white' 
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
        <button 
          onClick={() => setFilterVerified(!filterVerified)}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
            filterVerified 
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${filterVerified ? 'text-emerald-500' : 'text-slate-400'}`} />
          Проверенные
        </button>
      </div>

      {/* Recommended Verified Lawyers Section - Only show when no search/filters are active */}
      {!searchQuery && !filterCity && !filterRating && !filterExperience && activeTab === 'Все' && !filterVerified && (
        <div className="pt-4 pb-2">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Рекомендуемые специалисты</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6 sm:mx-0 sm:px-0">
            {allLawyers.filter(l => l.verified && l.rating >= 4.8).map((lawyer) => (
              <div 
                key={`rec-${lawyer.id}`} 
                onClick={() => setSelectedLawyer(lawyer)}
                className="min-w-[280px] sm:min-w-[320px] bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-accent/10 dark:border-accent/20 cursor-pointer hover:-translate-y-1 transition-transform"
              >
                <div className="flex gap-4 items-center mb-4">
                  <div className="relative shrink-0">
                  <img 
                    src={lawyer.avatar_url && lawyer.avatar_url.includes('/storage/') 
                      ? lawyer.avatar_url 
                      : lawyer.avatar_url 
                        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${lawyer.avatar_url}` 
                        : lawyer.img || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80`} 
                    alt={lawyer.name} 
                    referrerPolicy="no-referrer" 
                    loading="lazy" 
                    className="w-16 h-16 rounded-2xl object-cover shadow-sm" 
                  />
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-0.5 rounded-full shadow-sm">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1">
                      {lawyer.name}
                    </h3>
                    <p className="text-xs text-accent font-semibold mb-1">{lawyer.spec}</p>
                    <StarRating 
                      targetType="lawyer" 
                      targetId={lawyer.id} 
                      initialRating={lawyer.rating}
                      initialVotes={lawyer.reviews}
                      size="sm"
                      showCount={false}
                      showVoting={true}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {lawyer.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {filteredLawyers.map((lawyer, index) => (
          <div key={lawyer.id} className="contents">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col gap-4 border border-transparent dark:border-slate-800 transition-colors">
                <div className="flex gap-4 cursor-pointer" onClick={() => setSelectedLawyer(lawyer)}>
                <div className="relative shrink-0">
                  <img 
                    src={lawyer.avatar_url && lawyer.avatar_url.includes('/storage/') 
                      ? lawyer.avatar_url 
                      : lawyer.avatar_url 
                        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${lawyer.avatar_url}` 
                        : lawyer.img || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80`} 
                    alt={lawyer.name}
                    referrerPolicy="no-referrer" 
                    loading="lazy" 
                    className="w-20 h-20 rounded-2xl object-cover shadow-sm" 
                  />
                  {lawyer.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-0.5 rounded-full shadow-sm">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight hover:text-accent transition-colors">
                      {lawyer.name}
                    </h3>
                    <StarRating 
                      targetType="lawyer" 
                      targetId={lawyer.id} 
                      initialRating={lawyer.rating}
                      initialVotes={lawyer.reviews}
                      size="sm"
                      showCount={false}
                      showVoting={true}
                    />
                  </div>
                  <p className="text-xs text-primary font-semibold mb-2">{lawyer.spec}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400" /> {lawyer.city}
                    <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                    <span>{lawyer.reviews} отз.</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedLawyer(lawyer)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  Профиль
                </button>
                <button onClick={() => { setSelectedLawyer(lawyer); setShowLeadModal(true); }}
                  className="flex-1 bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Написать
                </button>
              </div>
            </div>
            
            {/* Рекламный баннер после 3-го юриста */}
            {index === 2 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <AdBanner />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredLawyers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">Юристы не найдены.</p>
        </div>
      )}

      {/* Lawyer Profile Modal */}
      <AnimatePresence>
        {selectedLawyer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLawyer(null)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="fixed bottom-0 sm:bottom-auto sm:top-1/2 left-0 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                <button 
                  onClick={() => setSelectedLawyer(null)}
                  className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center mt-4 mb-6">
                  <div className="relative mb-4">
                    <img 
                      src={selectedLawyer.avatar_url && selectedLawyer.avatar_url.includes('/storage/') 
                        ? selectedLawyer.avatar_url 
                        : selectedLawyer.avatar_url 
                          ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${selectedLawyer.avatar_url}` 
                          : selectedLawyer.img || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80'} 
                      alt={selectedLawyer.name} 
                      referrerPolicy="no-referrer" 
                      loading="lazy" 
                      className="w-28 h-28 rounded-full object-cover shadow-lg border-4 border-white dark:border-slate-800" 
                    />
                    {selectedLawyer.verified && (
                      <div className="absolute bottom-0 right-0 bg-white dark:bg-slate-900 p-1 rounded-full shadow-sm">
                        <ShieldCheck className="w-7 h-7 text-primary" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{selectedLawyer.name}</h2>
                  <p className="text-primary font-semibold mb-3">{selectedLawyer.spec}</p>
                  
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl">
                    <StarRating 
                      targetType="lawyer" 
                      targetId={selectedLawyer.id} 
                      initialRating={selectedLawyer.rating}
                      initialVotes={selectedLawyer.reviews}
                      size="md"
                      showCount={true}
                      showVoting={true}
                    />
                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{selectedLawyer.city}</span>
                    </div>
                  </div>
                  
                  {/* Кнопка показа доп. данных */}
                  {!viewLimitReached && (
                    <button
                      onClick={handleShowExtraData}
                      disabled={extraDataLoading}
                      className="w-full bg-gradient-to-r from-accent/10 to-accent/5 hover:from-accent/20 hover:to-accent/10 border border-accent/20 text-accent py-3 px-4 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent/10 disabled:opacity-50"
                    >
                      {extraDataLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Показать данные</span>
                          {remainingViews !== null && remainingViews > 0 && remainingViews <= 3 && (
                            <span className="text-xs opacity-70">({remainingViews} осталось)</span>
                          )}
                        </>
                      )}
                    </button>
                  )}
                  
                  {viewLimitReached && (
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl text-center">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Лимит просмотров исчерпан. Попробуйте через месяц.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">О специалисте</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedLawyer.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-700 p-2 rounded-xl shadow-sm">
                        <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Опыт</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLawyer.experience}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-700 p-2 rounded-xl shadow-sm">
                        <Star className="w-4 h-4 text-red-500 fill-red-500" />
                      </div>
                      <div>
                       <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Яндекс Карты</p>
                        {selectedLawyer?.yandex_rating && selectedLawyer.yandex_rating > 0 ? (
                          <SafeLink href={"https://yandex.ru/maps/?text=" + encodeURIComponent(selectedLawyer.name)} className="text-sm font-bold text-slate-900 dark:text-white">
                            {selectedLawyer.yandex_rating} / 5.0
                          </SafeLink>
                        ) : (
                          <p className="text-sm text-slate-400 dark:text-slate-500">—</p>
                        )}
                      </div>
                    </div>
                    <a href={`tel:${selectedLawyer.phone}`} className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className="bg-white dark:bg-slate-700 p-2 rounded-xl shadow-sm">
                        <Phone className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Телефон</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.phone}</p>
                      </div>
                    </a>
                    <SafeLink href={formatUrl(selectedLawyer.website)} className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className="bg-white dark:bg-slate-700 p-2 rounded-xl shadow-sm">
                        <Globe className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Сайт</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.website}</p>
                      </div>
                    </SafeLink>
                  </div>
                </div>

                {/* Яндекс Карты - доп. данные */}
                {showExtraData && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-accent" />
                      Данные организации
                    </h3>
                    
                    {extraDataLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : extraData ? (
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="bg-white dark:bg-slate-700 p-2 rounded-xl shadow-sm">
                            <MapPin className="w-5 h-5 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                              {extraData.name || selectedLawyer.name}
                            </h4>
                            {extraData.location && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {extraData.location.address || extraData.location.description || ''}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {extraData.meta?.organization?.rating && (
                          <div className="flex items-center gap-2 mb-3">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {extraData.meta.organization.rating} / {extraData.meta.organization.rating_count}
                            </span>
                          </div>
                        )}
                        
                        {extraData.meta?.organization?.categories && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {extraData.meta.organization.categories.slice(0, 3).map((cat: any, i: number) => (
                              <span key={i} className="text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300">
                                {cat.name || cat.text}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {extraData.meta?.organization?.phone && (
                          <a 
                            href={`tel:${extraData.meta.organization.phone}`} 
                            className="flex items-center gap-2 mb-3 text-sm text-slate-600 dark:text-slate-300 hover:text-accent transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            {extraData.meta.organization.phone}
                          </a>
                        )}
                        
                        <SafeLink 
                          href={`https://yandex.ru/maps/${extraData.location.x}:${extraData.location.y}`} 
                          className="flex items-center gap-2 w-full bg-white dark:bg-slate-700 p-3 rounded-xl text-sm font-bold text-accent hover:bg-accent/10 hover:text-accent-light transition-colors justify-center"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Открыть на Яндекс.Картах
                        </SafeLink>
                      </div>
                    ) : extraDataFetched && !viewLimitReached ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Данные не найдены
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                <button 
                  onClick={() => { setSelectedLawyer(null); setShowLeadModal(true); }}
                  className="w-full bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white py-4 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 dark:shadow-accent/30"
                >
                  <MessageSquare className="w-5 h-5" />
                  Написать сообщение
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LeadModal
        isOpen={showLeadModal}
        onClose={handleCloseLeadModal}
        lawyer={selectedLawyer}
        lawyerId={selectedLawyer?.id}
      />
    </div>
  );
}
