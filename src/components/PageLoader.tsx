import { memo } from 'react';

interface PageLoaderProps {
  text?: string;
  withBackground?: boolean;
}

function PageLoader({ text = 'Загрузка страницы...', withBackground = false }: PageLoaderProps) {
  const containerClasses = `min-h-screen flex items-center justify-center ${withBackground ? 'bg-[#f8f9fa] dark:bg-slate-950' : ''}`;

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </div>
  );
}

export default memo(PageLoader);