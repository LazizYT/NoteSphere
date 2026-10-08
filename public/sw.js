const CACHE_NAME = 'notesphere-v2-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-maskable.svg'
];

// Service Worker Install Event - Cache critical app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline NoteSphere core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up stale cache files
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache storage:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Serve assets cache-first with network fallback for rapid, app-like performance
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS, skip special chrome-extension protocols or telemetry
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Never cache or intercept API endpoints or Vite development HMR paths
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('hot-update') ||
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1'
  ) {
    return; // Direct network pass-through for dev server & API
  }

  // Skip non-GET requests (AI, DB exports, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background to update cache (Stale-While-Revalidate pattern)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* ignore offline network failures */ });

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache dynamic assets on the fly
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If entirely offline and index fetch fails, serve cached SPA root
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
