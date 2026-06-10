import { useState, useEffect } from 'react';
import { supabase, lawyerApplications } from '../lib/supabase';
import { Loader2, Check, X, Clock, User, MapPin, Phone, Mail, FileText, MessageSquare, ChevronDown, Search, Filter } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface LawyerApplication {
  id: string;
  user_id: string;
  name: string;
  specialization: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  experience_years: number;
  description: string;
  certificate_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function LawyerApplicationsAdmin() {
  const [applications, setApplications] = useState<LawyerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<LawyerApplication | null>(null);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter as 'pending' | 'approved' | 'rejected';
      const { data, error } = await lawyerApplications.getAll(status);
      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      showToast('Ошибка загрузки заявок', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setProcessing(true);
    try {
      const { error } = await lawyerApplications.approve(selectedApp.id, adminNotes || undefined);
      if (error) throw error;
      showToast('Заявка одобрена', 'success');
      setSelectedApp(null);
      setAdminNotes('');
      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      showToast('Ошибка при одобрении заявки', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !adminNotes.trim()) {
      showToast('Укажите причину отказа', 'error');
      return;
    }
    setProcessing(true);
    try {
      const { error } = await lawyerApplications.reject(selectedApp.id, adminNotes);
      if (error) throw error;
      showToast('Заявка отклонена', 'success');
      setSelectedApp(null);
      setAdminNotes('');
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      showToast('Ошибка при отклонении заявки', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filteredApps = applications.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.name.toLowerCase().includes(query) ||
      app.city.toLowerCase().includes(query) ||
      app.specialization.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query)
    );
  });

  const statusColors = {
    pending: 'bg-yellow-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Заявки на регистрацию юристов</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Рассматривайте и одобряйте заявки</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white text-sm"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white text-sm"
          >
            <option value="pending">На рассмотрении</option>
            <option value="approved">Одобренные</option>
            <option value="rejected">Отклонённые</option>
            <option value="all">Все</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Заявок не найдено
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map(app => (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 hover:border-accent/50 transition-all cursor-pointer"
              onClick={() => setSelectedApp(app)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white">{app.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColors[app.status]}`}>
                      {app.status === 'pending' ? 'На рассмотрении' : app.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{app.specialization}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {app.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {app.experience_years} лет
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(app.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Заявка от {selectedApp.name}</h3>
                <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Город</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedApp.city}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Регион</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedApp.region}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Телефон</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedApp.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedApp.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Опыт работы</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedApp.experience_years} лет</p>
                </div>
                {selectedApp.certificate_number && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Номер证书</p>
                    <p className="font-medium text-slate-900 dark:text-white">{selectedApp.certificate_number}</p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">О себе</p>
                <p className="text-slate-900 dark:text-white text-sm">{selectedApp.description}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Комментарий администратора</p>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={selectedApp.status === 'rejected' ? 'Укажите причину отказа...' : 'Комментарий (опционально)...'}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm"
                  rows={3}
                />
              </div>
            </div>

            {selectedApp.status === 'pending' && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                  Отклонить
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Одобрить
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
