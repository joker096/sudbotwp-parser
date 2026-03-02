import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { ParsedCase } from '../types';
import { 
  NotificationSettings, 
  checkAndSendNotifications, 
  loadNotificationSettings,
  requestNotificationPermission 
} from '../lib/notifications';

const CHECK_INTERVAL = 60 * 1000; // Проверять каждую минуту

export const useNotifications = (userCases: ParsedCase[]) => {
  const { user, profileData } = useAuth();
  const settingsRef = useRef<NotificationSettings | null>(null);
  
  // Загружаем настройки при инициализации
  useEffect(() => {
    const loadSettings = async () => {
      if (user) {
        const settings = await loadNotificationSettings(user.id);
        if (settings) {
          settingsRef.current = settings;
        }
      }
    };
    
    loadSettings();
  }, [user]);
  
  // Обновляем настройки из profileData
  useEffect(() => {
    if (profileData?.notification_settings) {
      settingsRef.current = profileData.notification_settings as NotificationSettings;
    }
  }, [profileData]);
  
  // Периодическая проверка и отправка уведомлений
  useEffect(() => {
    if (!user || !settingsRef.current || userCases.length === 0) {
      return;
    }
    
    // Функция проверки уведомлений
    const checkNotifications = async () => {
      const settings = settingsRef.current;
      if (!settings) return;
      
      // Проверяем, включены ли уведомления
      if (!settings.browserNotifications && !settings.telegramBot) {
        return;
      }
      
      await checkAndSendNotifications(user.id, settings, userCases);
    };
    
    // Запускаем первую проверку через небольшую задержку
    const initialTimeout = setTimeout(() => {
      checkNotifications();
    }, 5000);
    
    // Запускаем периодическую проверку
    const intervalId = setInterval(() => {
      checkNotifications();
    }, CHECK_INTERVAL);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [user, userCases]);
  
  // Функция для ручной проверки уведомлений
  const checkNow = async () => {
    if (!user || !settingsRef.current) return;
    
    await checkAndSendNotifications(user.id, settingsRef.current, userCases);
  };
  
  // Функция для запроса разрешения на уведомления
  const enableBrowserNotifications = async () => {
    return await requestNotificationPermission();
  };
  
  return {
    checkNow,
    enableBrowserNotifications,
  };
};
