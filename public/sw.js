const CACHE_NAME = 'wordforge-v1';
const ASSETS_TO_CACHE = [
  '/wordcards/',
  '/wordcards/index.html',
  '/wordcards/manifest.json',
  '/wordcards/favicon.svg',
  '/wordcards/pwa-192.png',
  '/wordcards/pwa-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((newResponse) => {
        // Cache new local assets on the fly
        if (event.request.url.startsWith(self.location.origin) && event.request.method === 'GET') {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, newResponse.clone());
            return newResponse;
          });
        }
        return newResponse;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/wordcards/index.html');
      }
    })
  );
});
