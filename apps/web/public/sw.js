const CACHE_NAME = 'syncpad-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        // Add other critical assets here
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Simple cache-first strategy for read-only assets,
  // network-first for API calls (in a real app we'd use Workbox)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
