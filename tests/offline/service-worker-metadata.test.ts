import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';
import { APP_SHELL_ROUTES, GENERATED_CONTENT_ROUTES, GENERATED_ROUTE_DISCOVERY_ENDPOINTS, STATIC_APP_SHELL_ROUTES } from '@/lib/offline/static-app-shell';
import {
  GENERATED_CONTENT_STALE_MS,
  SW_CACHE_VERSION,
  generatedContentFallbackPayload,
  isGeneratedContentStale,
  parseServiceWorkerClientMessage,
} from '@/lib/offline/service-worker-metadata';
import { buildServiceWorkerSource } from '../../scripts/build-service-worker';

function extractStaticAppShell(sw: string) {
  const match = sw.match(/const STATIC_APP_SHELL = \[([\s\S]*?)\];/);
  expect(match).not.toBeNull();
  return Array.from(match![1].matchAll(/'([^']+)'/g), ([, route]) => route);
}

describe('service worker metadata helpers', () => {
  it('keeps the public service-worker cache version and static shell aligned with typed metadata', () => {
    const sw = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    const staticAppShell = extractStaticAppShell(sw);
    expect(manifest().start_url).toBe('/');
    expect(manifest().display).toBe('standalone');
    expect(sw).toContain(`const SW_CACHE_VERSION = '${SW_CACHE_VERSION}'`);
    expect(sw).toContain('// BEGIN GENERATED SERVICE WORKER METADATA');
    expect(buildServiceWorkerSource(sw)).toBe(sw);
    expect(sw).toContain('BEREDSKAPSBOKA_GET_SW_STATUS');
    expect(sw).toContain('BEREDSKAPSBOKA_SKIP_WAITING');
    expect(staticAppShell).toEqual([...STATIC_APP_SHELL_ROUTES]);
    expect(APP_SHELL_ROUTES).toContain('/nytt/sok-og-redning');
    expect(GENERATED_CONTENT_ROUTES).toContain('/generated-content/study-guides.json');
    expect(GENERATED_CONTENT_ROUTES.every((route) => route.startsWith('/generated-content/'))).toBe(true);
    expect(staticAppShell.some((route) => /^\/api\//.test(route))).toBe(false);
    expect(staticAppShell.some((route) => /^\/content\//.test(route))).toBe(false);
    expect(GENERATED_ROUTE_DISCOVERY_ENDPOINTS).toContain('/generated-content/training-paths.json');
  });

  it('treats app-local map package assets as offline cacheable runtime assets', async () => {
    const sw = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    expect(sw).toContain('/map-packages/');
    expect(sw).toContain('isLocalMapPackageAsset');
    expect(sw).toContain('MAP_PACKAGE_CACHE_NAME');
    expect(sw).toContain('caches.open(MAP_PACKAGE_CACHE_NAME)');

    const mapUrl = 'https://example.test/map-packages/area.pmtiles';
    const mapBytes = new Uint8Array([1, 2, 3, 4]);
    const fresh = new Response(mapBytes, { status: 200 });
    const putCalls: Array<[Request, Response]> = [];
    type FetchHandler = (event: { request: Request; respondWith: (promise: Promise<Response>) => void }) => void;
    const handlers = new Map<string, FetchHandler>();
    vm.runInNewContext(sw, {
      self: {
        location: new URL('https://example.test/'),
        clients: { matchAll: async () => [] },
        registration: { waiting: null },
        skipWaiting: () => undefined,
        addEventListener: (type: string, handler: FetchHandler) => {
          handlers.set(type, handler);
        },
      },
      caches: {
        open: async () => ({
          match: async () => undefined,
          put: async (request: Request, response: Response) => {
            putCalls.push([request, response]);
          },
        }),
        keys: async () => [],
        delete: async () => true,
      },
      fetch: async () => fresh,
      Headers,
      Request,
      Response,
      URL,
      Date,
      JSON,
      Promise,
      Set,
    });

    const request = new Request(mapUrl);
    const responded: Promise<Response>[] = [];
    handlers.get('fetch')!({ request, respondWith: (promise) => responded.push(promise) });
    const response = await responded[0];

    expect(response.status).toBe(200);
    expect(putCalls).toHaveLength(1);
    const [cachedRequest, cachedResponse] = putCalls[0];
    expect(cachedRequest.url).toBe(mapUrl);
    expect(cachedResponse.status).toBe(200);
    expect(cachedResponse).not.toBe(response);
    expect(Array.from(new Uint8Array(await cachedResponse.arrayBuffer()))).toEqual(Array.from(mapBytes));
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(Array.from(mapBytes));
  });

  it('detects stale generated content using the mobile/offline threshold', () => {
    const now = Date.parse('2026-06-04T12:00:00.000Z');
    expect(isGeneratedContentStale('2026-06-04T11:00:00.000Z', now)).toBe(false);
    expect(isGeneratedContentStale(new Date(now - GENERATED_CONTENT_STALE_MS - 1).toISOString(), now)).toBe(true);
    expect(isGeneratedContentStale(null, now)).toBe(true);
  });

  it('builds safe generated-content fallbacks for cache-corruption cases', () => {
    expect(generatedContentFallbackPayload('/generated-content/manifest.json')).toMatchObject({
      contentVersion: 'offline-fallback',
      fallback: true,
    });
    expect(generatedContentFallbackPayload('/generated-content/workplans.json')).toMatchObject({
      workplans: [],
      fallback: true,
    });
    expect(generatedContentFallbackPayload('/generated-content/action-cards.json')).toEqual([]);
  });

  it('normalizes service-worker fallback messages from unknown postMessage payloads', () => {
    expect(parseServiceWorkerClientMessage({ type: 'unknown' })).toBeNull();
    expect(parseServiceWorkerClientMessage({
      type: 'BEREDSKAPSBOKA_SW_GENERATED_FALLBACK',
      payload: { url: '/generated-content/manifest.json', cacheVersion: SW_CACHE_VERSION, reason: 'missing-cache', generatedContent: true },
    })).toMatchObject({
      type: 'BEREDSKAPSBOKA_SW_GENERATED_FALLBACK',
      payload: { generatedContent: true, reason: 'missing-cache', stale: true },
    });
  });
});
