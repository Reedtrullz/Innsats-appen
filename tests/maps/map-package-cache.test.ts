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
    const cache = { addAll: vi.fn(async () => undefined), put: vi.fn(async () => undefined) };
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
});
