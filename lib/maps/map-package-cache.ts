import type { LocalMapPackageManifest } from '@/lib/maps/offline-map-package-manifest';

export const MAP_PACKAGE_CACHE_NAME = 'beredskapsboka-map-packages';

const LOCAL_MAP_PACKAGE_PREFIX = '/map-packages/';
const SAFE_LOCAL_MAP_PACKAGE_ASSET = /^\/map-packages\/[A-Za-z0-9._/-]+\.(?:pmtiles|json)$/;

type LocalMapPackageAssetSource = Pick<LocalMapPackageManifest, 'url' | 'styleUrl'>;

type CacheLike = {
  addAll(urls: string[]): Promise<void> | void;
};

type CacheStorageLike = {
  open(cacheName: string): Promise<CacheLike> | CacheLike;
};

type CacheLocalMapPackageAssetsDeps = {
  caches?: CacheStorageLike;
  cacheName?: string;
};

function isSafeLocalMapPackageAsset(path: string) {
  if (!path.startsWith(LOCAL_MAP_PACKAGE_PREFIX)) return false;
  if (path.includes('\\') || path.includes('?') || path.includes('#')) return false;
  if (!SAFE_LOCAL_MAP_PACKAGE_ASSET.test(path)) return false;

  const relativePath = path.slice(LOCAL_MAP_PACKAGE_PREFIX.length);
  return relativePath.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function assertSafeLocalMapPackageAsset(path: string) {
  if (isSafeLocalMapPackageAsset(path)) return path;
  throw new Error(`Map package asset must be an app-local /map-packages/ .pmtiles or .json path: ${path}`);
}

function browserCaches() {
  if (typeof window === 'undefined') return undefined;
  return window.caches;
}

function resolveCacheStorage(deps: CacheLocalMapPackageAssetsDeps) {
  if ('caches' in deps) return deps.caches;
  return browserCaches();
}

export function localMapPackageAssetUrls(mapPackage: LocalMapPackageAssetSource) {
  return [
    assertSafeLocalMapPackageAsset(mapPackage.url),
    assertSafeLocalMapPackageAsset(mapPackage.styleUrl),
  ];
}

export async function cacheLocalMapPackageAssets(
  mapPackage: LocalMapPackageAssetSource,
  deps: CacheLocalMapPackageAssetsDeps = {},
) {
  const urls = localMapPackageAssetUrls(mapPackage);
  const cacheStorage = resolveCacheStorage(deps);
  if (!cacheStorage) return { cached: 0 };

  const cache = await cacheStorage.open(deps.cacheName ?? MAP_PACKAGE_CACHE_NAME);
  await cache.addAll(urls);
  return { cached: urls.length };
}
