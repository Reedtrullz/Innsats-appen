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
});
