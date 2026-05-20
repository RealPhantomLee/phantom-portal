/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// Cache names
const CACHE_ASSETS = 'phantom-assets-v1';
const CACHE_API = 'phantom-api-v1';

// Asset extensions to cache on install
const ASSET_EXTENSIONS = ['.js', '.css', '.html', '.png', '.svg', '.ico', '.woff', '.woff2'];

/**
 * Install event: cache static assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_ASSETS).then((cache) => {
      console.log('[SW] Asset cache opened');
      // Pre-cache manifest files if available
      return cache.addAll(['/index.html']).catch(() => {
        console.log('[SW] Could not pre-cache index.html');
      });
    })
  );
  self.skipWaiting();
});

/**
 * Activate event: clean up old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_ASSETS && cacheName !== CACHE_API) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event: implement cache strategies
 * - Cache-first: assets (CSS, JS, images)
 * - Network-first: API calls
 * - Fallback: offline page
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API calls: network-first
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_API).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log('[SW] Serving cached API response:', request.url);
              return cached;
            }
            // Return a generic offline response
            return new Response(
              JSON.stringify({ error: 'Offline', data: null }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // WebSocket: don't cache
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Assets: cache-first
  if (ASSET_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_ASSETS).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_API).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(request) || new Response('Offline', { status: 503 });
    })
  );
});

/**
 * Push notification event: display notification with rich content
 * Expected payload format:
 * {
 *   title: string,
 *   options: {
 *     body: string,
 *     icon: string,
 *     badge: string,
 *     tag: string,
 *     data: {
 *       url: string,
 *       cameraId: string,
 *       timestamp: number,
 *       thumbnail: string,
 *       narration: string
 *     }
 *   }
 * }
 */
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push event received');

  if (!event.data) {
    console.warn('[SW] No data in push event');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch {
    // Fallback to text if not JSON
    notificationData = {
      title: 'Phantom Notification',
      options: {
        body: event.data.text(),
      },
    };
  }

  const { title = 'Phantom Portal', options = {} } = notificationData;

  event.waitUntil(
    self.registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
      tag: options.tag || 'phantom-notification',
      requireInteraction: options.requireInteraction ?? true,
    })
  );
});

/**
 * Notification click event: navigate to relevant page
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open in a window
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * Background sync event: sync note updates when back online
 */
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-notes') {
    event.waitUntil(
      (async () => {
        try {
          const db = await openIDB();
          const pendingNotes = await db.getAll('pending_notes');

          for (const note of pendingNotes) {
            try {
              const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(note),
              });

              if (response.ok) {
                await db.delete('pending_notes', note.id);
              }
            } catch (error) {
              console.error('[SW] Failed to sync note:', note.id, error);
              throw error; // Retry sync
            }
          }
          console.log('[SW] Notes synced successfully');
        } catch (error) {
          console.error('[SW] Background sync failed:', error);
          throw error; // Retry sync
        }
      })()
    );
  }
});

/**
 * Helper: Open IndexedDB for background sync
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('phantom-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pending_notes')) {
        db.createObjectStore('pending_notes', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Message event: handle messages from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting phase, activating immediately');
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      })
    );
  }
});

// Unregister old service workers on update
self.addEventListener('controllerchange', () => {
  console.log('[SW] Service worker controller changed');
});

console.log('[SW] Service Worker loaded and ready');
