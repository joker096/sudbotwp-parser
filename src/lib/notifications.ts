import { supabase } from './supabase';
import { ParsedCase, CaseEvent } from '../types';

export interface NotificationSettings {
  browserNotifications: boolean;
  telegramBot: boolean;
  telegramChatId: string;
  notifyBeforeHours: number;
  notifyOnHearing: boolean;
  notifyOnDeadline: boolean;
  notifyOnResult: boolean;
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  caseNumber: string;
  caseId: string;
  eventType: 'hearing' | 'deadline' | 'result';
  eventDate: string;
  eventTime: string;
  scheduledFor: Date;
  notified: boolean;
}

// Проврить и запросить разрешение на уведомления
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Показать уведомление в браузере
export const showBrowserNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<Notification | null> => {
  if (!('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  return new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  });
};

// Отправить уведомление в Telegram через API
export const sendTelegramNotification = async (
  chatId: string,
  message: string,
  botToken?: string
): Promise<boolean> => {
  // Если токен не передан, используем переменную окружения или настроенный токен
  const token = botToken || import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  
  if (!token || !chatId) {
    console.log('Telegram bot token or chat ID not configured');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
};

// Формирование текста уведомления о заседании
export const formatHearingNotification = (
  caseNumber: string,
  court: string,
  event: CaseEvent,
  notifyBeforeHours: number
): string => {
  const timeStr = event.time ? ` в ${event.time}` : '';
  const locationStr = event.location ? `\n📍 Место: ${event.location}` : '';
  
  return `⚖️ <b>Напоминание о заседании</b>

📋 Дело: <b>${caseNumber}</b>
🏛 Суд: ${court}
📅 Дата: ${event.date}${timeStr}${locationStr}

До начала заседания осталось ${notifyBeforeHours} час(а/ов)`;
};

// Формирование текста уведомления о результате
export const formatResultNotification = (
  caseNumber: string,
  court: string,
  status: string
): string => {
  return `📋 <b>Новый результат по делу</b>

Дело: <b>${caseNumber}</b>
Суд: ${court}
Результат: <b>${status}</b>`;
};

// Проверка и отправка уведомлений (вызывается периодически)
export const checkAndSendNotifications = async (
  userId: string,
  settings: NotificationSettings,
  userCases: ParsedCase[]
): Promise<void> => {
  const now = new Date();
  
  for (const caseData of userCases) {
    if (!caseData.events) continue;
    
    for (const event of caseData.events) {
      // Парсим дату события
      const eventDateTime = parseEventDateTime(event.date, event.time);
      if (!eventDateTime) continue;
      
      // Вычисляем время до события
      const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Проверяем, нужно ли отправлять уведомление
      if (hoursUntilEvent > 0 && hoursUntilEvent <= settings.notifyBeforeHours) {
        // Проверяем, не отправляли ли уже уведомление
        const notificationKey = `notified_${caseData.id}_${event.date}_${event.time || 'none'}`;
        const alreadyNotified = localStorage.getItem(notificationKey);
        
        if (!alreadyNotified) {
          const message = formatHearingNotification(
            caseData.number,
            caseData.court,
            event,
            settings.notifyBeforeHours
          );
          
          // Отправляем уведомление в браузере
          if (settings.browserNotifications) {
            await showBrowserNotification('Напоминание о заседании', {
              body: `${caseData.number} - ${event.date}${event.time ? ' ' + event.time : ''}`,
              tag: caseData.id,
            });
          }
          
          // Отправляем уведомление в Telegram
          if (settings.telegramBot && settings.telegramChatId) {
            await sendTelegramNotification(settings.telegramChatId, message);
          }
          
          // Сохраняем факт отправки уведомления
          localStorage.setItem(notificationKey, 'true');
        }
      }
    }
  }
};

// Парсинг даты и времени события
const parseEventDateTime = (dateStr: string, timeStr?: string): Date | null => {
  try {
    const parts = dateStr.split('.');
    if (parts.length < 3) return null;
    
    let year = parseInt(parts[2], 10);
    if (parts[2].length === 2) {
      year += 2000;
    }
    
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[0], 10);
    
    let hours = 9;
    let minutes = 0;
    
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2})[\s:]*(\d{0,2})/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      }
    }
    
    return new Date(year, month, day, hours, minutes);
  } catch (e) {
    return null;
  }
};

// Сохранение настроек уведомлений в профиль пользователя
export const saveNotificationSettings = async (
  userId: string,
  settings: NotificationSettings
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ notification_settings: settings })
      .eq('id', userId);
    
    return !error;
  } catch (e) {
    console.error('Error saving notification settings:', e);
    return false;
  }
};

// Загрузка настроек уведомлений из профиля пользователя
export const loadNotificationSettings = async (
  userId: string
): Promise<NotificationSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    
    return data.notification_settings as NotificationSettings;
  } catch (e) {
    console.error('Error loading notification settings:', e);
    return null;
  }
};
