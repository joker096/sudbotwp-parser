import { useState, useEffect } from 'react';
import { Copy, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface CalendarSyncSettingsProps {
  profileData: any;
  updateProfile: (data: any) => Promise<{ error: any }>;
  user: any;
}

export default function CalendarSyncSettings({ profileData, updateProfile, user }: CalendarSyncSettingsProps) {
  const { showToast } = useToast();
  const [calendarSubUrl, setCalendarSubUrl] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  useEffect(() => {
    if (profileData?.calendar_token) {
      const supabaseUrl = `https://pllqhbwsxuyyqfkfbvwm.supabase.co/functions/v1/calendar-feed`;
      setCalendarSubUrl(`${supabaseUrl}?token=${profileData.calendar_token}`);
    } else {
      setCalendarSubUrl('');
    }
  }, [profileData]);

  const handleGenerateCalendarToken = async () => {
    if (!user) return;
    setIsGeneratingToken(true);
    try {
      const newToken = crypto.randomUUID();
      const { error } = await updateProfile({ calendar_token: newToken });
      if (error) {
        throw error;
      }
      showToast('Ссылка для синхронизации создана!');
    } catch (err) {
      console.error('Error generating calendar token:', err);
      showToast('Ошибка при создании ссылки');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyUrl = () => {
    if (!calendarSubUrl) return;
    navigator.clipboard.writeText(calendarSubUrl).then(() => {
      showToast('Ссылка скопирована в буфер обмена!');
    }, (err) => {
      console.error('Could not copy text: ', err);
      showToast('Не удалось скопировать ссылку');
    });
  };

  return (
    <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Синхронизация календаря</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Подключите календарь дел к вашему Google Calendar, Outlook или другому приложению. События будут обновляться автоматически.
      </p>
      
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
        {calendarSubUrl ? (
          <>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">URL для подписки</label>
            <div className="flex gap-2 mb-3">
                <input
                    type="text"
                    readOnly
                    value={calendarSubUrl}
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
                <button onClick={handleCopyUrl} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Копировать
                </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <a href={`https://www.google.com/calendar/render?cid=${encodeURIComponent(calendarSubUrl)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">
                    Добавить в Google Calendar
                </a>
                <a href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(calendarSubUrl)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">
                    Добавить в Outlook
                </a>
            </div>
          </>
        ) : (
          <button onClick={handleGenerateCalendarToken} disabled={isGeneratingToken} className="w-full bg-accent hover:bg-accent-light text-white py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {isGeneratingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Создать ссылку для синхронизации
          </button>
        )}
      </div>
    </div>
  );
}