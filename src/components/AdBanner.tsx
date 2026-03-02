import { memo } from 'react';
import { ExternalLink } from 'lucide-react';

function AdBanner() {
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-6 border border-slate-200 dark:border-slate-700 relative overflow-hidden group cursor-pointer transition-colors">
      <div className="absolute top-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">
        Реклама
      </div>
      <div className="w-full sm:w-40 h-32 sm:h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl shrink-0 flex items-center justify-center">
        <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">Место для баннера</span>
      </div>
      <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-accent transition-colors">
          Ваша реклама здесь
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
          Нативное размещение рекламы для вашей целевой аудитории. Привлекайте клиентов, которым нужны юридические услуги.
        </p>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-accent">
          Узнать подробнее <ExternalLink className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}

export default memo(AdBanner);
