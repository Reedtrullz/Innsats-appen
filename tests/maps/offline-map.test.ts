import {
  OFFLINE_MAP_APPROACH,
  OFFLINE_MAP_CACHE_STORAGE_KEY,
  OFFLINE_MAP_PACKAGES,
  cacheSizeWarningForPackage,
  capMapFeatures,
  getOfflineMapPackage,
  getRenderableMapFeatures,
  offlineMapQuotaCopy,
  parseCachedOfflineMapPackage,
  readCachedOfflineMapPackage,
  resetCachedOfflineMapPackage,
  writeCachedOfflineMapPackage,
  type SchematicMapFeature,
} from '@/lib/maps/offline-map';
import { afterEach, vi } from 'vitest';

const approvedPmtilesPackage = Object.freeze({
  id: 'trondheim-demo-pmtiles',
  title: 'Trondheim demo PMTiles',
  provider: 'training-demo',
  runtimeFormat: 'pmtiles',
  sourceFormat: 'pmtiles',
  url: '/map-packages/trondheim-demo.pmtiles',
  styleUrl: '/map-packages/trondheim-demo-style.json',
  attribution: 'Beredskapsboka test fixture attribution',
  version: '2026.06-a',
  updatedAt: '2026-06-05',
  estimatedSizeMb: 12,
  bounds: [10.2, 63.2, 10.6, 63.6] as [number, number, number, number],
  center: [10.4, 63.4] as [number, number],
  minZoom: 8,
  maxZoom: 14,
  approvedForOfflineUse: true,
  provenance: 'Test-only approved PMTiles package fixture for offline map selection coverage.',
} as const);

function mockApprovedLocalMapPackages(packages = [approvedPmtilesPackage]) {
  vi.resetModules();
  vi.doMock('@/lib/maps/offline-map-package-manifest', () => ({
    approvedLocalMapPackages: Object.freeze(packages),
    localMapPackageForId: (id: string | null | undefined) => packages.find((mapPackage) => mapPackage.id === id),
  }));
}

afterEach(() => {
  vi.doUnmock('@/lib/maps/offline-map-package-manifest');
  vi.resetModules();
});

it('documents a static schematic MVP approach without tile-provider network policy', () => {
  expect(OFFLINE_MAP_APPROACH.decision).toMatch(/Static schematic local map/i);
  expect(OFFLINE_MAP_APPROACH.decision).toMatch(/MapLibre\/PMTiles packages/i);
  expect(OFFLINE_MAP_APPROACH.decision).toMatch(/approved app-local files/i);
  expect(OFFLINE_MAP_APPROACH.networkPolicy).toMatch(/No tile URLs/i);
  expect(OFFLINE_MAP_PACKAGES.every((mapPackage) => mapPackage.estimatedSizeMb > 0)).toBe(true);
});

it('normalizes cached package records and ignores unknown package ids', () => {
  expect(parseCachedOfflineMapPackage('{"packageId":"trondheim-lokal","cachedAt":"2026-06-04T00:00:00.000Z"}')).toMatchObject({
    packageId: 'trondheim-lokal',
    title: 'Trondheim lokalpakke',
    estimatedSizeMb: 18,
  });
  expect(parseCachedOfflineMapPackage('{"packageId":"hemmelig"}')).toBeNull();
  expect(parseCachedOfflineMapPackage('not json')).toBeNull();
});

it('accepts approved PMTiles package ids in the offline map cache record', async () => {
  mockApprovedLocalMapPackages();
  const { normalizeCachedOfflineMapPackage } = await import('@/lib/maps/offline-map');

  expect(normalizeCachedOfflineMapPackage({
    packageId: 'trondheim-demo-pmtiles',
    version: '2026.06-a',
    cachedAt: '2026-06-05T10:00:00.000Z',
  })).toMatchObject({
    packageId: 'trondheim-demo-pmtiles',
    title: 'Trondheim demo PMTiles',
    runtimeFormat: 'pmtiles',
  });
});

it('writes and resets simulated map package cache in browser storage only', () => {
  const storage = new Map<string, string>();
  const localStorageLike = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };

  const cached = writeCachedOfflineMapPackage('trondelag-oversikt', localStorageLike, new Date('2026-06-04T12:00:00.000Z'));
  expect(cached).toMatchObject({ packageId: 'trondelag-oversikt', estimatedSizeMb: 42 });
  expect(storage.get(OFFLINE_MAP_CACHE_STORAGE_KEY)).toContain('trondelag-oversikt');
  expect(readCachedOfflineMapPackage(localStorageLike)).toMatchObject({ packageId: 'trondelag-oversikt' });

  resetCachedOfflineMapPackage(localStorageLike);
  expect(readCachedOfflineMapPackage(localStorageLike)).toBeNull();
});

it('does not write a fallback cache record for unknown package ids', () => {
  const storage = new Map<string, string>();
  const localStorageLike = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };

  expect(writeCachedOfflineMapPackage('unknown-pmtiles-id', localStorageLike, new Date('2026-06-05T10:00:00.000Z'))).toBeNull();
  expect(storage.get(OFFLINE_MAP_CACHE_STORAGE_KEY)).toBeUndefined();
});

it('shows cache size warnings for larger packages', () => {
  expect(cacheSizeWarningForPackage(getOfflineMapPackage('trondheim-lokal')!)).toBeNull();
  expect(cacheSizeWarningForPackage(getOfflineMapPackage('trondelag-oversikt')!)).toMatch(/Cache-varsel.*42 MB/i);
});

it('treats non-finite storage quota estimates as unknown without rendering invalid numbers', () => {
  const quotaCopy = offlineMapQuotaCopy({ estimatedSizeMb: 12, quota: Number.NaN, usage: 4 * 1024 * 1024 });
  const usageCopy = offlineMapQuotaCopy({ estimatedSizeMb: 12, quota: 50 * 1024 * 1024, usage: Number.POSITIVE_INFINITY });

  expect(quotaCopy).toMatch(/lagringskvote er ukjent/i);
  expect(usageCopy).toMatch(/lagringskvote er ukjent/i);
  expect(`${quotaCopy} ${usageCopy}`).not.toMatch(/NaN|Infinity/);
});

it('clamps negative quota and usage estimates before calculating available cache space', () => {
  expect(offlineMapQuotaCopy({
    estimatedSizeMb: 80,
    quota: 100 * 1024 * 1024,
    usage: -100 * 1024 * 1024,
  })).toMatch(/Lav tilgjengelig nettleserlagring \(100 MB\)/i);

  expect(offlineMapQuotaCopy({
    estimatedSizeMb: 1,
    quota: -20 * 1024 * 1024,
    usage: 0,
  })).toMatch(/Lav tilgjengelig nettleserlagring \(0 MB\)/i);
});

it('caps schematic feature rendering for older phone performance', () => {
  const manyFeatures: SchematicMapFeature[] = Array.from({ length: 30 }, (_, index) => ({
    id: `feature-${index}`,
    label: `Feature ${index}`,
    kind: 'resource',
    x: index,
    y: index,
  }));
  expect(capMapFeatures(manyFeatures)).toHaveLength(12);
  expect(capMapFeatures(manyFeatures)[0]?.id).toBe('feature-0');
  expect(getRenderableMapFeatures(getOfflineMapPackage('trondelag-oversikt'))).toHaveLength(12);
});
