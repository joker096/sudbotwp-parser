/**
 * Service Worker с Workbox + Push notifications support
 * VitePWA injectManifest использует этот файл как источник
 */

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache всех ресурсов из манифеста Vite
precacheAndRoute(self.__WB_MANIFEST);

// Клиенты сразу активируются
clientsClaim();

// ===== Push Notifications =====

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Sud Notification';
    const options: NotificationOptions = {
      body: data.body || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      data: {
        url: data.url || 'https://sud.cvr.name',
      },
      tag: data.tag || 'default',
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('Push event error:', e);
  }
});

// Клик по уведомлению — открываем URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || 'https://sud.cvr.name';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ===== Background Sync =====
// Когда связь восстанавливается, синхронизируем отложенные проверки

self.addEventListener('sync', (event) => {
  if (event.tag === 'check-counterparty') {
    event.waitUntil(syncPendingChecks());
  }
});

interface PendingCheck {
  id: string;
  inn: string;
  timestamp: number;
}

async function syncPendingChecks() {
  try {
    const db = await openIndexedDB('pending-checks', 1);
    const checks = await getAllFromStore<PendingCheck>(db, 'checks');

    for (const check of checks) {
      try {
        // Пытаемся выполнить проверку через API
        const response = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inn: check.inn }),
        });

        if (response.ok) {
          // Удаляем из очереди если успешно
          await deleteFromStore(db, 'checks', check.id);
        }
      } catch (e) {
        console.error('Sync failed for check:', check.inn, e);
      }
    }
  } catch (e) {
    console.error('Background sync error:', e);
  }
}

// Утилиты для IndexedDB
function openIndexedDB(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('checks')) {
        db.createObjectStore('checks', { keyPath: 'id' });
      }
    };
  });
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

function deleteFromStore(db: IDBDatabase, storeName: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
