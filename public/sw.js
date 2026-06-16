const CACHE_NAME = 'wordforge-v1';
const ASSETS_TO_CACHE = [
  '/SRS_Web_App/',
  '/SRS_Web_App/index.html',
  '/SRS_Web_App/manifest.json',
  '/SRS_Web_App/favicon.svg',
  '/SRS_Web_App/pwa-192.png',
  '/SRS_Web_App/pwa-512.png'
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
  // Navigation requests (index.html) -> Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match('/wordcards/index.html') || caches.match('/wordcards/');
        })
    );
    return;
  }

  // Other assets -> Cache First, fall back to Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((newResponse) => {
        // Cache new local assets on the fly
        if (event.request.url.startsWith(self.location.origin) && 
            event.request.method === 'GET' && 
            !event.request.url.includes('chrome-extension')) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, newResponse.clone());
            return newResponse;
          });
        }
        return newResponse;
      });
    })
  );
});
