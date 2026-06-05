import {
  OFFLINE_MAP_APPROACH,
  OFFLINE_MAP_CACHE_STORAGE_KEY,
  OFFLINE_MAP_PACKAGES,
  cacheSizeWarningForPackage,
  capMapFeatures,
  getOfflineMapPackage,
  getRenderableMapFeatures,
  parseCachedOfflineMapPackage,
  readCachedOfflineMapPackage,
  resetCachedOfflineMapPackage,
  writeCachedOfflineMapPackage,
  type SchematicMapFeature,
} from '@/lib/maps/offline-map';

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

it('shows cache size warnings for larger packages', () => {
  expect(cacheSizeWarningForPackage(getOfflineMapPackage('trondheim-lokal')!)).toBeNull();
  expect(cacheSizeWarningForPackage(getOfflineMapPackage('trondelag-oversikt')!)).toMatch(/Cache-varsel.*42 MB/i);
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
