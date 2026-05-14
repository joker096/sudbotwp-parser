import React, { useEffect } from 'react';
import { useSiteAds } from '../hooks/useSiteAds';
import { useSeo } from '../hooks/useSeo';

/**
 * AdminSiteSettings - компонент для настроек сайта (общие и реклама)
 * Содержит настройки рекламы и SEO. Отображает текущие значения из хуков без возможности редактирования, так как полноценные формы управления находятся в отдельных админ-панелях.
 */
export const AdminSiteSettings: React.FC = () => {
  const { settings } = useSiteAds();

  // Простая настройка SEO через useSeo (только для отображения)
  useEffect(() => {
    document.title = 'Судовой Бот';
  }, []);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Настройки сайта</h3>
      
      {/* Site Ads Section */}
      <div className="border p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <h4 className="font-medium mb-2 text-sm">Реклама на сайте</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Статус: {settings.adsEnabled ? 'Включена' : 'Отключена'}<br />
        </p>
      </div>
      
      {/* SEO Section */}
      <div className="border p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <h4 className="font-medium mb-2 text-sm">SEO настройки</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">Настройки SEO управляются через административную панель сайта.</p>
      </div>
    </div>
  );
};
