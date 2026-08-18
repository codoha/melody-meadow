// Melody Meadow service worker — offline-capable app shell + audio cache.
// Cache version mirrors app version; bump on breaking changes.
const CACHE = 'melody-meadow-v0.15.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=0.15.0',
  './src/app.js?v=0.15.0',
  './manifest.json',
  './assets/app-icon.png',
  './assets/app-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // App shell is required for the SW to activate.
      await cache.addAll(APP_SHELL).catch(() => {});
      // Audio tracks are large; cache them best-effort without blocking install.
      for (const id of ['fruit-beat', 'animal-parade', 'body-boogie', 'color-train', 'sky-sparkle', 'toy-box-bounce']) {
        cache.add(`./assets/audio/${id}.m4a`).catch(() => {});
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Cache-first for same-origin GET requests; fall back to network, then cache.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        // Only cache successful, basic responses (avoid opaque/error responses).
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch (e) {
        // Offline fallback: serve cached index.html for navigation requests.
        if (request.mode === 'navigate') {
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
        }
        throw e;
      }
    })(),
  );
});
