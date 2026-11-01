import { describe, expect, it, vi } from 'vitest';
import {
  MAP_PACKAGE_CACHE_NAME,
  cacheLocalMapPackageAssets,
  localMapPackageAssetUrls,
} from '@/lib/maps/map-package-cache';

const demoPackage = Object.freeze({
  url: '/map-packages/demo.pmtiles',
  styleUrl: '/map-packages/demo-style.json',
});

describe('map package CacheStorage helper', () => {
  it('returns app-local PMTiles and style asset URLs', () => {
    expect(localMapPackageAssetUrls(demoPackage)).toEqual([
      '/map-packages/demo.pmtiles',
      '/map-packages/demo-style.json',
    ]);
  });

  it('rejects external map package URLs', () => {
    expect(() => localMapPackageAssetUrls({
      url: 'https://tiles.example/demo.pmtiles',
      styleUrl: '/map-packages/demo-style.json',
    })).toThrow(/app-local/i);
  });

  it.each([
    ['/map-packages/../demo.pmtiles', '/map-packages/demo-style.json'],
    ['/map-packages/demo.pmtiles?token=secret', '/map-packages/demo-style.json'],
    ['/map-packages/demo.pmtiles#fragment', '/map-packages/demo-style.json'],
    ['/other/demo.pmtiles', '/map-packages/demo-style.json'],
    ['/map-packages/demo.txt', '/map-packages/demo-style.json'],
    ['/map-packages/nested\\demo.pmtiles', '/map-packages/demo-style.json'],
  ])('rejects unsafe map package asset paths (%s)', (url, styleUrl) => {
    expect(() => localMapPackageAssetUrls({ url, styleUrl })).toThrow(/app-local|map package/i);
  });

  it('opens the map package cache and adds all package assets when CacheStorage deps are injected', async () => {
    const cache = { addAll: vi.fn(async (_urls: string[]) => undefined) };
    const caches = { open: vi.fn(async (_cacheName: string) => cache) };

    await expect(cacheLocalMapPackageAssets(demoPackage, { caches })).resolves.toEqual({ cached: 2 });

    expect(caches.open).toHaveBeenCalledWith(MAP_PACKAGE_CACHE_NAME);
    expect(cache.addAll).toHaveBeenCalledWith([
      '/map-packages/demo.pmtiles',
      '/map-packages/demo-style.json',
    ]);
  });

  it('returns cached 0 when CacheStorage is unavailable', async () => {
    await expect(cacheLocalMapPackageAssets(demoPackage, { caches: undefined })).resolves.toEqual({ cached: 0 });
  });

  it('streams assets with byte progress when a progress consumer is provided', async () => {
    // Consume the body like the real Cache API does.
    const cache = { addAll: vi.fn(async () => undefined), put: vi.fn(async (_url: string, response: Response) => { await response.arrayBuffer(); }) };
    const caches = { open: vi.fn(async () => cache) };
    const chunk = new Uint8Array(1024);
    const fetchImpl = vi.fn(async () => new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(chunk);
          controller.enqueue(chunk);
          controller.close();
        },
      }),
      { headers: { 'content-length': String(chunk.byteLength * 2) } },
    )) as unknown as typeof fetch;
    const progress: number[] = [];

    await expect(cacheLocalMapPackageAssets(demoPackage, {
      caches,
      fetchImpl,
      onProgress: (event) => progress.push(event.percent ?? -1),
    })).resolves.toEqual({ cached: 2 });

    expect(cache.addAll).not.toHaveBeenCalled();
    expect(cache.put).toHaveBeenCalledTimes(2);
    expect(progress).toContain(50);
    expect(progress).toContain(100);
  });

  it('fails the streamed path on a non-OK asset response', async () => {
    const cache = { addAll: vi.fn(async () => undefined), put: vi.fn(async () => undefined) };
    const caches = { open: vi.fn(async () => cache) };
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 })) as unknown as typeof fetch;

    await expect(cacheLocalMapPackageAssets(demoPackage, { caches, fetchImpl, onProgress: () => undefined }))
      .rejects.toThrow(/request failed/i);
    expect(cache.put).not.toHaveBeenCalled();
  });

  describe('streaming into the cache consumer', () => {
    // Fresh demand-driven upstream per fetch; `state` tracks the latest one.
    function upstream(chunks: Uint8Array[], init: ResponseInit = {}, failAt = -1, cancelError?: Error) {
      const state = { pulls: 0, cancelled: undefined as unknown, body: undefined as ReadableStream<Uint8Array> | undefined };
      const fetchImpl = vi.fn(async () => {
        state.pulls = 0;
        state.cancelled = undefined;
        const body = new ReadableStream<Uint8Array>({
          pull(controller) {
            if (state.pulls === failAt) throw new Error('upstream broke');
            if (state.pulls >= chunks.length) return controller.close();
            controller.enqueue(chunks[state.pulls++]);
          },
          cancel(reason) {
            state.cancelled = reason ?? 'cancelled';
            if (cancelError) throw cancelError;
          },
        }, { highWaterMark: 0 });
        state.body = body;
        return new Response(body, init);
      }) as unknown as typeof fetch;
      return { state, fetchImpl };
    }

    const chunks = [1, 2, 3, 4].map((n) => new Uint8Array(1024).fill(n));
    const run = (
      put: (url: string, response: Response) => Promise<void>,
      fetchImpl: typeof fetch,
      onProgress: (p: { loadedBytes: number }) => void = () => undefined,
    ) => cacheLocalMapPackageAssets(demoPackage, {
      caches: { open: async () => ({ addAll: async () => undefined, put }) },
      fetchImpl,
      onProgress,
    });

    it('reads upstream only on consumer demand and delivers exact bytes, status and headers', async () => {
      const { state, fetchImpl } = upstream(chunks, { status: 200, statusText: 'Fine', headers: { 'content-length': '4096', etag: 'abc' } });
      const seen: Array<{ pullsBeforeRead: number; status: number; statusText: string; etag: string | null; bytes: number[] }> = [];
      const loaded: number[] = [];
      await run(async (_url, response) => {
        const reader = response.body!.getReader();
        const pullsBeforeRead = state.pulls;
        const bytes: number[] = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes.push(...value);
          expect(state.pulls).toBeLessThanOrEqual(bytes.length / 1024 + 1);
        }
        seen.push({ pullsBeforeRead, status: response.status, statusText: response.statusText, etag: response.headers.get('etag'), bytes });
      }, fetchImpl, (p) => loaded.push(p.loadedBytes));
      expect(seen).toHaveLength(2);
      expect(seen[0]).toMatchObject({ pullsBeforeRead: 0, status: 200, statusText: 'Fine', etag: 'abc' });
      expect(seen[0].bytes).toEqual(chunks.flatMap((c) => [...c]));
      expect(loaded.slice(0, 4)).toEqual([1024, 2048, 3072, 4096]);
    });

    it('rejects the cache write when an upstream read fails mid-stream', async () => {
      const { fetchImpl } = upstream(chunks, {}, 2);
      await expect(run(async (_url, response) => { await response.arrayBuffer(); }, fetchImpl)).rejects.toThrow('upstream broke');
    });

    it('forwards consumer cancellation to the upstream body', async () => {
      const { state, fetchImpl } = upstream(chunks);
      await expect(run(async (_url, response) => {
        const reader = response.body!.getReader();
        await reader.read();
        await reader.cancel('stop');
        throw new Error('consumer cancelled');
      }, fetchImpl)).rejects.toThrow('consumer cancelled');
      expect(state.cancelled).toBe('stop');
      expect(state.pulls).toBe(1);
      expect(state.body!.locked).toBe(false);
    });

    it('releases the original body lock when upstream cancellation rejects, surfacing that rejection', async () => {
      const { state, fetchImpl } = upstream(chunks, {}, -1, new Error('cancel failed'));
      await expect(run(async (_url, response) => {
        const reader = response.body!.getReader();
        await reader.read();
        await expect(reader.cancel('stop')).rejects.toThrow('cancel failed');
        throw new Error('consumer cancelled');
      }, fetchImpl)).rejects.toThrow('consumer cancelled');
      expect(state.cancelled).toBe('stop');
      expect(state.body!.locked).toBe(false);
    });

    it('releases the original body lock when cancelled while an upstream read is pending', async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      let started!: () => void;
      const pullStarted = new Promise<void>((resolve) => { started = resolve; });
      let body!: ReadableStream<Uint8Array>;
      const fetchImpl = vi.fn(async () => {
        body = new ReadableStream<Uint8Array>({
          async pull(controller) { started(); await gate; controller.enqueue(chunks[0]); },
        }, { highWaterMark: 0 });
        return new Response(body);
      }) as unknown as typeof fetch;
      await run(async (_url, response) => {
        const reader = response.body!.getReader();
        const pending = reader.read();
        await pullStarted;
        await reader.cancel('stop');
        release();
        await pending;
        expect(body.locked).toBe(false);
      }, fetchImpl);
    });

    it('cancels the unread upstream body when cache.put rejects, and never reports success', async () => {
      const { state, fetchImpl } = upstream(chunks);
      await expect(run(async () => { throw new Error('quota exceeded'); }, fetchImpl)).rejects.toThrow('quota exceeded');
      expect(state.cancelled).toBeDefined();
      expect(state.pulls).toBe(0);
    });

    it('passes a null body through and reports its declared length', async () => {
      const fetchImpl = vi.fn(async () => new Response(null, { status: 200, headers: { 'content-length': '7' } })) as unknown as typeof fetch;
      const loaded: number[] = [];
      await run(async (_url, response) => { expect(response.body).toBeNull(); }, fetchImpl, (p) => loaded.push(p.loadedBytes));
      expect(loaded).toEqual([7, 7]);
    });
  });
});
