import { useState } from 'react';
import { Search, Gavel, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { searchCivilCases, type CivilCase } from '../lib/counterparty';
import { useSeo } from '../hooks/useSeo';
import { useToast } from '../hooks/useToast';

export default function CivilCasesPage() {
  const { setSeo } = useSeo('/civil-cases');
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cases, setCases] = useState<CivilCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  setSeo({
    title: 'Суды общей юрисдикции — Sud',
    description: 'Поиск по банку данных судебных решений (ГАС Правосудие). Суды общей юрисдикции.',
    keywords: 'суды общей юрисдикции, ГАС, судебные решения, мировые суды',
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

    try {
      showToast('Ищем в ГАС...');
      const result = await searchCivilCases(query);
      setCases(result.cases);
      setTotal(result.total);

      if (result.cases.length === 0) {
        setError('Дела не найдены. Попробуйте изменить запрос.');
      }
    } catch (err) {
      setError('Ошибка при поиске. Сервис может быть временно недоступен.');
      showToast('Ошибка при поиске в ГАС');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 transition-all duration-300 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Gavel className="w-7 h-7 text-accent" />
          Суды общей юрисдикции
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Поиск по банку данных судебных решений (ГАС Правосудие)
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ФИО, ИНН или номер дела"
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

      {/* Results */}
      {cases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Найдено дел: {cases.length}
            </h2>
          </div>

          <div className="space-y-3">
            {cases.map((caseItem, index) => (
              <div
                key={`${caseItem.number}-${index}`}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        {caseItem.number || '—'}
                      </span>
                      {caseItem.date && (
                        <span className="text-xs text-slate-500">{caseItem.date}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{caseItem.court}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {caseItem.plaintiff && (
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-medium">Истец:</span> {caseItem.plaintiff}
                        </p>
                      )}
                      {caseItem.defendant && (
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-medium">Ответчик:</span> {caseItem.defendant}
                        </p>
                      )}
                      {caseItem.judge && (
                        <p className="text-xs text-slate-500">Судья: {caseItem.judge}</p>
                      )}
                    </div>
                    {caseItem.category && (
                      <span className="inline-block mt-2 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
                        {caseItem.category}
                      </span>
                    )}
                  </div>
                  {caseItem.url && (
                    <a
                      href={caseItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 text-accent hover:text-accent-light transition-all"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
