import { useState, useEffect } from 'react';
import { 
  HelpCircle, Users, CreditCard, FileText, Search, 
  TrendingUp, Shield, AlertTriangle, CheckCircle, ArrowRight,
  Briefcase, MessageSquare, Settings, BookOpen,
  ExternalLink, Copy, Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSeo } from '../hooks/useSeo';
import SafeLink from '../components/SafeLink';

// Иконка рубля
function RubleIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      aria-hidden="true"
    >
      <text x="12" y="16" fontSize="14" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">₽</text>
    </svg>
  );
}

const faqSections = [
  {
    title: 'Как работает платформа',
    icon: HelpCircle,
    items: [
      {
        q: 'Что такое Sud?',
        a: 'Sud — это платформа для подбора юристов и мониторинга судебных дел. Мы соединяем людей, которым нужна юридическая помощь, с квалифицированными юристами.'
      },
      {
        q: 'Как найти юриста?',
        a: 'Перейдите в раздел "Юристы" или оставьте заявку. Система подберёт специалиста по вашей ситуации.'
      },
      {
        q: 'Как добавить дело для отслеживания?',
        a: 'В разделе "Поиск" вставьте ссылку на дело с сайта суда (sudrf.ru или mos-sud.ru). Система распознает данные и будет уведомлять об изменениях.'
      }
    ]
  },
  {
    title: 'Покупка лидов',
    icon: CreditCard,
    items: [
      {
        q: 'Как купить лид?',
        a: '1. Перейдите в раздел "Лиды"\n2. Выберите заявку по нужным параметрам\n3. Нажмите "Купить"\n4. Оплатите через криптовалюту\n5. Получите контакты клиента'
      },
      {
        q: 'Сколько стоят лиды?',
        a: 'Цена зависит от параметров заявки:\n• Низкий бюджет: 400-500₽\n• Средний бюджет: 750-1500₽\n• Высокий бюджет + срочно: 2000-3000₽'
      },
      {
        q: 'Как формируется цена лида?',
        a: 'Автоматически на основе:\n• Бюджета клиента\n• Срочности дела\n• Типа дела (гражданское, уголовное, арбитраж)'
      },
      {
        q: 'Можно ли получить скидку?',
        a: 'Да! При покупке от 10 лидов — скидка 10%, от 50 лидов — 20%. Обратитесь к менеджеру для подключения.'
      }
    ]
  },
  {
    title: 'Обработка лидов',
    icon: Briefcase,
    items: [
      {
        q: 'После покупки — что дальше?',
        a: '1. Вам открываются контакты клиента\n2. Свяжитесь с ним в течение 30 минут\n3. Проведите консультацию\n4. Заключите договор\n5. Отметьте результат в системе'
      },
      {
        q: 'Что делать если клиент не отвечает?',
        a: 'Позвоните 2-3 раза в первый день. Если нет ответа — отметьте в системе "Нет ответа". Это поможет нам улучшить качество лидов.'
      },
      {
        q: 'Как оставить отзыв о лиде?',
        a: 'В разделе "Мои лиды" нажмите на лид и оцените: был ли полезен, удалось ли заключить договор. Ваш фидбек улучшает систему.'
      },
      {
        q: 'Можно ли вернуть деньги за лид?',
        a: 'В течение 24 часов, если:\n• Контакты неверные\n• Клиент уже нашёл юриста\n• Заявка была неактуальна'
      }
    ]
  },
  {
    title: 'Оплата',
    icon: RubleIcon,
    items: [
      {
        q: 'Какие способы оплаты?',
        a: 'Мы принимаем криптовалюту (USDT, BTC, ETH) через Paymento. Также доступен перевод на карту — обратитесь к менеджеру.'
      },
      {
        q: 'Как пополнить баланс?',
        a: '1. Перейдите в профиль\n2. Нажмите "Пополнить"\n3. Выберите сумму\n4. Оплатите по QR-коду или реквизитам'
      },
      {
        q: 'Есть ли абонемент?',
        a: 'Да! Пакеты:\n• 10 лидов — 7 000₽ (экономия 30%)\n• 50 лидов — 30 000₽ (экономия 40%)\n• 100 лидов — 50 000₽ (экономия 50%)'
      }
    ]
  },
  {
    title: 'Мониторинг дел',
    icon: Search,
    items: [
      {
        q: 'Как добавить дело на мониторинг?',
        a: '1. В разделе "Мониторинг" нажмите "Добавить"\n2. Вставьте ссылку на дело с sudrf.ru\n3. Система сама найдёт и отследит дело\n4. При изменениях — уведомление'
      },
      {
        q: 'Сколько дел можно отслеживать?',
        a: 'В бесплатном тарифе — до 5 дел. Pro тариф — неограниченно.'
      },
      {
        q: 'Какие уведомления приходят?',
        a: '• Назначение заседания\n• Результат рассмотрения\n• Изменение статуса\n• Новые материалы дела'
      }
    ]
  },
  {
    title: 'Безопасность',
    icon: Shield,
    items: [
      {
        q: 'Как защищены мои данные?',
        a: 'Все данные шифруются. Мы используем Supabase (безопасное облако) и соблюдаем 152-ФЗ о персональных данных.'
      },
      {
        q: 'Конфиденциальность клиентов?',
        a: 'Контакты клиентов раскрываются только после оплаты. До этого момента они защищены в системе.'
      }
    ]
  }
];

