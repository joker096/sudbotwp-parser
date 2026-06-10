import { useState, useEffect } from 'react';
import { UserCheck, Search, AlertCircle, CheckCircle, XCircle, Info, Scale, Gavel, Shield, Loader2 } from 'lucide-react';
import { checkTaxpayerStatus, isValidInn, TaxpayerStatusResponse } from '../lib/npd';
import { checkFssp, checkEfrsb, FsspResponse, EfrsbResponse } from '../lib/counterparty';
import { useSeo } from '../hooks/useSeo';

type TabType = 'npd' | 'fssp' | 'efrsb' | 'rosfin';

export default function TaxpayerCheck() {
  const { setSeo } = useSeo('/taxpayer');
  const [inn, setInn] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('npd');
  const [isLoading, setIsLoading] = useState(false);

  // NPD (самозанятый)
  const [npdResult, setNpdResult] = useState<TaxpayerStatusResponse | null>(null);
  const [npdError, setNpdError] = useState<string | null>(null);

  // FSSP (исполнительные производства)
  const [fsspResult, setFsspResult] = useState<FsspResponse | null>(null);
  const [fsspError, setFsspError] = useState<string | null>(null);

  // EFRSB (банкротство)
  const [efrsbResult, setEfrsbResult] = useState<EfrsbResponse | null>(null);
  const [efrsbError, setEfrsbError] = useState<string | null>(null);

  // Rosfin (Росфинмониторинг)
  interface RosfinResult {
    inList: boolean;
    category?: string;
    details?: string;
  }
  const [rosfinResult, setRosfinResult] = useState<RosfinResult | null>(null);
  const [rosfinError, setRosfinError] = useState<string | null>(null);

  useEffect(() => {
    setSeo({
      title: 'Проверка физического лица - Sud',
      description: 'Комплексная проверка физического лица: самозанятый, долги, банкротство, Росфинмониторинг.',
      keywords: 'проверка физлица, ИНН, ФССП, банкротство, самозанятый',
    });
  }, [setSeo]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inn.trim() || inn.length !== 12) {
      setNpdError('Введите ИНН (12 цифр)');
      return;
    }

    setIsLoading(true);
    setNpdError(null);
    setFsspError(null);
    setEfrsbError(null);
    setRosfinError(null);

    try {
      // Проверяем всё параллельно
      const [npd, fssp, efrsb, rosfin] = await Promise.allSettled([
        checkTaxpayerStatus(inn),
        checkFssp(inn),
        checkEfrsb(inn),
        fetchRosfin(inn),
      ]);

      if (npd.status === 'fulfilled') {
        setNpdResult(npd.value);
      } else {
        setNpdError(npd.reason?.message || 'Ошибка проверки');
      }

      if (fssp.status === 'fulfilled') {
        setFsspResult(fssp.value);
      } else {
        setFsspError(fssp.reason?.message || 'Ошибка ФССП');
      }

      if (efrsb.status === 'fulfilled') {
        setEfrsbResult(efrsb.value);
      } else {
        setEfrsbError(efrsb.reason?.message || 'Ошибка ЕФРСБ');
      }

      if (rosfin.status === 'fulfilled') {
        setRosfinResult(rosfin.value);
      } else {
        setRosfinError(rosfin.reason?.message || 'Ошибка Росфинмониторинга');
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка';
      setNpdError(message);
    } finally {
      setIsLoading(false);
    }
  };

  async function fetchRosfin(inn: string): Promise<RosfinResult> {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-rosfin`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ inn }),
    });
    return response.json();
  }

  const tabs = [
    { id: 'npd' as TabType, label: 'Самозанятый', icon: UserCheck },
    { id: 'fssp' as TabType, label: 'Долги (ФССП)', icon: Scale },
    { id: 'efrsb' as TabType, label: 'Банкротство', icon: Gavel },
    { id: 'rosfin' as TabType, label: 'Росфинмониторинг', icon: Shield },
  ];

  return (
    <div className="space-y-6 md:space-y-8 transition-all duration-300 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Проверка физического лица
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Комплексная проверка: самозанятый, долги, банкротство, Росфинмониторинг
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              ИНН физического лица (12 цифр)
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={inn}
                onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="000000000000"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                maxLength={12}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Проверяем все источники...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Проверить по всем базам
              </>
            )}
          </button>
        </form>

        {npdError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-300">{npdError}</p>
              <button
                onClick={() => handleCheck({ preventDefault: () => {} } as React.FormEvent)}
                disabled={isLoading}
                className="mt-2 text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2"
              >
                Повторить попытку
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 overflow-hidden p-6">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      )}

      {/* Results Tabs */}
      {(npdResult || fsspResult || efrsbResult || rosfinResult) && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Tab Buttons */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-slate-100 dark:border-slate-800">
            {tabs.map((tab) => {
              const hasResult = getHasResult(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all relative ${
                    activeTab === tab.id
                      ? 'text-accent'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {hasResult && (
                    <span className={`w-2 h-2 rounded-full ${getResultColor(tab.id)}`} />
                  )}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'npd' && <NpdTab result={npdResult} error={npdError} inn={inn} />}
            {activeTab === 'fssp' && <FsspTab result={fsspResult} error={fsspError} />}
            {activeTab === 'efrsb' && <EfrsbTab result={efrsbResult} error={efrsbError} />}
            {activeTab === 'rosfin' && <RosfinTab result={rosfinResult} error={rosfinError} />}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Источники данных:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>ФНС</strong> — статус самозанятого (НПД)</li>
            <li><strong>ФССП</strong> — исполнительные производства</li>
            <li><strong>ЕФРСБ</strong> — банкротство физических лиц</li>
            <li><strong>Росфинмониторинг</strong> — списки террористов и экстремистов</li>
          </ul>
        </div>
      </div>
    </div>
  );

  function getHasResult(tab: TabType): boolean {
    switch (tab) {
      case 'npd': return !!npdResult;
      case 'fssp': return !!fsspResult && fsspResult.count > 0;
      case 'efrsb': return !!efrsbResult && efrsbResult.hasBankruptcy;
      case 'rosfin': return !!rosfinResult && rosfinResult.inList;
      default: return false;
    }
  }

  function getResultColor(tab: TabType): string {
    switch (tab) {
      case 'npd': return npdResult?.status ? 'bg-emerald-500' : 'bg-slate-300';
      case 'fssp': return fsspResult && fsspResult.count > 0 ? 'bg-amber-500' : 'bg-emerald-500';
      case 'efrsb': return efrsbResult?.hasBankruptcy ? 'bg-red-500' : 'bg-emerald-500';
      case 'rosfin': return rosfinResult?.inList ? 'bg-red-500' : 'bg-emerald-500';
      default: return 'bg-slate-300';
    }
  }
}

// ===== Tab Components =====

function NpdTab({ result, error, inn }: { result: TaxpayerStatusResponse | null; error: string | null; inn: string }) {
  if (error) return <ErrorState message={error} />;
  if (!result) return <EmptyState />;

  return (
    <div className={`p-4 rounded-2xl ${result.status ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
      <div className="flex items-center gap-4">
        {result.status ? (
          <CheckCircle className="w-10 h-10 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="w-10 h-10 text-slate-400 shrink-0" />
        )}
        <div>
          <h3 className={`text-lg font-bold ${result.status ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
            {result.status ? 'Является самозанятым' : 'Не является самозанятым'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{result.message}</p>
          <p className="text-xs text-slate-500 mt-2">ИНН: {inn}</p>
        </div>
      </div>
    </div>
  );
}

function FsspTab({ result, error }: { result: FsspResponse | null; error: string | null }) {
  if (error) return <ErrorState message={error} />;
  if (!result) return <EmptyState />;

  if (result.count === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Исполнительных производств не найдено</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 mb-3">Найдено: {result.count} производств</p>
      {result.productions.map((prod, i) => (
        <div key={i} className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">№ {prod.number}</p>
              <p className="text-xs text-slate-500">{prod.date}</p>
            </div>
            {prod.sum && <span className="text-sm font-bold text-red-500">{prod.sum} ₽</span>}
          </div>
          <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {prod.debtor && <p>Должник: {prod.debtor}</p>}
            {prod.type && <p>Тип: {prod.type}</p>}
            {prod.subject && <p>Предмет: {prod.subject}</p>}
            {prod.department && <p className="text-xs text-slate-500">{prod.department}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function EfrsbTab({ result, error }: { result: EfrsbResponse | null; error: string | null }) {
  if (error) return <ErrorState message={error} />;
  if (!result) return <EmptyState />;

  if (!result.hasBankruptcy) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Дела о банкротстве не найдены</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {result.cases.map((caseItem, i) => (
        <div key={i} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">Дело № {caseItem.number}</p>
              <p className="text-xs text-slate-500">{caseItem.date}</p>
            </div>
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
              {caseItem.status || 'Банкротство'}
            </span>
          </div>
          <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {caseItem.type && <p>Тип: {caseItem.type}</p>}
            {caseItem.court && <p>Суд: {caseItem.court}</p>}
            {caseItem.judge && <p>Судья: {caseItem.judge}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RosfinTab({ result, error }: { result: RosfinResult | null; error: string | null }) {
  if (error) return <ErrorState message={error} />;
  if (!result) return <EmptyState />;

  if (!result.inList) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        <p className="text-sm text-emerald-700 dark:text-emerald-300">В списках террористов/экстремистов не найден</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
      <div className="flex items-center gap-4">
        <XCircle className="w-10 h-10 text-red-500 shrink-0" />
        <div>
          <h3 className="text-lg font-bold text-red-700 dark:text-red-300">Найден в списке!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Категория: {result.category || 'Неизвестно'}
          </p>
          {result.details && (
            <p className="text-xs text-slate-500 mt-1">{result.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl">
      <AlertCircle className="w-5 h-5 text-red-500" />
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
      <p className="text-sm">Введите ИНН и нажмите «Проверить»</p>
    </div>
  );
}
