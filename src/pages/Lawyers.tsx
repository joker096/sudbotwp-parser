import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MapPin, Star, ShieldCheck, MessageCircle, Filter, Search, Mail, Globe, Phone, Briefcase, X, ChevronDown, Loader2, Eye, Building2, ExternalLink, Bookmark, BookmarkCheck, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AdBanner from '../components/AdBanner';
import LeadModal from '../components/LeadModal';
import StarRating from '../components/StarRating';
import SafeLink from '../components/SafeLink';
import { useSeo } from '../hooks/useSeo';
import { useAuth } from '../hooks/useAuth';
import { lawyers, lawyerFavorites, Lawyer, supabase, lawyerViewLimits } from '../lib/supabase';

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

const POPULAR_CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград', 'Саратов',
  'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Ульяновск', 'Иркутск',
  'Хабаровск', 'Ярославль', 'Владивосток', 'Махачкала', 'Томск',
  'Оренбург', 'Кемерово', 'Новокузнецк', 'Астрахань', 'Пенза',
];

const STORAGE_KEY = 'profile-favorite-lawyers';

function getLocalFavorites(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function getAvatarUrl(lawyer: Lawyer): string {
  if (lawyer.avatar_url?.includes('/storage/')) return lawyer.avatar_url;
  if (lawyer.avatar_url) return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${lawyer.avatar_url}`;
  return lawyer.img || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80`;
}

const formatUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return 'https://' + url;
};

