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
});
