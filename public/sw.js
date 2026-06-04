const CACHE_NAME = 'beredskapsboka-v1';
const STATIC_APP_SHELL = [
  '/',
  '/hurtigkort',
  '/for',
  '/under',
  '/etter',
  '/kilder',
  '/kildegjennomgang',
  '/faq',
  '/endringer',
  '/ma-leses',
  '/oppdrag',
  '/oppdrag/ny',
  '/laering',
  '/kart',
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
  '/generated-content/faq.json',
  '/generated-content/equipment-taxonomy.json',
  '/generated-content/export-templates.json',
  '/generated-content/image-metadata.json',
  '/generated-content/local-overlays.json',
  '/generated-content/changelog.json',
  '/generated-content/must-read.json',
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

async function precacheHtmlAssets(cache, response, baseUrl) {
  if (!response || !response.ok) return;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return;
  let html = '';
  try {
    html = await response.clone().text();
  } catch (_) {
    return;
  }
  const assets = new Set();
  const attrPattern = /\b(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(attrPattern)) {
    try {
      const assetUrl = new URL(match[1], baseUrl);
      if (assetUrl.origin === self.location.origin && assetUrl.pathname.startsWith('/_next/')) {
        assets.add(`${assetUrl.pathname}${assetUrl.search}`);
      }
    } catch (_) {
      // Ignore malformed relative URLs in generated HTML.
    }
  }
  await Promise.all([...assets].map((url) => precacheUrl(cache, url)));
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
  const [cards, sources, images] = await Promise.all([
    fetchGeneratedJson(cache, '/generated-content/action-cards.json'),
    fetchGeneratedJson(cache, '/generated-content/source-documents.json'),
    fetchGeneratedJson(cache, '/generated-content/image-metadata.json'),
  ]);
  return [
    ...cards.map((card) => card && card.slug ? `/kort/${encodeURIComponent(card.slug)}` : null),
    ...sources.map((source) => source && source.id ? `/kilder/${encodeURIComponent(source.id)}` : null),
    ...images.map((image) => image && image.publicPath && image.approvedForPublication === true ? image.publicPath : null),
  ].filter(Boolean);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(STATIC_APP_SHELL.map(async (url) => {
        const response = await precacheUrl(cache, url);
        await precacheHtmlAssets(cache, response, new URL(url, self.location.origin).href);
      }));
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
