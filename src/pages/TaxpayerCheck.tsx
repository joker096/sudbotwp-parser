import { useState, useEffect } from 'react';
import { UserCheck, Search, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { checkTaxpayerStatus, isValidInn, TaxpayerStatusResponse } from '../lib/npd';
import { useSeo } from '../hooks/useSeo';

export default function TaxpayerCheck() {
  const { setSeo } = useSeo('/taxpayer');
  const [inn, setInn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TaxpayerStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Проверка самозанятого - Sud',
      description: 'Проверьте статус самозанятого по ИНН. Узнайте, является ли плательщиком налога на профессиональный доход (НПД).',
      keywords: 'проверка самозанятого, ИНН, налог на профессиональный доход, НПД',
      ogTitle: 'Проверка самозанятого - Sud',
      ogDescription: 'Проверьте статус самозанятого по ИНН онлайн.',
    });
  }, [setSeo]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Валидация ИНН
    if (!inn.trim()) {
      setError('Пожалуйста, введите ИНН');
      return;
    }

    if (!isValidInn(inn)) {
      setError('ИНН должен содержать 12 цифр');
      return;
    }

    setIsLoading(true);

    try {
      const response = await checkTaxpayerStatus(inn);
      setResult(response);
    } catch (err: any) {
      // Display the specific error message from the API
      setError(err.message || 'Произошла неизвестная ошибка. Попробуйте позже.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Проверка самозанятого
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Проверьте, является ли ИНН плательщиком налога на профессиональный доход
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Как это работает?</p>
          <p>Сервис использует API Федеральной налоговой службы РФ для проверки статуса самозанятого (плательщика НПД).</p>
          <p className="mt-2 text-xs opacity-80">Лимит: 2 запроса в минуту на IP адрес. Используйте на свой страх и риск.</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label htmlFor="inn" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              ИНН (12 цифр)
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                id="inn"
                value={inn}
                onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="000000000000"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
                maxLength={12}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || inn.length !== 12}
            className="w-full bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl text-sm font-bold transition-colors shadow-sm"
          >
            {isLoading ? 'Проверка...' : 'Проверить статус'}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border ${
          result.status 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-4">
            {result.status ? (
              <CheckCircle className="w-10 h-10 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-10 h-10 text-red-500 shrink-0" />
            )}
            <div>
              <h3 className={`text-lg font-bold ${result.status ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {result.status ? 'Самозанятый найден' : 'Не является самозанятым'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {result.message}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                ИНН: {inn}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
