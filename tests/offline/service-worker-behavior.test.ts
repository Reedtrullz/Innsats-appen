import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { GENERATED_ROUTE_DISCOVERY_ENDPOINTS, STATIC_APP_SHELL_ROUTES } from '@/lib/offline/static-app-shell';

type ServiceWorkerHandler = (event: { waitUntil: (promise: Promise<unknown>) => void }) => void;

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
      if (url === '/generated-content/image-metadata.json') {
        return Response.json([
          { publicPath: '/content-assets/approved-image.png', approvedForPublication: true },
          { publicPath: '/content-assets/private-image.png', approvedForPublication: false },
        ]);
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
    expect(cachedUrls).toContain('/content-assets/approved-image.png');
    expect(cachedUrls).not.toContain('/content-assets/private-image.png');
    expect(cachedUrls).toContain('/generated-content/action-cards.json');
    expect(cachedUrls).toContain('/generated-content/source-documents.json');
    for (const endpoint of GENERATED_ROUTE_DISCOVERY_ENDPOINTS) {
      expect(fetchMock).toHaveBeenCalledWith(endpoint, { cache: 'reload' });
    }
  });
});
