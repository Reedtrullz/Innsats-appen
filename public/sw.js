const CACHE_NAME = 'beredskapsboka-v1';
const STATIC_APP_SHELL = [
  '/',
  '/hurtigkort',
  '/for',
  '/under',
  '/etter',
  '/kilder',
  '/kildegjennomgang',
  '/oppdrag',
  '/oppdrag/ny',
  '/laering',
  '/moduler/cbrn',
  '/moduler/mfe',
  '/moduler/radiac',
  '/moduler/tilfluktsrom',
  '/offline',
  '/generated-content/manifest.json',
  '/generated-content/action-cards.json',
  '/generated-content/checklists.json',
  '/generated-content/training-paths.json',
  '/generated-content/protection-measures.json',
  '/generated-content/glossary.json',
  '/generated-content/source-documents.json',
  '/generated-content/search-index.json',
  '/generated-content/workplans.json',
  '/generated-content/content-coverage-report.json',
];

async function precacheUrl(cache, url) {
  try {
    const response = await fetch(url, { cache: 'reload' });
    if (response.ok) await cache.put(url, response.clone());
    return response;
  } catch (_) {
    return null;
  }
}

async function fetchGeneratedJson(cache, url) {
  const response = await precacheUrl(cache, url);
  if (!response || !response.ok) return [];
  try {
    const parsed = await response.clone().json();
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function discoverGeneratedRoutes(cache) {
  const [cards, sources] = await Promise.all([
    fetchGeneratedJson(cache, '/generated-content/action-cards.json'),
    fetchGeneratedJson(cache, '/generated-content/source-documents.json'),
  ]);
  return [
    ...cards.map((card) => card && card.slug ? `/kort/${encodeURIComponent(card.slug)}` : null),
    ...sources.map((source) => source && source.id ? `/kilder/${encodeURIComponent(source.id)}` : null),
  ].filter(Boolean);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(STATIC_APP_SHELL.map((url) => precacheUrl(cache, url)));
      const generatedRoutes = await discoverGeneratedRoutes(cache);
      await Promise.all(generatedRoutes.map((url) => precacheUrl(cache, url)));
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
