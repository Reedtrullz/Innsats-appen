import type { LocalMapPackageManifest } from '@/lib/maps/offline-map-package-manifest';

export const MAP_PACKAGE_CACHE_NAME = 'beredskapsboka-map-packages';

const LOCAL_MAP_PACKAGE_PREFIX = '/map-packages/';
const SAFE_LOCAL_MAP_PACKAGE_ASSET = /^\/map-packages\/[A-Za-z0-9._/-]+\.(?:pmtiles|json)$/;

type LocalMapPackageAssetSource = Pick<LocalMapPackageManifest, 'url' | 'styleUrl'>;

type CacheLike = {
  addAll(urls: string[]): Promise<void> | void;
  put?(url: string, response: Response): Promise<void> | void;
};

type CacheStorageLike = {
  open(cacheName: string): Promise<CacheLike> | CacheLike;
};

export type MapPackageCacheProgress = {
  asset: string;
  assetIndex: number;
  assetCount: number;
  loadedBytes: number;
  totalBytes: number | null;
  percent: number | null;
};

type CacheLocalMapPackageAssetsDeps = {
  caches?: CacheStorageLike;
  cacheName?: string;
  /** When provided (and the cache supports put), assets stream with byte progress. */
  onProgress?: (progress: MapPackageCacheProgress) => void;
  fetchImpl?: typeof fetch;
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

async function fetchAssetWithProgress(
  url: string,
  fetchImpl: typeof fetch,
  report: (loadedBytes: number, totalBytes: number | null) => void,
): Promise<Response> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Map package asset request failed (${response.status}): ${url}`);
  const contentLength = Number(response.headers.get('content-length'));
  const totalBytes = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null;
  if (!response.body) {
    report(totalBytes ?? 0, totalBytes);
    return response;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loadedBytes += value.byteLength;
    report(loadedBytes, totalBytes);
  }
  const combined = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(combined, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export async function cacheLocalMapPackageAssets(
  mapPackage: LocalMapPackageAssetSource,
  deps: CacheLocalMapPackageAssetsDeps = {},
) {
  const urls = localMapPackageAssetUrls(mapPackage);
  const cacheStorage = resolveCacheStorage(deps);
  if (!cacheStorage) return { cached: 0 };

  const cache = await cacheStorage.open(deps.cacheName ?? MAP_PACKAGE_CACHE_NAME);
  const fetchImpl = deps.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  const { onProgress } = deps;

  if (!onProgress || typeof cache.put !== 'function' || !fetchImpl) {
    // No progress consumer (or a minimal cache implementation): keep the
    // simple atomic path.
    await cache.addAll(urls);
    return { cached: urls.length };
  }

  for (const [assetIndex, asset] of urls.entries()) {
    const response = await fetchAssetWithProgress(asset, fetchImpl, (loadedBytes, totalBytes) => {
      onProgress({
        asset,
        assetIndex,
        assetCount: urls.length,
        loadedBytes,
        totalBytes,
        percent: totalBytes ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : null,
      });
    });
    await cache.put(asset, response);
  }
  return { cached: urls.length };
}
