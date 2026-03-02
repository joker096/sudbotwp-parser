import { useState, useEffect } from 'react';
import { Bell, BellOff, Send, Check, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';

// Define props based on what's needed from Profile.tsx
interface NotificationSettingsProps {
  profileData: any; // Type should be more specific if available
  updateProfile: (data: any) => Promise<{ error: any }>;
  user: any; // Type should be more specific
}

export default function NotificationSettings({ profileData, updateProfile, user }: NotificationSettingsProps) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState({
    browserNotifications: false,
    telegramBot: false,
    telegramChatId: '',
    notifyBeforeHours: 24,
    notifyOnHearing: true,
    notifyOnDeadline: true,
    notifyOnResult: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profileData?.notification_settings) {
      setSettings(prev => ({ ...prev, ...profileData.notification_settings }));
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      setSettings(prev => ({ ...prev, browserNotifications: true }));
    }
  }, [profileData]);

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Ваш браузер не поддерживает уведомления');
      return;
    }

    if (Notification.permission === 'granted') {
      setSettings(prev => ({ ...prev, browserNotifications: true }));
      showToast('Уведомления уже включены');
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setSettings(prev => ({ ...prev, browserNotifications: true }));
        showToast('Уведомления включены!');
      } else {
        showToast('Вы запретили уведомления в браузере');
      }
    } else {
      showToast('Уведомления запрещены в настройках браузера. Разрешите их вручную.');
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const { error } = await updateProfile({
        notification_settings: settings
      });

      if (!error) {
        showToast('Настройки уведомлений сохранены');
      } else {
        showToast('Ошибка сохранения настроек');
      }
    } catch (err) {
      console.error('Error saving notification settings:', err);
      showToast('Ошибка сохранения настроек');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Уведомления</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Настройте получение уведомлений о заседаниях и событиях по вашим делам</p>
      
      {/* Уведомления в браузере */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.browserNotifications ? (
              <Bell className="w-5 h-5 text-emerald-500" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">Уведомления в браузере</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Получайте push-уведомления о заседаниях</p>
            </div>
          </div>
          <button
            onClick={requestBrowserNotifications}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              settings.browserNotifications
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {settings.browserNotifications ? 'Включено' : 'Включить'}
          </button>
        </div>
      </div>

      {/* Telegram бот */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">Telegram бот</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Получайте уведомления в Telegram</p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, telegramBot: !prev.telegramBot }))}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              settings.telegramBot
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {settings.telegramBot ? 'Включено' : 'Выключено'}
          </button>
        </div>
        
        {settings.telegramBot && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Для подключения бота:
            </p>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mb-3">
              <li>1. Откройте бота <a href="https://t.me/ur_sud_bot" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">@ur_sud_bot</a> в Telegram</li>
              <li>2. Отправьте команду /start</li>
              <li>3. Введите /connect ваш_email (например: /connect example@mail.ru)</li>
            </ol>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.telegramChatId}
                onChange={(e) => setSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                placeholder="ID чата (если требуется)"
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* Время уведомления */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">Уведомлять за</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">До начала заседания</p>
          </div>
          <select
            value={settings.notifyBeforeHours}
            onChange={(e) => setSettings(prev => ({ ...prev, notifyBeforeHours: parseInt(e.target.value) }))}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            <option value={1}>1 час</option>
            <option value={3}>3 часа</option>
            <option value={6}>6 часов</option>
            <option value={12}>12 часов</option>
            <option value={24}>24 часа (1 день)</option>
            <option value={48}>48 часов (2 дня)</option>
            <option value={168}>1 неделя</option>
          </select>
        </div>
      </div>

      {/* Типы уведомлений */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4">
        <p className="font-bold text-slate-900 dark:text-white text-sm mb-3">Типы уведомлений</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-700 dark:text-slate-300">О заседаниях</span>
            <input
              type="checkbox"
              checked={settings.notifyOnHearing}
              onChange={(e) => setSettings(prev => ({ ...prev, notifyOnHearing: e.target.checked }))}
              className="w-5 h-5 rounded text-accent focus:ring-accent"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-700 dark:text-slate-300">О сроках обжалования</span>
            <input
              type="checkbox"
              checked={settings.notifyOnDeadline}
              onChange={(e) => setSettings(prev => ({ ...prev, notifyOnDeadline: e.target.checked }))}
              className="w-5 h-5 rounded text-accent focus:ring-accent"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-700 dark:text-slate-300">О результатах рассмотрения</span>
            <input
              type="checkbox"
              checked={settings.notifyOnResult}
              onChange={(e) => setSettings(prev => ({ ...prev, notifyOnResult: e.target.checked }))}
              className="w-5 h-5 rounded text-accent focus:ring-accent"
            />
          </label>
        </div>
      </div>

      <button
        onClick={saveSettings}
        disabled={isLoading}
        className="w-full bg-accent hover:bg-accent-light text-white py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        Сохранить настройки
      </button>
    </div>
  );
}