export default function Lawyers() {
  const { setSeo } = useSeo('/lawyers');

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
  const { user, profileData } = useAuth();
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
  const [favorites, setFavorites] = useState<string[]>([]);

const [showExtraData, setShowExtraData] = useState(false);
   const [extraDataLoading, setExtraDataLoading] = useState(false);
   const [extraDataFetched, setExtraDataFetched] = useState(false);
   const [extraData, setExtraData] = useState<any>(null);
   const [viewLimitReached, setViewLimitReached] = useState(false);
   const [remainingViews, setRemainingViews] = useState<number | null>(null);

   const syncFavorites = useCallback(async () => {
    if (user) {
      const { data } = await lawyerFavorites.getIds(user.id);
      if (data) setFavorites(data);
    } else {
      setFavorites(getLocalFavorites().map((l: any) => l.id));
    }
  }, [user]);

  useEffect(() => {
    syncFavorites();
  }, [syncFavorites]);

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

  const handleToggleFavorite = useCallback(async (lawyer: Lawyer, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = favorites.includes(lawyer.id);
    if (user) {
      if (isFav) {
        await lawyerFavorites.remove(user.id, lawyer.id);
        setFavorites(prev => prev.filter(id => id !== lawyer.id));
      } else {
        await lawyerFavorites.add(user.id, lawyer.id);
        setFavorites(prev => [...prev, lawyer.id]);
      }
    } else {
      const saved = getLocalFavorites();
      if (isFav) {
        const idx = saved.findIndex((l: any) => l.id === lawyer.id);
        if (idx >= 0) saved.splice(idx, 1);
      } else {
        saved.push({ id: lawyer.id, name: lawyer.name, spec: lawyer.spec || '', city: lawyer.city || '', rating: lawyer.rating || 0, reviews: lawyer.reviews || 0, verified: lawyer.verified || false, img: lawyer.avatar_url?.includes('/storage/') ? lawyer.avatar_url : lawyer.avatar_url ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${lawyer.avatar_url}` : lawyer.img || '' });
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setFavorites(prev => isFav ? prev.filter(id => id !== lawyer.id) : [...prev, lawyer.id]);
    }
  }, [favorites, user]);

  const [allLawyers, setAllLawyers] = useState<Lawyer[]>([]);

  const tabs = ['Все', 'Гражданские', 'Уголовные', 'Семейные', 'Арбитраж', 'Недвижимость', 'Трудовое право', 'Наследство', 'Банкротство'];

  const availableRegions = Array.from(new Set([
    ...allLawyers.map(l => l.region),
    ...RUSSIAN_REGIONS,
  ])).sort();

  const uniqueCities = Array.from(new Set(allLawyers.map(l => l.city))).sort();

  const filteredLawyers = allLawyers.filter(lawyer => {
    const matchesTab = activeTab === 'Все' || lawyer.spec === activeTab;
    const matchesSearch = lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lawyer.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lawyer.region?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = filterCity === '' || lawyer.region === filterCity || lawyer.city === filterCity;
    const matchesRating = lawyer.rating >= filterRating;
    const matchesVerified = !filterVerified || lawyer.verified;
    const matchesExperience = filterExperience === '' || parseInt(lawyer.experience || '0') >= parseInt(filterExperience);
    return matchesTab && matchesSearch && matchesRegion && matchesRating && matchesVerified && matchesExperience;
  }).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'reviews') return b.reviews - a.reviews;
    if (sortBy === 'experience') return parseInt(b.experience || '0') - parseInt(a.experience || '0');
    return 0;
  });

const handleCloseModal = () => {
    setSelectedLawyer(null);
    setShowExtraData(false);
    setViewLimitReached(false);
    setRemainingViews(null);
  };

  const handleShowExtraData = async () => {
    if (!selectedLawyer) return;

    // Admin sees everything without limits
    if (profileData?.role === 'admin') {
      setShowExtraData(true);
      setViewLimitReached(false);
      return;
    }

    setExtraDataLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setViewLimitReached(true);
        setRemainingViews(0);
        return;
      }
      const { hasLimit, remaining } = await lawyerViewLimits.checkLimit(session.user.id, selectedLawyer.id);
      setRemainingViews(remaining);
      if (hasLimit) {
        setViewLimitReached(true);
        return;
      }
      await lawyerViewLimits.trackView(session.user.id, selectedLawyer.id);
      setShowExtraData(true);
    } catch (error) {
      console.error('Error showing extra data:', error);
      setViewLimitReached(true);
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
          className={`absolute right-2 p-2.5 rounded-xl transition-colors ${
            showFilters ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
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
                      src={getAvatarUrl(lawyer)}
                      alt={lawyer.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-16 h-16 rounded-2xl object-contain bg-slate-100 dark:bg-slate-800 shadow-sm"
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
        {filteredLawyers.map((lawyer, index) => {
          const isFav = favorites.includes(lawyer.id);
          return (
            <div key={lawyer.id} className="contents">
              <div className="group bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-[0_2px_16px_rgb(0,0,0,0.04)] dark:shadow-[0_2px_16px_rgb(0,0,0,0.16)] border border-slate-100 dark:border-slate-800/60 hover:shadow-[0_12px_40px_rgb(0,0,0,0.10)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.35)] hover:border-accent/30 dark:hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex gap-4 cursor-pointer" onClick={() => setSelectedLawyer(lawyer)}>
                  <div className="relative shrink-0">
                    <img
                      src={getAvatarUrl(lawyer)}
                      alt={lawyer.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-20 h-20 rounded-2xl object-contain bg-slate-100 dark:bg-slate-800 shadow-sm group-hover:shadow-md transition-shadow"
                    />
                    {lawyer.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-0.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900">
                        <ShieldCheck className="w-5 h-5 text-accent" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight group-hover:text-accent transition-colors truncate">
                        {lawyer.name}
                      </h3>
                      <button
                        onClick={(e) => handleToggleFavorite(lawyer, e)}
                        className={`p-1.5 shrink-0 rounded-lg transition-all duration-200 ${
                          isFav
                            ? 'text-accent bg-accent/10 hover:bg-accent/20 scale-110'
                            : 'text-slate-400 hover:text-accent hover:bg-accent/10 hover:scale-110'
                        }`}
                        title={isFav ? 'Убрать из избранного' : 'В избранное'}
                      >
                        {isFav ? <BookmarkCheck className="w-4 h-4 fill-accent" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-accent font-semibold mb-2 truncate">{lawyer.spec}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-2">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> <span className="truncate">{lawyer.city}</span>
                      <span className="text-slate-300 dark:text-slate-600 shrink-0">·</span>
                      <span className="shrink-0">{lawyer.reviews} отз.</span>
                    </div>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {lawyer.description}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setSelectedLawyer(lawyer)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-2xl text-xs font-bold transition-colors"
                  >
                    Профиль
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(lawyer, new MouseEvent('click') as any)}
                    className={`p-2.5 rounded-2xl transition-all duration-200 ${
                      isFav
                        ? 'bg-accent/10 text-accent hover:bg-accent/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-accent hover:bg-accent/10'
                    }`}
                    title={isFav ? 'Убрать из избранного' : 'В избранное'}
                  >
                    {isFav ? <BookmarkCheck className="w-4 h-4 fill-accent" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setSelectedLawyer(lawyer); setShowLeadModal(true); }}
                    className="flex-1 bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white py-2.5 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Написать
                  </button>
                </div>
              </div>
              {index === 2 && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <AdBanner />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredLawyers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">Юристы не найдены.</p>
        </div>
      )}

      <AnimatePresence>
        {selectedLawyer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="fixed bottom-0 sm:bottom-auto sm:top-1/2 left-0 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-slate-100 dark:scrollbar-track-slate-800">
                  <button
                    onClick={handleCloseModal}
                    aria-label="Закрыть"
                    className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full transition-colors z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* ────── HERO ────── */}
                  <div className="flex flex-col items-center text-center mt-6">
                    <div className="relative mb-3">
                      <img
                        src={getAvatarUrl(selectedLawyer)}
                        alt={selectedLawyer.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-28 h-28 rounded-[1.5rem] object-contain bg-slate-100 dark:bg-slate-800 shadow-xl shadow-black/10 dark:shadow-black/40 border-[3px] border-white dark:border-slate-700"
                      />
                      {selectedLawyer.verified && (
                        <div className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md ring-2 ring-white dark:ring-slate-800">
                          <ShieldCheck className="w-6 h-6 text-green-500" />
                        </div>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-[0.01em]">{selectedLawyer.name}</h2>
                    <p className="text-accent text-xs font-semibold uppercase tracking-widest mt-0.5">{selectedLawyer.spec}</p>
                  </div>

                  {/* ────── STATS GRID ────── */}
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    {/* Рейтинг платформы */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mb-1.5" />
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedLawyer.rating?.toFixed(1) ?? '—'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Рейтинг</p>
                    </div>

                    {/* Отзывы */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                      <MessageCircle className="w-5 h-5 text-blue-400 mb-1.5" />
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedLawyer.reviews ?? 0}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Отзывов</p>
                    </div>

                    {/* Опыт */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                      <Briefcase className="w-5 h-5 text-emerald-500 mb-1.5" />
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedLawyer.experience ?? '—'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Лет опыта</p>
                    </div>
                  </div>

                  {/* ────── CITY TAG ────── */}
                  <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 mt-3">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedLawyer.city}</span>
                  </div>

                  {/* ────── PRIMARY ACTION ────── */}
                  {!showExtraData && !viewLimitReached && (
                    <button
                      onClick={handleShowExtraData}
                      disabled={extraDataLoading}
                      className="w-full bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white py-3.5 px-5 rounded-2xl text-sm font-extrabold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-black/10 dark:shadow-accent/20 disabled:opacity-50 active:scale-[0.99] mt-4"
                    >
                      {extraDataLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Показать данные</span>
                          {remainingViews !== null && remainingViews > 0 && remainingViews <= 3 && (
                            <span className="opacity-70">({remainingViews} осталось)</span>
                          )}
                        </>
                      )}
                    </button>
                  )}

                  {viewLimitReached && (
                    <div className="mt-4 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-center space-y-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Полные данные доступны по подписке.
                      </p>
                      <Link
                        to="/profile?tab=subscription"
                        className="inline-block bg-accent hover:bg-accent-light text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors"
                      >
                        Приобрести подписку
                      </Link>
                    </div>
                  )}

                  {/* ────── КОНТАКТЫ (всегда видны) ────── */}
                  <div className="grid grid-cols-2 gap-3 mt-5 pt-2">
                    {selectedLawyer.phone && (
                      <a href={`tel:${selectedLawyer.phone}`} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                        <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                          <Phone className="w-4 h-4 text-accent" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Телефон</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.phone}</p>
                        </div>
                      </a>
                    )}
                    {selectedLawyer.website && (
                      <SafeLink href={formatUrl(selectedLawyer.website)} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                        <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                          <Globe className="w-4 h-4 text-accent" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Сайт</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.website}</p>
                        </div>
                      </SafeLink>
                    )}
                  </div>

                  {selectedLawyer.email && (
                    <a href={`mailto:${selectedLawyer.email}`} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group mt-3">
                      <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm">
                        <Mail className="w-4 h-4 text-accent" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Email</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.email}</p>
                      </div>
                    </a>
                  )}

                  {/* ────── EXTRA DATA ────── */}
                  {showExtraData && (
                    <div className="mt-4 space-y-3">
                      {selectedLawyer.description && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{selectedLawyer.description}</p>
                        </div>
                      )}

                      {selectedLawyer.telegram && (
                        <SafeLink href={`https://t.me/${selectedLawyer.telegram.replace(/^@/, '')}`} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                          <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm">
                            <MessageCircle className="w-4 h-4 text-accent" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Telegram</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.telegram}</p>
                          </div>
                        </SafeLink>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {selectedLawyer.license_number && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                            <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1.5" />
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLawyer.license_number}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Лицензия</p>
                          </div>
                        )}
                        {selectedLawyer.experience_years !== undefined && selectedLawyer.experience_years !== null && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                            <Briefcase className="w-5 h-5 text-emerald-500 mb-1.5" />
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLawyer.experience_years}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Лет опыта</p>
                          </div>
                        )}
                      </div>

                      {selectedLawyer.practice_areas && selectedLawyer.practice_areas.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Сферы практики</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedLawyer.practice_areas.map((area) => (
                              <span key={area} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedLawyer.languages && selectedLawyer.languages.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Языки</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedLawyer.languages.map((lang) => (
                              <span key={lang} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setShowExtraData(false)}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <EyeOff className="w-4 h-4" />
                        Скрыть данные
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { handleCloseModal(); setShowLeadModal(true); }}
                  className="w-full bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white py-4 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 dark:shadow-accent/30"
                >
                  <MessageCircle className="w-5 h-5" />
                  Написать сообщение
                </button>
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
