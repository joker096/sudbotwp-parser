import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Loader2, Building, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

interface MonitoredCompany {
  id: string;
  inn: string;
  name: string;
  last_check_at?: string;
  created_at: string;
}

interface CompanyEvent {
  id: string;
  company_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  is_read: boolean;
}

export default function MonitoredCompaniesSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<MonitoredCompany[]>([]);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newInn, setNewInn] = useState('');
  const [newName, setNewName] = useState('');
  const [showEvents, setShowEvents] = useState(false);

  useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user]);

  const loadCompanies = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('monitored_companies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCompanies(data);
    }

    setIsLoading(false);
  };

  const loadEvents = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_events', { p_user_id: user.id });

      if (error) {
        console.warn('get_user_events error:', error);
        setEvents([]);
        return;
      }

      if (data) {
        setEvents(data);
      }
    } catch (err) {
      console.warn('get_user_events exception:', err);
      setEvents([]);
    }
  };

  const handleAdd = async () => {
    if (!user || !newInn.trim()) {
      showToast('Введите ИНН');
      return;
    }

    const cleanInn = newInn.replace(/\D/g, '');
    if (cleanInn.length !== 10 && cleanInn.length !== 12) {
      showToast('ИНН должен содержать 10 или 12 цифр');
      return;
    }

    setIsAdding(true);

    const { error } = await supabase
      .from('monitored_companies')
      .insert({
        user_id: user.id,
        inn: cleanInn,
        name: newName.trim() || undefined,
      });

    if (error) {
      if (error.message?.includes('duplicate')) {
        showToast('Эта компания уже в мониторинге');
      } else {
        showToast('Ошибка при добавлении');
      }
    } else {
      showToast('Компания добавлена в мониторинг');
      setNewInn('');
      setNewName('');
      loadCompanies();
    }

    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить компанию из мониторинга?')) return;

    const { error } = await supabase
      .from('monitored_companies')
      .delete()
      .eq('id', id);

    if (!error) {
      showToast('Компания удалена');
      setCompanies(companies.filter((c) => c.id !== id));
    }
  };

  const getEventLabel = (type: string) => {
    const labels: Record<string, string> = {
      director_changed: 'Сменился директор',
      status_changed: 'Изменился статус',
      address_changed: 'Изменился адрес',
      new_fssp: 'Новые исполнительные производства',
      new_bankruptcy: 'Новые дела о банкротстве',
    };
    return labels[type] || type;
  };

  const getEventColor = (type: string) => {
    if (type.includes('fssp') || type.includes('bankruptcy')) return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    if (type.includes('director') || type.includes('status')) return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
    return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 text-center">
        <Bell className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Войдите, чтобы управлять мониторингом компаний</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          Мои контрагенты
        </h2>
        <button
          onClick={() => { setShowEvents(!showEvents); if (!showEvents) loadEvents(); }}
          className="text-sm text-accent font-bold hover:underline"
        >
          {showEvents ? 'Скрыть события' : 'Лента событий'}
        </button>
      </div>

      {/* Add Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4">Добавить компанию в мониторинг</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newInn}
            onChange={(e) => setNewInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="ИНН (10 или 12 цифр)"
            className="flex-1 bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название (необязательно)"
            className="flex-1 bg-slate-50 dark:bg-slate-800 py-3 px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || newInn.length < 10}
            className="bg-accent hover:bg-accent-light disabled:opacity-50 text-white py-3 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Добавить
          </button>
        </div>
      </div>

      {/* Events Feed */}
      <AnimatePresence>
        {showEvents && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4">Лента событий</h3>
              {events.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Событий пока нет</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {events.map((event) => (
                    <div key={event.id} className={`p-3 rounded-xl ${getEventColor(event.event_type)}`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {getEventLabel(event.event_type)}
                          </p>
                          <p className="text-xs opacity-80">
                            {event.company_name} (ИНН: {event.company_inn})
                          </p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(event.created_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Companies List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 text-center">
          <Building className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Нет отслеживаемых компаний</p>
          <p className="text-xs text-slate-400 mt-1">Добавьте ИНН выше — система будет следить за изменениями</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="w-4 h-4 text-accent" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {company.name || 'Компания'}
                  </h4>
                </div>
                <p className="text-xs text-slate-500">ИНН: {company.inn}</p>
                {company.last_check_at && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    Проверено: {new Date(company.last_check_at).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(company.id)}
                className="p-2 text-slate-400 hover:text-red-500 transition-all"
                title="Удалить из мониторинга"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
