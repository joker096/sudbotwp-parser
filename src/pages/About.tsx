import { useEffect } from 'react';
import { useSeo } from '../hooks/useSeo';
import { Link } from 'react-router-dom';
import { Info, Shield, Users, Scale } from 'lucide-react';

export default function About() {
  const { setSeo } = useSeo('/about');

  useEffect(() => {
    setSeo({
      title: 'О платформе CVR - Мониторинг судебных дел',
      description: 'Информация о платформе CVR. Наша миссия, команда и принципы работы.',
      keywords: 'о нас, cvr, мониторинг судебных дел, команда',
    });
  }, [setSeo]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            О платформе CVR
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Современный сервис для мониторинга судебных дел в России
          </p>
        </div>

        {/* Mission */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-accent/10 rounded-xl">
              <Scale className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Наша миссия</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Мы делаем судебную систему более прозрачной и доступной. Наша цель — предоставить каждому возможность 
                отслеживать ход судебных дел без необходимости посещать суды или звонить в канцелярию.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <Shield className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Безопасность</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Все данные передаются по защищенным каналам. Мы не передаем информацию третьим лицам.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <Users className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Для всех</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Сервис подходит как для юристов, так и для обычных граждан. Простой интерфейс и понятные уведомления.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
          >
            <span>←</span> Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}
