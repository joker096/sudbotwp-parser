import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, MapPin, Phone, Mail, FileText, Clock, Check, Loader2, ArrowRight, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeo } from '../hooks/useSeo';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { lawyerApplications } from '../lib/supabase';
import MathCaptcha from '../components/MathCaptcha';

const SPECIALIZATIONS = [
  'Гражданские дела',
  'Уголовные дела',
  'Семейные дела',
  'Арбитраж',
  'Недвижимость и земля',
  'Трудовые споры',
  'Наследственные дела',
  'Банкротство',
  'Административные дела',
  'Защита прав потребителей',
];

const RUSSIAN_REGIONS = [
  'Москва и Московская область',
  'Санкт-Петербург и Ленинградская область',
  'Краснодарский край',
  'Свердловская область',
  'Татарстан',
  'Нижегородская область',
  'Новосибирская область',
  'Ростовская область',
  'Челябинская область',
  'Воронежская область',
  'Пермский край',
  'Волгоградская область',
  'Казань',
  'Самара',
  'Тюмень',
];

export default function ApplyLawyer() {
  const navigate = useNavigate();
  const { setSeo } = useSeo('/apply-lawyer');
  const { user, profileData, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [checkComplete, setCheckComplete] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    city: '',
    region: '',
    phone: '',
    email: '',
    experience_years: '',
    description: '',
    certificate_number: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setSeo({
      title: 'Стать юристом - Заявка на регистрацию',
      description: 'Присоединяйтесь к платформе Sud. Зарегистрируйтесь как юрист и получайте клиентов.',
      keywords: 'юрист, регистрация, стать юристом, работа юристом',
    });
  }, [setSeo]);

  useEffect(() => {
    if (user?.id) {
      checkExistingApplication();
    } else {
      setCheckComplete(true);
    }
  }, [user]);

  const checkExistingApplication = async () => {
    if (!user?.id) {
      setCheckComplete(true);
      return;
    }
    try {
      const { data } = await lawyerApplications.getByUser(user.id);
      if (data) {
        setExistingApplication(data);
      }
    } catch (error) {
      console.error('Error checking application:', error);
    } finally {
      setCheckComplete(true);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Введите ваше имя';
    if (!formData.specialization) newErrors.specialization = 'Выберите специализацию';
    if (!formData.city.trim()) newErrors.city = 'Введите город';
    if (!formData.region) newErrors.region = 'Выберите регион';
    if (!formData.phone.trim()) newErrors.phone = 'Введите телефон';
    if (!formData.email.trim()) newErrors.email = 'Введите email';
    if (!formData.experience_years) newErrors.experience_years = 'Укажите опыт';
    if (!formData.description.trim()) newErrors.description = 'Опишите вашу практику';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('Для подачи заявки необходимо войти в аккаунт', 'error');
      navigate('/login');
      return;
    }

    if (!validateForm()) return;

    if (!captchaVerified) {
      showToast('Пожалуйста, подтвердите, что вы не робот', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await lawyerApplications.submit({
        user_id: user.id,
        name: formData.name,
        specialization: formData.specialization,
        city: formData.city,
        region: formData.region,
        phone: formData.phone,
        email: formData.email,
        experience_years: parseInt(formData.experience_years),
        description: formData.description,
        certificate_number: formData.certificate_number || undefined,
      });

      if (error) {
        showToast('Ошибка при отправке заявки', 'error');
        console.error('Application error:', error);
      } else {
        showToast('Заявка отправлена! Мы рассмотрим её в ближайшее время.', 'success');
        checkExistingApplication();
      }
    } catch (error) {
      showToast('Произошла ошибка', 'error');
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!checkComplete) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (existingApplication) {
    const statusColors = {
      pending: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
    };
    const statusLabels = {
      pending: 'На рассмотрении',
      approved: 'Одобрено',
      rejected: 'Отклонено',
    };

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full ${statusColors[existingApplication.status as keyof typeof statusColors]} bg-opacity-20 flex items-center justify-center mx-auto mb-4`}>
              <Check className={`w-10 h-10 ${statusColors[existingApplication.status as keyof typeof statusColors]} text-white`} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ваша заявка</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Статус: <span className={`font-bold ${statusColors[existingApplication.status as keyof typeof statusColors]} text-white px-2 py-1 rounded-lg`}>
                {statusLabels[existingApplication.status as keyof typeof statusLabels]}
              </span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Имя</span>
              <span className="font-medium text-slate-900 dark:text-white">{existingApplication.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Специализация</span>
              <span className="font-medium text-slate-900 dark:text-white">{existingApplication.specialization}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Город</span>
              <span className="font-medium text-slate-900 dark:text-white">{existingApplication.city}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Опыт</span>
              <span className="font-medium text-slate-900 dark:text-white">{existingApplication.experience_years} лет</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-slate-500 dark:text-slate-400">Дата подачи</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {new Date(existingApplication.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>

          {existingApplication.status === 'rejected' && existingApplication.admin_notes && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Причина отказа:</p>
              <p className="text-sm text-red-600 dark:text-red-400">{existingApplication.admin_notes}</p>
            </div>
          )}

          {existingApplication.status === 'pending' && (
            <p className="mt-6 text-center text-slate-500 dark:text-slate-400 text-sm">
              Мы рассматриваем заявки в течение 2-3 рабочих дней. После одобрения вы получите доступ к личному кабинету юриста.
            </p>
          )}

          <div className="mt-8 flex gap-4">
            <Link to="/" className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white py-3 px-6 rounded-xl font-bold text-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              На главную
            </Link>
            <Link to="/lawyers" className="flex-1 bg-accent text-white py-3 px-6 rounded-xl font-bold text-center hover:bg-accent/90 transition-colors">
              К юристам
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Стать юристом
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Присоединяйтесь к платформе Sud и получайте новых клиентов
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Shield className="w-8 h-8 text-accent mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Проверенные клиенты</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Доступ к проверенным обращениям</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Clock className="w-8 h-8 text-accent mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Экономия времени</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Автоматический подбор дел</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <FileText className="w-8 h-8 text-accent mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Личный кабинет</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Управление клиентами онлайн</p>
        </div>
      </div>

      {!user && (
        <div className="bg-accent/10 border border-accent/30 p-4 rounded-xl mb-6">
          <p className="text-sm text-accent font-medium">
            Для подачи заявки необходимо <Link to="/login" className="underline">войти в аккаунт</Link> или <Link to="/login" className="underline">зарегистрироваться</Link>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">ФИО или название юридической практики *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
            placeholder="Иван Иванов"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Специализация *</label>
          <select
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${errors.specialization ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
          >
            <option value="">Выберите специализацию</option>
            {SPECIALIZATIONS.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
          {errors.specialization && <p className="text-red-500 text-sm mt-1">{errors.specialization}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Город *</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${errors.city ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
              placeholder="Москва"
            />
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Регион *</label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${errors.region ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
            >
              <option value="">Выберите регион</option>
              {RUSSIAN_REGIONS.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Телефон *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${errors.phone ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
              placeholder="+7 (999) 123-45-67"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Опыт работы (лет) *</label>
            <input
              type="number"
              min="0"
              max="50"
              value={formData.experience_years}
              onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${errors.experience_years ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all`}
              placeholder="5"
            />
            {errors.experience_years && <p className="text-red-500 text-sm mt-1">{errors.experience_years}</p>}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Номер证书 (если есть)</label>
            <input
              type="text"
              value={formData.certificate_number}
              onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              placeholder="XX № 123456"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">О себе *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all resize-none`}
            placeholder="Расскажите о вашей практике, специализации и достижениях..."
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        <MathCaptcha onVerify={(valid) => setCaptchaVerified(valid)} />

        <button
          type="submit"
          disabled={loading || !user || !captchaVerified}
          className={`w-full ${
            !captchaVerified
              ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
              : 'bg-accent hover:bg-accent/90'
          } text-white py-4 px-6 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              Отправить заявку
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
          Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных
        </p>
      </form>
    </div>
  );
}
