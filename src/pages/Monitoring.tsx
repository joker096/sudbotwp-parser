import { useState, useEffect } from 'react';
import { Search, Building, AlertTriangle, Scale, Shield, Bell, CheckCircle2, XCircle, TrendingUp, Clock, FileText, Loader2, Star, Zap, Crown, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkTaxpayerStatus, isValidInn, TaxpayerStatusResponse } from '../lib/npd';
import { useSeo } from '../hooks/useSeo';

interface CompanyData {
  inn: string;
  name: string;
  ogrn: string;
  address: string;
  status: 'active' | 'bankrupt' | 'liquidating';
  riskScore: number;
  casesCount: number;
  activeCases: number;
  lostCases: number;
  lastCase: string;
  foundingDate: string;
  revenue?: string;
  employees?: string;
}

export default function Monitoring() {
  const { setSeo } = useSeo('/monitoring');
  const [inn, setInn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Обзор');
  const [searchType, setSearchType] = useState<'company' | 'selfemployed'>('company');
  const [taxpayerResult, setTaxpayerResult] = useState<TaxpayerStatusResponse | null>(null);

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Мониторинг контрагентов - Sud',
      description: 'Проверка компаний и самозанятых по ИНН. Мониторинг судебных дел, банкротств и изменений в ЕГРЮЛ.',
      keywords: 'мониторинг, проверка компании, ИНН, банкротство, контрагенты',
      ogTitle: 'Мониторинг контрагентов - Sud',
      ogDescription: 'Проверяйте компании и самозанятых по ИНН.',
    });
  }, [setSeo]);

  const handleSearch = async () => {
    if (searchType === 'selfemployed') {
      // Проверка самозанятого
      if (!inn.trim()) {
        setError('Пожалуйста, введите ИНН');
        return;
      }
      if (!isValidInn(inn)) {
        setError('ИНН должен содержать 12 цифр');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      setCompanyData(null);
      setTaxpayerResult(null);
      
      try {
        const response = await checkTaxpayerStatus(inn);
        setTaxpayerResult(response);
      } catch (err: any) {
        setError(err.message || 'Произошла ошибка при проверке');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Проверка компании
    if (!inn || (inn.length !== 10 && inn.length !== 12)) {
      setError('Введите корректный ИНН (10 или 12 цифр)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCompanyData(null);

    try {
      const response = await fetch('http://localhost:3000/api/search-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inn }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при запросе к API');
      }

      const result = await response.json();
      
      if (result.suggestions && result.suggestions.length > 0) {
        const company = result.suggestions[0];
        const data = company.data;
        
        setCompanyData({
          inn: data.inn || inn,
          name: company.value || 'Неизвестная компания',
          ogrn: data.ogrn || '',
          address: data.address?.value || 'Адрес не указан',
          status: data.state?.status === 'ACTIVE' ? 'active' : data.state?.status === 'LIQUIDATING' ? 'liquidating' : 'bankrupt',
          riskScore: Math.floor(Math.random() * 50) + 10,
          casesCount: Math.floor(Math.random() * 500),
          activeCases: Math.floor(Math.random() * 50),
          lostCases: Math.floor(Math.random() * 100),
          lastCase: new Date().toLocaleDateString('ru-RU'),
          foundingDate: data.state?.registration_date || '01.01.2000',
          revenue: data.finances?.revenue ? `${(data.finances.revenue / 1000000).toFixed(0)} млн ₽` : '—',
          employees: data.employees ? `${data.employees}` : '—',
        });
      } else {
        setError('Компания с указанным ИНН не найдена');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Не удалось выполнить поиск. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInnChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    const maxLength = searchType === 'selfemployed' ? 12 : 12;
    setInn(digitsOnly.slice(0, maxLength));
    setError(null);
    setCompanyData(null);
    setTaxpayerResult(null);
  };

  const getRiskColor = (score: number) => {
    if (score < 20) return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Низкий' };
    if (score < 50) return { color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'Средний' };
    return { color: 'text-red-500', bg: 'bg-red-500', label: 'Высокий' };
  };

  const plans = [
    {
      name: 'Базовый',
      price: 2900,
      features: ['5 ИНН', 'Проверка каждые 24ч', 'Email-уведомления', 'Базовая аналитика'],
      popular: false,
    },
    {
      name: 'Бизнес',
      price: 9900,
      features: ['20 ИНН', 'Проверка каждые 6ч', 'Telegram уведомления', 'Расширенная аналитика', 'История 2 года'],
      popular: true,
    },
    {
      name: 'Премиум',
      price: 29000,
      features: ['100 ИНН', 'Проверка каждый час', 'Приоритетная поддержка', 'Полная аналитика', 'API доступ', 'Персональный менеджер'],
      popular: false,
    },
  ];

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Мониторинг</h1>
      </div>

      {/* Search Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
        {/* Type Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setSearchType('company'); setInn(''); setCompanyData(null); setTaxpayerResult(null); setError(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
              searchType === 'company' 
                ? 'bg-slate-900 dark:bg-accent text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            Компании
          </button>
          <button
            onClick={() => { setSearchType('selfemployed'); setInn(''); setCompanyData(null); setTaxpayerResult(null); setError(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
              searchType === 'selfemployed' 
                ? 'bg-slate-900 dark:bg-accent text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Самозанятые
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            {searchType === 'company' ? (
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            ) : (
              <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            )}
            <input
              type="text"
              value={inn}
              onChange={(e) => handleInnChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchType === 'company' ? "Введите ИНН компании (10 или 12 цифр)" : "Введите ИНН самозанятого (12 цифр)"}
              className="w-full bg-slate-50 dark:bg-slate-800 py-4 pl-12 pr-4 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white py-4 px-8 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Проверить
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {taxpayerResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className={`p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border ${
              taxpayerResult.status 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-4">
                {taxpayerResult.status ? (
                  <CheckCircle2 className="w-12 h-12 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-500 shrink-0" />
                )}
                <div>
                  <h3 className={`text-xl font-bold ${taxpayerResult.status ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {taxpayerResult.status ? 'Самозанятый найден' : 'Не является самозанятым'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {taxpayerResult.message}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                    ИНН: {inn}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {companyData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Company Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center">
                    <Building className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{companyData.name}</h2>
                    <p className="text-sm text-slate-500">ИНН: {companyData.inn} • ОГРН: {companyData.ogrn}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Риск</p>
                    <div className={`text-2xl font-bold ${getRiskColor(companyData.riskScore).color}`}>
                      {companyData.riskScore}%
                    </div>
                  </div>
                  <div className="w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Статус</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      companyData.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {companyData.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {companyData.status === 'active' ? 'Действующая' : 'Банкрот'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {['Обзор', 'Судебные дела', 'Аналитика', 'Мониторинг'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? 'bg-slate-900 dark:bg-accent text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'Обзор' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Scale className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-sm text-slate-500">Судов</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{companyData.casesCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <span className="text-sm text-slate-500">Активных</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{companyData.activeCases}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <span className="text-sm text-slate-500">Проиграно</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{companyData.lostCases}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-sm text-slate-500">Выиграно</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{companyData.casesCount - companyData.lostCases}</p>
                </div>
              </div>
            )}

            {activeTab === 'Судебные дела' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Последние дела</h3>
                <div className="space-y-3">
                  {[
                    { date: '18.02.2026', type: 'Гражданское', subject: 'Взыскание задолженности', amount: '2 500 000 ₽', result: 'В процессе' },
                    { date: '15.02.2026', type: 'Арбитраж', subject: 'Спор по договору поставки', amount: '890 000 ₽', result: 'В пользу истца' },
                    { date: '10.02.2026', type: 'Административное', subject: 'Штраф ГИБДД', amount: '5 000 ₽', result: 'Отменено' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="flex items-center gap-4">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{item.subject}</p>
                          <p className="text-xs text-slate-500">{item.type} • {item.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">{item.amount}</p>
                        <p className={`text-xs font-medium ${item.result.includes('В пользу') ? 'text-emerald-500' : item.result === 'В процессе' ? 'text-amber-500' : 'text-red-500'}`}>{item.result}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Аналитика' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Юридический профиль</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Дата регистрации</p>
                    <p className="font-bold text-slate-900 dark:text-white">{companyData.foundingDate}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Выручка</p>
                    <p className="font-bold text-slate-900 dark:text-white">{companyData.revenue || '—'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Сотрудники</p>
                    <p className="font-bold text-slate-900 dark:text-white">{companyData.employees || '—'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Адрес</p>
                    <p className="font-bold text-slate-900 dark:text-white">{companyData.address}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Мониторинг' && (
              <div className="bg-gradient-to-br from-accent/5 to-transparent dark:from-accent/10 rounded-2xl p-6 border border-accent/20">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-6 h-6 text-accent" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Подписка на мониторинг</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  Получайте уведомления о новых судебных делах, изменениях в ЕГРЮЛ и банкротствах ваших контрагентов
                </p>
                <button className="bg-accent hover:bg-accent-light text-white py-3 px-6 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Подключить мониторинг
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Section */}
      {!companyData && !taxpayerResult && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Тарифы мониторинга</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`relative bg-white dark:bg-slate-900 rounded-2xl p-6 border ${
                  plan.popular 
                    ? 'border-accent shadow-lg shadow-accent/20' 
                    : 'border-slate-100 dark:border-slate-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Популярный
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{plan.price.toLocaleString()}</span>
                  <span className="text-sm text-slate-500"> ₽/мес</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
                  plan.popular
                    ? 'bg-accent hover:bg-accent-light text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>
                  Выбрать
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
