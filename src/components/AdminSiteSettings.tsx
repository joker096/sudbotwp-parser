import React from 'react';
import { useSiteAds } from '../hooks/useSiteAds';
import { useSeo } from '../hooks/useSeo';

/**
 * AdminSiteSettings - компонент для настроек сайта (общие и реклама)
 * Содержит настройки рекламы и SEO
 */
export const AdminSiteSettings: React.FC = () => {
  const { settings: siteAds, updateSettings: updateSiteAds } = useSiteAds();
  const { settings: seoSettings, updateSettings: updateSeo } = useSeo();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Настройки сайта</h3>
      
      {/* Site Ads Section */}
      <div className="border p-4 rounded-lg">
        <h4 className="font-medium mb-3">Рекламные баннеры</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={siteAds?.enabled ?? false}
            onChange={(e) => updateSiteAds({ enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>Включить рекламу на сайте</span>
        </label>
      </div>
      
      {/* SEO Section */}
      <div className="border p-4 rounded-lg">
        <h4 className="font-medium mb-3">SEO настройки</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Заголовок сайта</label>
            <input
              type="text"
              value={seoSettings?.title || ''}
              onChange={(e) => updateSeo({ title: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Заголовок"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Описание</label>
            <textarea
              value={seoSettings?.description || ''}
              onChange={(e) => updateSeo({ description: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Описание сайта"
            />
          </div>
        </div>
      </div>
    </div>
  );
};