const stepsForLawyers = [
  {
    step: 1,
    title: 'Зарегистрируйтесь',
    desc: 'Создайте аккаунт через Google или email',
    icon: Users
  },
  {
    step: 2,
    title: 'Выберите специализацию',
    desc: 'Укажите типы дел, которые вы ведёте',
    icon: Settings
  },
  {
    step: 3,
    title: 'Пополните баланс',
    desc: 'Купите лиды или оформите подписку',
    icon: CreditCard
  },
  {
    step: 4,
    title: 'Получайте заявки',
    desc: 'Покупайте лиды и связывайтесь с клиентами',
    icon: MessageSquare
  },
  {
    step: 5,
    title: 'Заключайте договоры',
    desc: 'Превращайте лиды в реальных клиентов',
    icon: TrendingUp
  }
];

export default function Help() {
  const { setSeo } = useSeo('/help');
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Центр помощи - Sud',
      description: 'Ответы на частые вопросы о работе платформы Sud. Как использовать мониторинг дел, покупать лиды и работать с юристами.',
      keywords: 'помощь, FAQ, вопросы, поддержка, лиды, мониторинг',
      ogTitle: 'Центр помощи - Sud',
      ogDescription: 'Ответы на частые вопросы о работе платформы.',
    });
  }, [setSeo]);

  const toggleSection = (index: number) => {
    setOpenSection(openSection === index ? null : index);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText('support@cvr.name');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-3xl mb-4">
          <HelpCircle className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Центр помощи
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Всё о работе с платформой Sud — от регистрации до успешных продаж
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
          <div className="text-3xl font-bold text-accent mb-1">500+</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Активных юристов</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
          <div className="text-3xl font-bold text-accent mb-1">10k+</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Успешных дел</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
          <div className="text-3xl font-bold text-accent mb-1">85%</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Конверсия</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
          <div className="text-3xl font-bold text-accent mb-1">24/7</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Поддержка</div>
        </div>
      </div>

      {/* Как начать (для юристов) */}
      <div className="bg-gradient-to-br from-accent/5 to-accent/10 dark:from-accent/10 dark:to-accent/5 rounded-3xl p-6 border border-accent/20">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          Как начать зарабатывать
        </h2>
        
        <div className="grid md:grid-cols-5 gap-4">
          {stepsForLawyers.map((item, index) => (
            <div key={index} className="relative">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {item.step}. {item.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {item.desc}
                </div>
              </div>
              {index < stepsForLawyers.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-4">
        {faqSections.map((section, sectionIndex) => (
          <div 
            key={sectionIndex}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <button
              onClick={() => toggleSection(sectionIndex)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                <section.icon className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">{section.title}</h3>
              </div>
              <ChevronDown 
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  openSection === sectionIndex ? 'rotate-180' : ''
                }`} 
              />
            </button>
            
            {openSection === sectionIndex && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="px-5 pb-5 space-y-4"
              >
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">{item.q}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                      {item.a}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Pricing Example */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <span className="text-accent text-lg">₽</span>
          Пример заработка
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-2">Базовый</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">50 000₽</div>
            <div className="text-xs text-slate-500">10 лидов × 5 000₽</div>
          </div>
          <div className="bg-accent/10 rounded-xl p-4 border-2 border-accent">
            <div className="text-sm text-accent mb-2 font-bold">Оптимальный</div>
            <div className="text-2xl font-bold text-accent mb-1">150 000₽</div>
            <div className="text-xs text-slate-500">30 лидов × 5 000₽</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-2">Максимальный</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">500 000₽</div>
            <div className="text-xs text-slate-500">100 лидов × 5 000₽</div>
          </div>
        </div>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
          * Средний чек юридических услуг: 30 000-100 000₽
        </p>
      </div>

      {/* Contact */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Остались вопросы?</h2>
        <p className="text-slate-300 mb-6">
          Наша команда поддержки работает 24/7 и поможет разобраться с любым вопросом
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={copyEmail}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-6 py-3 transition-colors"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Скопировано!' : 'support@cvr.name'}
          </button>
          <SafeLink 
            href="https://t.me/cvrname/4243" 
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-light rounded-xl px-6 py-3 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            Telegram чат
          </SafeLink>
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
