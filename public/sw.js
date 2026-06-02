const CACHE_NAME = 'beredskapsboka-v1';
const APP_SHELL = [
  '/',
  '/hurtigkort',
  '/for',
  '/under',
  '/etter',
  '/kilder',
  '/offline',
  '/generated-content/manifest.json',
  '/generated-content/action-cards.json',
  '/generated-content/checklists.json',
  '/generated-content/training-paths.json',
  '/generated-content/protection-measures.json',
  '/generated-content/glossary.json',
  '/generated-content/source-documents.json',
  '/generated-content/search-index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, response);
          } catch (_) {
            // Individual cache misses must not hide the whole service worker install.
          }
        }),
      );
    }).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

async function networkThenCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/context/')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (!response.ok) return response;
        return response;
      }).catch(() => new Response(JSON.stringify({ error: 'Context API unavailable offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })),
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      networkThenCache(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(url.pathname)) || (await cache.match('/offline')) || new Response('Offline', { status: 503 });
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/generated-content/') || url.pathname.startsWith('/content-assets/') || url.pathname.startsWith('/_next/')) {
    event.respondWith(networkThenCache(event.request));
  }
});
