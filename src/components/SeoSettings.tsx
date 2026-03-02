import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Save, AlertCircle, Globe } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface SeoSetting {
  id: string;
  page_path: string;
  meta_title: string;
  meta_description: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  noindex: boolean;
  nofollow: boolean;
}

export default function SeoSettings() {
  const [settings, setSettings] = useState<SeoSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSeoSettings();
  }, []);

  const fetchSeoSettings = async () => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('page_seo')
      .select('*')
      .order('page_path', { ascending: true });

    if (error) {
      setError('Не удалось загрузить настройки SEO.');
      console.error(error);
    } else {
      setSettings(data as SeoSetting[]);
    }
    setIsLoading(false);
  };

  const handleInputChange = (id: string, field: keyof SeoSetting, value: string | boolean) => {
    setSettings(currentSettings =>
      currentSettings.map(s => (s.id === id ? { ...s, [field]: value } : s))
    );
    if (editingId !== id) {
      setEditingId(id);
    }
  };

  const handleSave = async (id: string) => {
    const settingToSave = settings.find(s => s.id === id);
    if (!settingToSave) return;

    setSavingId(id);
    const { error } = await supabase
      .from('page_seo')
      .update({
        meta_title: settingToSave.meta_title,
        meta_description: settingToSave.meta_description,
        meta_keywords: settingToSave.meta_keywords,
        og_title: settingToSave.og_title,
        og_description: settingToSave.og_description,
        og_image: settingToSave.og_image,
        noindex: settingToSave.noindex,
        nofollow: settingToSave.nofollow,
      })
      .eq('id', id);

    if (error) {
      showToast('Ошибка сохранения');
      console.error(error);
    } else {
      showToast(`Настройки для ${settingToSave.page_path} сохранены`);
      setEditingId(null);
    }
    setSavingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Управление SEO</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Здесь вы можете редактировать мета-теги для основных страниц сайта.
      </p>
      <div className="space-y-4">
        {settings.map(setting => (
          <div key={setting.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-accent" />
                <h4 className="font-bold text-slate-900 dark:text-white text-lg">{setting.page_path}</h4>
              </div>
              {editingId === setting.id && (
                <button
                  onClick={() => handleSave(setting.id)}
                  disabled={savingId === setting.id}
                  className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {savingId === setting.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Сохранить
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={setting.meta_title}
                  onChange={e => handleInputChange(setting.id, 'meta_title', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Keywords</label>
                <input
                  type="text"
                  value={setting.meta_keywords || ''}
                  onChange={e => handleInputChange(setting.id, 'meta_keywords', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <textarea
                  value={setting.meta_description}
                  onChange={e => handleInputChange(setting.id, 'meta_description', e.target.value)}
                  rows={2}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm resize-y"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={setting.noindex}
                    onChange={e => handleInputChange(setting.id, 'noindex', e.target.checked)}
                    className="w-4 h-4 rounded text-accent focus:ring-accent"
                  />
                  noindex
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={setting.nofollow}
                    onChange={e => handleInputChange(setting.id, 'nofollow', e.target.checked)}
                    className="w-4 h-4 rounded text-accent focus:ring-accent"
                  />
                  nofollow
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

