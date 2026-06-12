// BEGIN GENERATED SERVICE WORKER METADATA
const SW_CACHE_VERSION = 'v4';
const CACHE_NAME = `beredskapsboka-${SW_CACHE_VERSION}`;
const MAP_PACKAGE_CACHE_NAME = 'beredskapsboka-map-packages';
const GENERATED_CONTENT_STALE_MS = 604800000;
const MESSAGE_TYPES = {
  'getStatus': 'BEREDSKAPSBOKA_GET_SW_STATUS',
  'skipWaiting': 'BEREDSKAPSBOKA_SKIP_WAITING',
  'status': 'BEREDSKAPSBOKA_SW_STATUS',
  'cacheFallback': 'BEREDSKAPSBOKA_SW_CACHE_FALLBACK',
  'generatedFallback': 'BEREDSKAPSBOKA_SW_GENERATED_FALLBACK'
};

self.__BEREDSKAPSBOKA_SW_META__ = {
  cacheName: CACHE_NAME,
  cacheVersion: SW_CACHE_VERSION,
  staleThresholdMs: GENERATED_CONTENT_STALE_MS,
};

const STATIC_APP_SHELL = [
  '/',
  '/hurtigkort',
  '/sok',
  '/for',
  '/under',
  '/etter',
  '/hjelp',
  '/kilder',
  '/kildegjennomgang',
  '/faq',
  '/begrensninger',
  '/kjente-begrensninger',
  '/data-pa-enheten',
  '/personvern',
  '/datakilder',
  '/endringer',
  '/nytt',
  '/ma-leses',
  '/oppdrag',
  '/oppdrag/ny',
  '/mer',
  '/laering',
  '/kart',
  '/feltmodus',
  '/moduler/cbrn',
  '/moduler/mfe',
  '/moduler/radiac',
  '/moduler/tilfluktsrom',
  '/offline',
  '/release',
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
  '/generated-content/content-coverage-report.json'
];
// END GENERATED SERVICE WORKER METADATA

function swStatus(state = 'active') {
  return {
    cacheName: CACHE_NAME,
    cacheVersion: SW_CACHE_VERSION,
    staleThresholdMs: GENERATED_CONTENT_STALE_MS,
    state,
  };
}

