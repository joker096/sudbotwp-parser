import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Save, AlertCircle, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface SiteSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('key', { ascending: true });

      if (error) {
        throw error;
      }

      setSettings(data as SiteSetting[]);
    } catch (err: any) {
      setError('Не удалось загрузить настройки сайта.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setSettings(currentSettings =>
      currentSettings.map(s => (s.id === id ? { ...s, value } : s))
    );
  };

  const handleToggleChange = (id: string) => {
    setSettings(currentSettings =>
      currentSettings.map(s => {
        if (s.id === id) {
          const newValue = s.value === 'true' ? 'false' : 'true';
          return { ...s, value: newValue };
        }
        return s;
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Обновляем все настройки
      for (const setting of settings) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: setting.value })
          .eq('id', setting.id);

        if (error) throw error;
      }

      showToast('Настройки успешно сохранены');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      showToast('Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  const getGaMeasurementId = () => {
    return settings.find(s => s.key === 'ga_measurement_id')?.value || '';
  };

  const getGaEnabled = () => {
    return settings.find(s => s.key === 'ga_enabled')?.value === 'true';
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

  const gaIdSetting = settings.find(s => s.key === 'ga_measurement_id');
  const gaEnabledSetting = settings.find(s => s.key === 'ga_enabled');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Настройки администратора</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Управление системными настройками сайта
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить
        </button>
      </div>

      {/* Google Analytics Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">Google Analytics</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Отслеживание посещаемости сайта
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* GA Enabled Toggle */}
          {gaEnabledSetting && (
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Включить Google Analytics</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {gaEnabledSetting.description}
                </p>
              </div>
              <button
                onClick={() => handleToggleChange(gaEnabledSetting.id)}
                className="p-1"
              >
                {getGaEnabled() ? (
                  <ToggleRight className="w-8 h-8 text-accent" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400" />
                )}
              </button>
            </div>
          )}

          {/* GA Measurement ID */}
          {gaIdSetting && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Measurement ID
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {gaIdSetting.description}
              </p>
              <input
                type="text"
                value={gaIdSetting.value}
                onChange={(e) => handleInputChange(gaIdSetting.id, e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Предпросмотр статуса */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Статус:</strong>{' '}
          {getGaEnabled() && getGaMeasurementId() ? (
            <span className="text-green-600 dark:text-green-400">
              Google Analytics активен (ID: {getGaMeasurementId()})
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              Google Analytics отключен
            </span>
          )}
        </p>
      </div>
    </div>
  );
}