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
  /** Disposable 1..999999 id for this Save. Omitted values add no header and no correlation fields. */
  saveId?: number;
  /** Privacy-safe failure attribution; called only on failure and never alters the thrown error. */
  onTrace?: (record: MapPackageSaveTraceRecord) => void;
};

export type MapPackageSavePhase = 'open' | 'fetch' | 'wrap' | 'read' | 'put' | 'addAll' | 'after';

export type MapPackageSaveTraceRecord = {
  phase: MapPackageSavePhase;
  errorClass: string;
  /** Reported for the put phase only. */
  varyStar?: boolean;
  bodyUsed?: boolean;
  bodyLocked?: boolean;
  saveId?: number;
  layer?: 'page';
  operation?: MapPackageSavePhase;
  rangePresent?: boolean;
  prePutBodyUsed?: boolean;
  prePutBodyLocked?: boolean;
  reason?: 'FAILED_TO_FETCH' | 'NETWORK_ERROR' | 'ABORTED' | 'UNKNOWN';
};

const TRACE_ERROR_CLASSES = new Set([
  'AbortError', 'DataCloneError', 'InvalidStateError', 'NetworkError', 'NotAllowedError', 'NotFoundError',
  'QuotaExceededError', 'SecurityError', 'TimeoutError', 'TypeError', 'RangeError', 'Error',
]);

const SAVE_ID_MAX = 999999;
const REASON_BY_MESSAGE: Record<string, NonNullable<MapPackageSaveTraceRecord['reason']>> = {
  'Failed to fetch': 'FAILED_TO_FETCH',
  'NetworkError when attempting to fetch resource.': 'NETWORK_ERROR',
  'The operation was aborted.': 'ABORTED',
};

export function boundedSaveId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= SAVE_ID_MAX ? value : undefined;
}

// shortcut: only these three exact platform strings, add a code when a new full message is tested
export function finiteReasonCode(error: unknown): NonNullable<MapPackageSaveTraceRecord['reason']> {
  try {
    const message = (error as { message?: unknown } | null)?.message;
    if (typeof message !== 'string' || !Object.prototype.hasOwnProperty.call(REASON_BY_MESSAGE, message)) return 'UNKNOWN';
    return REASON_BY_MESSAGE[message] ?? 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

function traceErrorClass(error: unknown) {
  try {
    const name = (error as { name?: unknown } | null)?.name;
    return typeof name === 'string' && TRACE_ERROR_CLASSES.has(name) ? name : 'UnknownError';
  } catch {
    return 'UnknownError';
  }
}

type PrePut = { rangePresent: boolean; varyStar: boolean; prePutBodyUsed: boolean; prePutBodyLocked: boolean };
type Trace = (phase: MapPackageSavePhase, error: unknown, response?: Response, pre?: PrePut) => void;

function varyStarOf(response: Response | undefined) {
  try {
    const value = response?.headers.get('vary');
    return typeof value === 'string' && value.split(',').some((token) => token.trim() === '*');
  } catch {
    return false;
  }
}

function prePutOf(response: Response, rangePresent: boolean): PrePut {
  let prePutBodyUsed = false;
  let prePutBodyLocked = false;
  try { prePutBodyUsed = response.bodyUsed === true; } catch { prePutBodyUsed = false; }
  try { prePutBodyLocked = response.body?.locked === true; } catch { prePutBodyLocked = false; }
  return { rangePresent, varyStar: varyStarOf(response), prePutBodyUsed, prePutBodyLocked };
}

function createTrace(onTrace: CacheLocalMapPackageAssetsDeps['onTrace'], saveId: number | undefined): Trace {
  return (phase, error, response, pre) => {
    if (!onTrace) return;
    try {
      const record: MapPackageSaveTraceRecord = { phase, errorClass: traceErrorClass(error) };
      if (saveId !== undefined) {
        record.saveId = saveId;
        record.layer = 'page';
        record.operation = phase;
        record.rangePresent = pre?.rangePresent === true;
        record.varyStar = pre?.varyStar === true;
        record.prePutBodyUsed = pre?.prePutBodyUsed === true;
        record.prePutBodyLocked = pre?.prePutBodyLocked === true;
        record.reason = finiteReasonCode(error);
      } else if (phase === 'put' && response) {
        record.varyStar = varyStarOf(response);
        record.bodyUsed = response.bodyUsed === true;
        record.bodyLocked = response.body?.locked === true;
      }
      onTrace(record);
    } catch { /* diagnostics must not change save behavior */ }
  };
}

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
  trace: Trace,
  saveId: number | undefined,
): Promise<Response> {
  let response: Response;
  try {
    response = saveId === undefined
      ? await fetchImpl(url)
      : await fetchImpl(url, { headers: { 'x-o24-save': String(saveId) } });
    if (!response.ok) throw new Error(`Map package asset request failed (${response.status}): ${url}`);
  } catch (error) {
    trace('fetch', error);
    throw error;
  }
  try {
    const contentLength = Number(response.headers.get('content-length'));
    const totalBytes = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null;
    if (!response.body) {
      report(totalBytes ?? 0, totalBytes);
      return response;
    }
    const reader = response.body.getReader();
    let loadedBytes = 0;
    // Pull one upstream chunk per consumer read (highWaterMark 0) so the body is
    // never accumulated or copied; cache.put drives the download pace.
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            reader.releaseLock();
            controller.close();
            return;
          }
          loadedBytes += value.byteLength;
          report(loadedBytes, totalBytes);
          controller.enqueue(value);
        } catch (error) {
          trace('read', error);
          reader.releaseLock();
          throw error;
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason);
        } finally {
          reader.releaseLock();
        }
      },
    }, { highWaterMark: 0 });
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    trace('wrap', error);
    throw error;
  }
}

export async function cacheLocalMapPackageAssets(
  mapPackage: LocalMapPackageAssetSource,
  deps: CacheLocalMapPackageAssetsDeps = {},
) {
  const urls = localMapPackageAssetUrls(mapPackage);
  const cacheStorage = resolveCacheStorage(deps);
  if (!cacheStorage) return { cached: 0 };

  const saveId = boundedSaveId(deps.saveId);
  const trace = createTrace(deps.onTrace, saveId);
  let cache: CacheLike;
  try {
    cache = await cacheStorage.open(deps.cacheName ?? MAP_PACKAGE_CACHE_NAME);
  } catch (error) {
    trace('open', error);
    throw error;
  }
  const fetchImpl = deps.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  const { onProgress } = deps;

  if (!onProgress || typeof cache.put !== 'function' || !fetchImpl) {
    // No progress consumer (or a minimal cache implementation): keep the
    // simple atomic path.
    try {
      await cache.addAll(urls);
    } catch (error) {
      trace('addAll', error);
      throw error;
    }
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
    }, trace, saveId);
    const prePut = saveId === undefined ? undefined : prePutOf(response, false);
    try {
      await cache.put(asset, response);
    } catch (error) {
      trace('put', error, response, prePut);
      // A put that failed before reading must not leave the upstream download open.
      await response.body?.cancel(error).catch(() => undefined);
      throw error;
    }
  }
  return { cached: urls.length };
}