function isLocalMapPackageAsset(pathname) {
  if (!pathname.startsWith('/map-packages/')) return false;
  if (pathname.includes('\\') || pathname.includes('?') || pathname.includes('#')) return false;
  if (!/^\/map-packages\/[A-Za-z0-9._/-]+\.(?:json|pmtiles)$/.test(pathname)) return false;
  const relativePath = pathname.slice('/map-packages/'.length);
  return relativePath.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

// PMTiles clients read archives with Range requests. The Cache API stores the
// full archive (the explicit "Lagre kartpakke" flow) but cannot store 206
// responses, so ranges are served by lazily slicing the cached body's Blob
// (disk-backed, zero-copy) when the network is unavailable.
async function sliceCachedMapPackageResponse(cached, rangeHeader) {
  const match = /^bytes=(\d+)-(\d+)?$/.exec(rangeHeader);
  if (!match) return cached;
  const blob = await cached.blob();
  const start = Number(match[1]);
  const end = match[2] === undefined ? blob.size - 1 : Math.min(Number(match[2]), blob.size - 1);
  if (start >= blob.size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  }
  const part = blob.slice(start, end + 1);
  return new Response(part, {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${blob.size}`,
      'Content-Length': String(part.size),
    },
  });
}

async function postToClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => client.postMessage(message));
}

function fallbackPayload(url, reason, generatedContent) {
  return {
    url,
    cacheName: CACHE_NAME,
    cacheVersion: SW_CACHE_VERSION,
    reason,
    generatedContent,
    stale: true,
    at: new Date().toISOString(),
  };
}

async function notifyFallback(url, reason, generatedContent, type = MESSAGE_TYPES.cacheFallback) {
  await postToClients({ type, payload: fallbackPayload(url, reason, generatedContent) });
}

async function precacheUrl(cache, url) {
  try {
    const response = await fetch(url, { cache: 'reload' });
    if (response.ok) await cache.put(url, response.clone());
    return response;
  } catch (_) {
    return null;
  }
}

async function precacheHtmlAssets(cache, response, baseUrl, precachedAssets) {
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
        const cacheUrl = `${assetUrl.pathname}${assetUrl.search}`;
        if (precachedAssets && precachedAssets.has(cacheUrl)) continue;
        if (precachedAssets) precachedAssets.add(cacheUrl);
        assets.add(cacheUrl);
      }
    } catch (_) {
      // Ignore malformed relative URLs in generated HTML.
    }
  }
  await Promise.all([...assets].map((url) => precacheUrl(cache, url)));
}

async function precacheRoutesWithHtmlAssets(cache, urls, precachedAssets, concurrency = 8) {
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, urls.length));
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (index < urls.length) {
      const url = urls[index];
      index += 1;
      const response = await precacheUrl(cache, url);
      await precacheHtmlAssets(cache, response, new URL(url, self.location.origin).href, precachedAssets);
    }
  }));
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

function safeGeneratedImagePath(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.trim()) return null;
  try {
    const imageUrl = new URL(publicPath, self.location.origin);
    if (imageUrl.origin !== self.location.origin) return null;
    if (imageUrl.search || imageUrl.hash) return null;
    if (!imageUrl.pathname.startsWith('/content-assets/')) return null;
    if (imageUrl.pathname.includes('\\')) return null;
    if (imageUrl.pathname.split('/').some((segment) => segment === '.' || segment === '..')) return null;
    return imageUrl.pathname;
  } catch (_) {
    return null;
  }
}

async function discoverGeneratedRoutes(cache) {
  const [cards, sources, trainingPaths, images] = await Promise.all([
    fetchGeneratedJson(cache, '/generated-content/action-cards.json'),
    fetchGeneratedJson(cache, '/generated-content/source-documents.json'),
    fetchGeneratedJson(cache, '/generated-content/training-paths.json'),
    fetchGeneratedJson(cache, '/generated-content/image-metadata.json'),
  ]);
  return [
    ...cards.map((card) => card && card.slug ? `/kort/${encodeURIComponent(card.slug)}` : null),
    ...sources.map((source) => source && source.id ? `/kilder/${encodeURIComponent(source.id)}` : null),
    ...trainingPaths.map((trainingPath) => trainingPath && trainingPath.slug ? `/laering/${encodeURIComponent(trainingPath.slug)}` : null),
    ...images.map((image) => image && image.approvedForPublication === true ? safeGeneratedImagePath(image.publicPath) : null),
  ].filter(Boolean);
}

function generatedContentFallbackPayload(pathname) {
  if (pathname.endsWith('/manifest.json')) {
    return {
      contentVersion: 'offline-fallback',
      generatedAt: null,
      sourceCount: 0,
      actionCardCount: 0,
      checklistCount: 0,
      fallback: true,
      message: 'Generated content manifest could not be loaded from network or cache.',
    };
  }
  if (pathname.endsWith('/workplans.json')) return { generatedAt: null, workplans: [], fallback: true };
  if (pathname.endsWith('/content-coverage-report.json')) return { generatedAt: null, releaseBoard: { gaps: [] }, fallback: true };
  return [];
}

function jsonFallbackResponse(url) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'x-beredskapsboka-generated-fallback': '1',
    'x-beredskapsboka-cache-version': SW_CACHE_VERSION,
    'x-beredskapsboka-cache-name': CACHE_NAME,
  });
  return new Response(JSON.stringify(generatedContentFallbackPayload(url.pathname)), {
    status: 200,
    statusText: 'Offline generated-content fallback',
    headers,
  });
}

function cachedFallbackResponse(response, reason, generatedContent) {
  const headers = new Headers(response.headers);
  headers.set('x-beredskapsboka-cache-fallback', '1');
  headers.set('x-beredskapsboka-cache-reason', reason);
  headers.set('x-beredskapsboka-cache-version', SW_CACHE_VERSION);
  headers.set('x-beredskapsboka-cache-name', CACHE_NAME);
  if (generatedContent) headers.set('x-beredskapsboka-generated-stale', '1');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const precachedHtmlAssets = new Set();
      await precacheRoutesWithHtmlAssets(cache, STATIC_APP_SHELL, precachedHtmlAssets);
      const generatedRoutes = await discoverGeneratedRoutes(cache);
      await precacheRoutesWithHtmlAssets(cache, generatedRoutes, precachedHtmlAssets);
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== MAP_PACKAGE_CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => postToClients({ type: MESSAGE_TYPES.status, payload: swStatus('active') })),
  );
});

self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.type === MESSAGE_TYPES.skipWaiting) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data.type === MESSAGE_TYPES.getStatus) {
    const state = self.registration.waiting ? 'waiting' : 'active';
    if (event.source) event.source.postMessage({ type: MESSAGE_TYPES.status, payload: swStatus(state) });
  }
});

async function networkThenCache(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const generatedContent = url.pathname.startsWith('/generated-content/');
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      await notifyFallback(request.url, 'network-error', generatedContent);
      return cachedFallbackResponse(cached, 'network-error', generatedContent);
    }
    if (generatedContent) {
      await notifyFallback(request.url, 'missing-cache', true, MESSAGE_TYPES.generatedFallback);
      return jsonFallbackResponse(url);
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (url.origin === self.location.origin && url.search === '' && url.hash === '' && isLocalMapPackageAsset(url.pathname)) {
    event.respondWith((async () => {
      const request = event.request;
      const rangeHeader = request.headers.get('range');
      const cache = await caches.open(MAP_PACKAGE_CACHE_NAME);
      // Match by URL so a Range request finds the cached full archive.
      const cached = await cache.match(request.url);
      try {
        const response = await fetch(request);
        // Never cache.put partial (206) responses — the Cache API rejects
        // them; the full archive is stored by the explicit save flow.
        if (response.status === 200 && !rangeHeader) await cache.put(request, response.clone());
        // Some servers/proxies (and the Next dev server) ignore Range and
        // return 200; PMTiles clients abort on that. Synthesize the 206.
        if (response.status === 200 && rangeHeader) {
          return sliceCachedMapPackageResponse(response, rangeHeader);
        }
        return response;
      } catch (error) {
        if (!cached) throw error;
        if (rangeHeader) return sliceCachedMapPackageResponse(cached, rangeHeader);
        return cached;
      }
    })());
    return;
  }

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
