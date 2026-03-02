import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Scale, Search } from 'lucide-react';
import { courts } from '../lib/supabase';
import { Court } from '../types';

export interface ManualData {
  number: string;
  court: string;
  category: string;
  judge: string;
  date: string;
  hearingDate: string;
  status: string;
  plaintiff: string;
  defendant: string;
  link: string;
}

interface ManualCaseEntryFormProps {
  manualData: ManualData;
  setManualData: (data: ManualData) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

function ManualCaseEntryForm({ manualData, setManualData, onSubmit, isLoading }: ManualCaseEntryFormProps) {
  const [courtList, setCourtList] = useState<Court[]>([]);
  const [filteredCourts, setFilteredCourts] = useState<Court[]>([]);
  const [courtSearch, setCourtSearch] = useState('');
  const [showCourtDropdown, setShowCourtDropdown] = useState(false);
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);

  useEffect(() => {
    loadCourts();
  }, []);

  useEffect(() => {
    if (courtSearch.trim()) {
      const filtered = courtList.filter(court => 
        court.name.toLowerCase().includes(courtSearch.toLowerCase())
      );
      setFilteredCourts(filtered);
    } else {
      setFilteredCourts([]);
    }
  }, [courtSearch, courtList]);

  const loadCourts = async () => {
    setIsLoadingCourts(true);
    const { data, error } = await courts.getAll();
    if (data) {
      setCourtList(data);
    }
    setIsLoadingCourts(false);
  };

  const handleCourtSelect = (court: Court) => {
    setManualData({...manualData, court: court.name});
    setCourtSearch(court.name);
    setShowCourtDropdown(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800"
    >
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Ручной ввод дела</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Номер дела *</label>
          <input
            type="text"
            value={manualData.number}
            onChange={(e) => setManualData({...manualData, number: e.target.value})}
            placeholder="№ 2-3981/2024"
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div className="relative">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Суд</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={courtSearch}
              onChange={(e) => {
                setCourtSearch(e.target.value);
                setShowCourtDropdown(true);
              }}
              onFocus={() => setShowCourtDropdown(true)}
              placeholder="Поиск суда..."
              className="w-full bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
            />
            {showCourtDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50"
              >
                {isLoadingCourts ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : filteredCourts.length > 0 ? (
                  filteredCourts.map(court => (
                    <div
                      key={court.id}
                      onClick={() => handleCourtSelect(court)}
                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm"
                    >
                      {court.name}
                    </div>
                  ))
                ) : courtSearch.trim() ? (
                  <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                    Суд не найден. Проверьте запрос или введите название вручную.
                  </div>
                ) : (
                  <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                    Введите название суда для поиска
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Категория</label>
          <input
            type="text"
            value={manualData.category}
            onChange={(e) => setManualData({...manualData, category: e.target.value})}
            placeholder="Категория дела"
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Судья</label>
          <input
            type="text"
            value={manualData.judge}
            onChange={(e) => setManualData({...manualData, judge: e.target.value})}
            placeholder="ФИО судьи"
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Дата регистрации</label>
          <input
            type="text"
            value={manualData.date}
            onChange={(e) => setManualData({...manualData, date: e.target.value})}
            placeholder="ДД.ММ.ГГГГ"
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Дата рассмотрения</label>
          <input
            type="text"
            value={manualData.hearingDate}
            onChange={(e) => setManualData({...manualData, hearingDate: e.target.value})}
            placeholder="ДД.ММ.ГГГГ"
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Результат</label>
          <input
            type="text"
            value={manualData.status}
            onChange={(e) => setManualData({...manualData, status: e.target.value})}
            placeholder="Статус рассмотрения"
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Истец</label>
          <input
            type="text"
            value={manualData.plaintiff}
            onChange={(e) => setManualData({...manualData, plaintiff: e.target.value})}
            placeholder="ФИО или название"
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ответчик</label>
          <input
            type="text"
            value={manualData.defendant}
            onChange={(e) => setManualData({...manualData, defendant: e.target.value})}
            placeholder="ФИО или название"
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ссылка на дело *</label>
          <input
            type="text"
            value={manualData.link}
            onChange={(e) => setManualData({...manualData, link: e.target.value})}
            placeholder="https://vsevgorsud--lo.sudrf.ru/..."
            className="w-full bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl border border-transparent focus:border-accent/30 focus:outline-none focus:ring-4 focus:ring-accent/10 text-sm font-medium text-slate-900 dark:text-white"
          />
        </div>
      </div>
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="mt-4 w-full bg-accent hover:bg-accent-light text-white py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
        Добавить дело
      </button>
    </motion.div>
  );
}

export default memo(ManualCaseEntryForm);