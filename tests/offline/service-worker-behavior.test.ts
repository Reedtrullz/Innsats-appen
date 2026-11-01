import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { GENERATED_ROUTE_DISCOVERY_ENDPOINTS, STATIC_APP_SHELL_ROUTES } from '@/lib/offline/static-app-shell';

type ServiceWorkerHandler = (event: { waitUntil: (promise: Promise<unknown>) => void }) => void;
type ServiceWorkerFetchHandler = (event: {
  request: Request;
  respondWith: (promise: Promise<Response> | Response) => void;
}) => void;

describe('service worker offline behavior', () => {
  it('precaches the static shell and generated browser-safe routes during install', async () => {
    const sw = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    const eventHandlers = new Map<string, ServiceWorkerHandler>();
    const cachedUrls: string[] = [];

    const cache = {
      put: vi.fn(async (request: string | Request) => {
        cachedUrls.push(typeof request === 'string' ? request : new URL(request.url).pathname);
      }),
      match: vi.fn(),
      delete: vi.fn(),
    };

    const fetchMock = vi.fn(async (request: string | Request) => {
      const url = typeof request === 'string' ? request : new URL(request.url).pathname;
      if (url === '/generated-content/action-cards.json') {
        return Response.json([{ slug: 'alpha beta' }, { title: 'invalid card without slug' }]);
      }
      if (url === '/generated-content/source-documents.json') {
        return Response.json([{ id: 'src-test doc' }, { title: 'invalid source without id' }]);
      }
      if (url === '/generated-content/training-paths.json') {
        return Response.json([{ slug: 'fig10-grunnkurs' }, { title: 'invalid training path without slug' }]);
      }
      if (url === '/generated-content/image-metadata.json') {
        return Response.json([
          { publicPath: '/content-assets/approved-image.png', approvedForPublication: true },
          { publicPath: '/content-assets/private-image.png', approvedForPublication: false },
          { publicPath: 'https://evil.example/approved-remote.png', approvedForPublication: true },
          { publicPath: '//evil.example/protocol-relative.png', approvedForPublication: true },
          { publicPath: '/api/context/weather', approvedForPublication: true },
          { publicPath: '/content-assets/query-image.png?v=1', approvedForPublication: true },
        ]);
      }
      if (url === '/kort/alpha%20beta') {
        return new Response('<script src="/_next/static/chunks/generated-card-alpha.js"></script>', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }
      if (url === '/kilder/src-test%20doc') {
        return new Response('<link rel="stylesheet" href="https://example.test/_next/static/css/generated-source.css?v=src"><script src="/_next/static/chunks/generated-card-alpha.js"></script>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      if (url === '/laering/fig10-grunnkurs') {
        return new Response('<script src="../_next/static/chunks/generated-training.js"></script>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
    });

    const self = {
      location: new URL('https://example.test/'),
      clients: { matchAll: vi.fn(async () => []) },
      registration: { waiting: null },
      skipWaiting: vi.fn(),
      addEventListener: vi.fn((type: string, handler: ServiceWorkerHandler) => {
        eventHandlers.set(type, handler);
      }),
    };

    vm.runInNewContext(sw, {
      self,
      caches: { open: vi.fn(async () => cache), keys: vi.fn(async () => []), delete: vi.fn() },
      fetch: fetchMock,
      Headers,
      Request,
      Response,
      URL,
      Date,
      JSON,
      Promise,
      Set,
    });

    const installHandler = eventHandlers.get('install');
    expect(installHandler).toBeDefined();
    const waitUntilPromises: Promise<unknown>[] = [];
    installHandler!({ waitUntil: (promise) => waitUntilPromises.push(promise) });
    await Promise.all(waitUntilPromises);

    expect(cachedUrls).toEqual(expect.arrayContaining([...STATIC_APP_SHELL_ROUTES]));
    expect(cachedUrls).toContain('/kort/alpha%20beta');
    expect(cachedUrls).toContain('/kilder/src-test%20doc');
    expect(cachedUrls).toContain('/laering/fig10-grunnkurs');
    expect(cachedUrls).toContain('/content-assets/approved-image.png');
    expect(cachedUrls).not.toContain('/content-assets/private-image.png');
    expect(cachedUrls).not.toContain('https://evil.example/approved-remote.png');
    expect(cachedUrls).not.toContain('/api/context/weather');
    expect(cachedUrls).not.toContain('/content-assets/query-image.png?v=1');
    expect(cachedUrls).toContain('/_next/static/chunks/generated-card-alpha.js');
    expect(fetchMock.mock.calls.filter(([request]) => request === '/_next/static/chunks/generated-card-alpha.js')).toHaveLength(1);
    expect(cachedUrls).toContain('/_next/static/css/generated-source.css?v=src');
    expect(cachedUrls).toContain('/_next/static/chunks/generated-training.js');
    expect(cachedUrls).toContain('/generated-content/action-cards.json');
    expect(cachedUrls).toContain('/generated-content/source-documents.json');
    for (const endpoint of GENERATED_ROUTE_DISCOVERY_ENDPOINTS) {
      expect(fetchMock).toHaveBeenCalledWith(endpoint, { cache: 'reload' });
    }
  });

  it('keeps context API offline fallback private and ignores cross-origin app-like paths', async () => {
    const sw = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    const eventHandlers = new Map<string, ServiceWorkerFetchHandler>();
    const fetchMock = vi.fn(async () => {
      throw new Error('offline');
    });

    const self = {
      location: new URL('https://example.test/'),
      clients: { matchAll: vi.fn(async () => []) },
      registration: { waiting: null },
      skipWaiting: vi.fn(),
      addEventListener: vi.fn((type: string, handler: ServiceWorkerFetchHandler) => {
        eventHandlers.set(type, handler);
      }),
    };

    vm.runInNewContext(sw, {
      self,
      caches: { open: vi.fn(), keys: vi.fn(async () => []), delete: vi.fn() },
      fetch: fetchMock,
      Headers,
      Request,
      Response,
      URL,
      Date,
      JSON,
      Promise,
      Set,
    });

    const fetchHandler = eventHandlers.get('fetch');
    expect(fetchHandler).toBeDefined();

    let contextResponsePromise: Promise<Response> | Response | undefined;
    fetchHandler!({
      request: new Request('https://example.test/api/context/weather?lat=abc&lon=10'),
      respondWith: (promise) => {
        contextResponsePromise = promise;
      },
    });

    const contextResponse = await contextResponsePromise;
    expect(contextResponse?.status).toBe(503);
    expect(contextResponse?.headers.get('content-type')).toContain('application/json');
    expect(contextResponse?.headers.get('cache-control')).toBe('private, no-store');
    await expect(contextResponse?.json()).resolves.toEqual({ error: 'Context API unavailable offline' });

    let crossOriginHandled = false;
    fetchHandler!({
      request: new Request('https://cdn.example/generated-content/manifest.json'),
      respondWith: () => {
        crossOriginHandled = true;
      },
    });
    expect(crossOriginHandled).toBe(false);

    fetchHandler!({
      request: new Request('https://api.example/api/context/weather'),
      respondWith: () => {
        crossOriginHandled = true;
      },
    });
    expect(crossOriginHandled).toBe(false);
  });

  describe('storage denial on live fetches', () => {
    const origin = 'https://example.test';
    const denied = () => Promise.reject(new DOMException('quota', 'QuotaExceededError'));
    const sw = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');

    async function dispatch(options: {
      fetchImpl: () => Promise<Response>;
      cache?: Record<string, unknown>;
      open?: () => Promise<unknown>;
      url: string;
      headers?: Record<string, string>;
    }) {
      let handler: ServiceWorkerFetchHandler | undefined;
      const cache = { put: vi.fn(async () => undefined), match: vi.fn(async () => undefined), ...options.cache };
      vm.runInNewContext(sw, {
        self: {
          location: new URL(origin),
          clients: { matchAll: vi.fn(async () => []) },
          registration: { waiting: null },
          addEventListener: (type: string, h: ServiceWorkerFetchHandler) => {
            if (type === 'fetch') handler = h;
          },
        },
        caches: { open: options.open ?? vi.fn(async () => cache), keys: vi.fn(async () => []), delete: vi.fn() },
        fetch: options.fetchImpl,
        Headers, Request, Response, URL, Date, JSON, Promise, Set,
      });
      let result: Promise<Response> | Response | undefined;
      handler!({ request: new Request(options.url, { headers: options.headers }), respondWith: (p) => { result = p; } });
      return { cache, response: result as Promise<Response> };
    }
    const fresh = async () => new Response('fresh', { status: 200 });
    const offline = async (): Promise<Response> => { throw new TypeError('offline'); };

    it.each([
      ['rejected put without stale data', { put: denied }],
      ['rejected put with stale data', { put: denied, match: async () => new Response('stale') }],
      ['rejected match', { match: denied }],
    ])('returns the fresh generic asset on %s', async (_name, cache) => {
      const { response } = await dispatch({ fetchImpl: fresh, cache, url: origin + '/_next/static/a.js' });
      await expect((await response).text()).resolves.toBe('fresh');
    });

    it('returns the fresh generic asset when cache open is denied', async () => {
      const { response } = await dispatch({ fetchImpl: fresh, open: denied, url: origin + '/content-assets/a.png' });
      await expect((await response).text()).resolves.toBe('fresh');
    });

    it.each(['/_next/static/a.js', '/map-packages/a.pmtiles'])('keeps last-good %s when the fetched body errors during put', async (route) => {
      const interrupted = () => new Response(new ReadableStream({ start: (c) => c.error(new TypeError('interrupted')) }));
      const { response } = await dispatch({
        fetchImpl: async () => interrupted(),
        cache: { put: async (_r: unknown, res: Response) => { await res.arrayBuffer(); }, match: async () => new Response('last-good') },
        url: origin + route,
      });
      await expect((await response).text()).resolves.toBe('last-good');
    });

    it('keeps the cached fallback on network failure and does not fake success when storage is denied', async () => {
      const cached = await dispatch({ fetchImpl: offline, cache: { match: async () => new Response('stale') }, url: origin + '/_next/static/a.js' });
      const fallback = await cached.response;
      expect(fallback.headers.get('x-beredskapsboka-cache-reason')).toBe('network-error');
      await expect(fallback.text()).resolves.toBe('stale');

      const noOpen = await dispatch({ fetchImpl: offline, open: denied, url: origin + '/_next/static/a.js' });
      await expect(noOpen.response).rejects.toThrow('offline');
      const noMatch = await dispatch({ fetchImpl: offline, cache: { match: denied }, url: origin + '/_next/static/a.js' });
      await expect(noMatch.response).rejects.toThrow('offline');
    });

    it.each([
      ['rejected put with stale archive', { put: denied, match: async () => new Response('stale') }],
      ['rejected match', { match: denied }],
    ])('returns the fresh full map package on %s', async (_name, cache) => {
      const { response } = await dispatch({ fetchImpl: fresh, cache, url: origin + '/map-packages/a.pmtiles' });
      const body = await response;
      expect(body.status).toBe(200);
      await expect(body.text()).resolves.toBe('fresh');
    });

    it('serves a range from fresh bytes when put is rejected, and never caches 206', async () => {
      const ranged = await dispatch({
        fetchImpl: async () => new Response('0123456789', { status: 200 }),
        cache: { put: denied, match: async () => new Response('stale-stale') },
        url: origin + '/map-packages/a.pmtiles',
        headers: { range: 'bytes=2-5' },
      });
      const slice = await ranged.response;
      expect(slice.status).toBe(206);
      expect(slice.headers.get('Content-Range')).toBe('bytes 2-5/10');
      await expect(slice.text()).resolves.toBe('2345');

      const partial = await dispatch({
        fetchImpl: async () => new Response('23', { status: 206 }),
        url: origin + '/map-packages/a.pmtiles',
        headers: { range: 'bytes=2-3' },
      });
      expect((await partial.response).status).toBe(206);
      expect(partial.cache.put).not.toHaveBeenCalled();
    });

    it('keeps the map offline fallback from cache and rejects when storage is denied', async () => {
      const cached = await dispatch({
        fetchImpl: offline,
        cache: { match: async () => new Response('0123456789') },
        url: origin + '/map-packages/a.pmtiles',
        headers: { range: 'bytes=1-3' },
      });
      const slice = await cached.response;
      expect(slice.status).toBe(206);
      await expect(slice.text()).resolves.toBe('123');
      const denial = await dispatch({ fetchImpl: offline, open: denied, url: origin + '/map-packages/a.pmtiles' });
      await expect(denial.response).rejects.toThrow('offline');
    });
  });
});
