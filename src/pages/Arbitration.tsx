import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Gavel, Loader2, AlertCircle, ExternalLink,
  Scale, TrendingUp, Users, Calendar, ChevronDown, ChevronUp,
  BarChart3, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchKad, searchKadByCompany, KadCase, KadStats } from '../lib/counterparty';
import { useSeo } from '../hooks/useSeo';
import { useToast } from '../hooks/useToast';

export default function ArbitrationPage() {
  const { setSeo } = useSeo('/arbitration');
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<'case' | 'company'>(
    searchParams.get('type') === 'company' ? 'company' : 'case'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [cases, setCases] = useState<KadCase[]>([]);
  const [stats, setStats] = useState<KadStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  setSeo({
    title: 'Арбитражные дела — Sud',
    description: 'Поиск по Картотеке арбитражных дел (КАД). Статистика судей, анализ оппонентов, исковая нагрузка.',
    keywords: 'арбитражные дела, КАД, поиск судов, статистика судьи',
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.length < 3) {
      setError('Введите минимум 3 символа');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCases([]);
    setStats(null);

    try {
      showToast('Ищем в КАД...');

      let result;
      if (searchType === 'case') {
        // Определяем тип поиска по формату запроса
        const isCaseNumber = /\d/.test(query) && (query.includes('/') || query.includes('-'));
        const type = isCaseNumber ? 'case_number' : 'party';
        result = await searchKad(query, type);
      } else {
        const isInn = /^\d{10,12}$/.test(query.replace(/\D/g, ''));
        if (isInn) {
          result = await searchKadByCompany(query.replace(/\D/g, ''));
        } else {
          result = await searchKadByCompany(undefined, query);
        }
      }

      setCases(result.cases);
      setTotal(result.total);
      setStats(result.stats || null);

      if (result.cases.length === 0) {
        setError('Дела не найдены. Попробуйте изменить запрос.');
      }

      // Обновляем URL
      setSearchParams({ q: query, type: searchType });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при поиске';
      setError(message);
      showToast('Ошибка при поиске в КАД');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCase = (num: string) => {
    setExpandedCase(expandedCase === num ? null : num);
  };

  return (
    <div className="space-y-6 transition-all duration-300 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Gavel className="w-7 h-7 text-accent" />
          Арбитражные дела
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Поиск по Картотеке арбитражных дел (КАД). Найдите дело по номеру, сторонам или судье.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
        {/* Type Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSearchType('case')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              searchType === 'case'
                ? 'bg-slate-900 dark:bg-accent text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Search className="w-4 h-4" />
            По делу / стороне
          </button>
          <button
            type="button"
            onClick={() => setSearchType('company')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              searchType === 'company'
                ? 'bg-slate-900 dark:bg-accent text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            По компании
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchType === 'case'
                  ? "Номер дела (А40-12345/2026) или название стороны"
                  : "ИНН или название компании"
              }
              className="w-full bg-slate-50 dark:bg-slate-800 py-4 pl-12 pr-4 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || query.length < 3}
            className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white py-4 px-8 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            {isLoading ? 'Поиск...' : 'Найти'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </form>

      {/* Stats Dashboard */}
      {stats && stats.totalCases > 0 && (
        <StatsDashboard stats={stats} />
      )}

      {/* Results */}
      {cases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Найдено дел: {cases.length}
              {total > cases.length && ` (всего ~${total})`}
            </h2>
          </div>

          <div className="space-y-3">
            {cases.map((caseItem) => (
              <CaseCard
                key={caseItem.number}
                caseItem={caseItem}
                expanded={expandedCase === caseItem.number}
                onToggle={() => toggleCase(caseItem.number)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Stats Dashboard =====

function StatsDashboard({ stats }: { stats: KadStats }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'opponents' | 'judges'>('overview');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Статистика по компании
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'overview' as const, label: 'Обзор', icon: TrendingUp },
          { id: 'opponents' as const, label: 'Оппоненты', icon: Users },
          { id: 'judges' as const, label: 'Судьи', icon: UserCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative ${
              activeTab === tab.id
                ? 'text-accent'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'opponents' && <OpponentsTab opponents={stats.topOpponents} />}
        {activeTab === 'judges' && <JudgesTab judges={stats.topJudges} />}
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: KadStats }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Scale className="w-5 h-5 text-blue-500" />}
          label="Всего дел"
          value={stats.totalCases}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
          label="Истец"
          value={stats.asPlaintiff}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-red-500 rotate-180" />}
          label="Ответчик"
          value={stats.asDefendant}
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-purple-500" />}
          label="Сумма споров"
          value={`${(stats.totalSum / 1000000).toFixed(1)} млн`}
        />
      </div>

      {/* Role Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">Роль в спорах</h3>
          <div className="space-y-2">
            <RoleBar label="Истец" value={stats.asPlaintiff} total={stats.totalCases} color="bg-emerald-500" />
            <RoleBar label="Ответчик" value={stats.asDefendant} total={stats.totalCases} color="bg-red-500" />
            <RoleBar label="Третье лицо" value={stats.asThirdParty} total={stats.totalCases} color="bg-amber-500" />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">Динамика по годам</h3>
          <div className="space-y-2">
            {stats.years.slice(-5).map((y) => (
              <RoleBar key={y.year} label={y.year} value={y.count} total={Math.max(...stats.years.map(yy => yy.count))} color="bg-accent" />
            ))}
          </div>
        </div>
      </div>

      {/* Categories */}
      {stats.categories.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">Категории споров</h3>
          <div className="flex flex-wrap gap-2">
            {stats.categories.slice(0, 10).map((cat) => (
              <span
                key={cat.name}
                className="px-3 py-1 bg-white dark:bg-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
              >
                {cat.name} ({cat.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OpponentsTab({ opponents }: { opponents: KadStats['topOpponents'] }) {
  if (opponents.length === 0) {
    return <EmptyState message="Нет данных об оппонентах" />;
  }

  return (
    <div className="space-y-3">
      {opponents.map((opp, i) => (
        <div key={opp.name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-sm text-slate-900 dark:text-white">{opp.name}</p>
              <p className="text-xs text-slate-500">{opp.count} дел</p>
            </div>
          </div>
          {opp.sum > 0 && (
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {(opp.sum / 1000000).toFixed(1)} млн ₽
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function JudgesTab({ judges }: { judges: KadStats['topJudges'] }) {
  if (judges.length === 0) {
    return <EmptyState message="Нет данных о судьях" />;
  }

  return (
    <div className="space-y-3">
      {judges.map((judge) => {
        const total = judge.satisfied + judge.denied;
        const satisfactionRate = total > 0 ? Math.round((judge.satisfied / total) * 100) : 0;

        return (
          <div key={judge.name} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{judge.name}</p>
                <p className="text-xs text-slate-500">{judge.count} дел</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{satisfactionRate}%</p>
                <p className="text-xs text-slate-500">удовлетворено</p>
              </div>
            </div>
            {total > 0 && (
              <div className="w-full bg-white dark:bg-slate-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${satisfactionRate}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== Case Card =====

function CaseCard({ caseItem, expanded, onToggle }: {
  caseItem: KadCase;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {caseItem.number}
            </span>
            {caseItem.sum && (
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {caseItem.sum}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{caseItem.court}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            {caseItem.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {caseItem.date}
              </span>
            )}
            {caseItem.category && (
              <span>{caseItem.category}</span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {caseItem.plaintiff && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1">Истец</p>
                  <p className="text-sm text-slate-900 dark:text-white">{caseItem.plaintiff}</p>
                </div>
              )}
              {caseItem.defendant && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold mb-1">Ответчик</p>
                  <p className="text-sm text-slate-900 dark:text-white">{caseItem.defendant}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {caseItem.judge && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <UserCheck className="w-3 h-3" />
                    {caseItem.judge}
                  </span>
                )}
                {caseItem.status && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    caseItem.status.toLowerCase().includes('удовлетвор')
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : caseItem.status.toLowerCase().includes('отказ')
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {caseItem.status}
                  </span>
                )}
              </div>
              {caseItem.url && (
                <a
                  href={caseItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть в КАД
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Helpers =====

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function RoleBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 dark:text-slate-400 w-24 truncate">{label}</span>
      <div className="flex-1 bg-white dark:bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, 5)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12 text-right">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
      <p className="text-sm">{message}</p>
    </div>
  );
}
