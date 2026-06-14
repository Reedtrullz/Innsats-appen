export const SW_CACHE_VERSION = 'v5';
export const SW_CACHE_NAME = `beredskapsboka-${SW_CACHE_VERSION}`;
export const GENERATED_CONTENT_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export const SW_MESSAGE_TYPES = {
  getStatus: 'BEREDSKAPSBOKA_GET_SW_STATUS',
  skipWaiting: 'BEREDSKAPSBOKA_SKIP_WAITING',
  status: 'BEREDSKAPSBOKA_SW_STATUS',
  cacheFallback: 'BEREDSKAPSBOKA_SW_CACHE_FALLBACK',
  generatedFallback: 'BEREDSKAPSBOKA_SW_GENERATED_FALLBACK',
} as const;

export type ServiceWorkerStatusPayload = {
  cacheName: string;
  cacheVersion: string;
  staleThresholdMs: number;
  state: 'installing' | 'waiting' | 'active' | 'unknown';
};

export type ServiceWorkerFallbackPayload = {
  url: string;
  cacheName: string;
  cacheVersion: string;
  reason: 'network-error' | 'missing-cache';
  generatedContent: boolean;
  stale: boolean;
  at: string;
};

export type ServiceWorkerClientMessage =
  | { type: typeof SW_MESSAGE_TYPES.status; payload: ServiceWorkerStatusPayload }
  | { type: typeof SW_MESSAGE_TYPES.cacheFallback; payload: ServiceWorkerFallbackPayload }
  | { type: typeof SW_MESSAGE_TYPES.generatedFallback; payload: ServiceWorkerFallbackPayload };

export function parseServiceWorkerClientMessage(value: unknown): ServiceWorkerClientMessage | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.type !== SW_MESSAGE_TYPES.status && record.type !== SW_MESSAGE_TYPES.cacheFallback && record.type !== SW_MESSAGE_TYPES.generatedFallback) return null;
  if (!record.payload || typeof record.payload !== 'object') return null;
  const payload = record.payload as Record<string, unknown>;

  if (record.type === SW_MESSAGE_TYPES.status) {
    const state = payload.state;
    return {
      type: SW_MESSAGE_TYPES.status,
      payload: {
        cacheName: typeof payload.cacheName === 'string' ? payload.cacheName : 'ukjent',
        cacheVersion: typeof payload.cacheVersion === 'string' ? payload.cacheVersion : 'ukjent',
        staleThresholdMs: typeof payload.staleThresholdMs === 'number' ? payload.staleThresholdMs : GENERATED_CONTENT_STALE_MS,
        state: state === 'installing' || state === 'waiting' || state === 'active' || state === 'unknown' ? state : 'unknown',
      },
    };
  }

  return {
    type: record.type,
    payload: {
      url: typeof payload.url === 'string' ? payload.url : '',
      cacheName: typeof payload.cacheName === 'string' ? payload.cacheName : 'ukjent',
      cacheVersion: typeof payload.cacheVersion === 'string' ? payload.cacheVersion : 'ukjent',
      reason: payload.reason === 'missing-cache' ? 'missing-cache' : 'network-error',
      generatedContent: payload.generatedContent === true,
      stale: payload.stale !== false,
      at: typeof payload.at === 'string' ? payload.at : new Date(0).toISOString(),
    },
  };
}

export function isGeneratedContentStale(generatedAt: string | null | undefined, nowMs = Date.now(), thresholdMs = GENERATED_CONTENT_STALE_MS) {
  if (!generatedAt) return true;
  const generatedAtMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) return true;
  return nowMs - generatedAtMs > thresholdMs;
}

export function shortOfflineVersion(version: string) {
  if (!version) return 'ukjent';
  return version.length > 22 ? version.slice(0, 22).replace('T', ' ') : version;
}

export function generatedContentFallbackPayload(pathname: string) {
  if (pathname.endsWith('/manifest.json')) {
    return {
      contentVersion: 'offline-fallback',
      generatedAt: null,
      sourceCount: 0,
      actionCardCount: 0,
      checklistCount: 0,
      fallback: true,
      message: 'Generated content manifest could not be loaded from network or cache.',
    };
  }

  if (pathname.endsWith('/workplans.json')) {
    return { generatedAt: null, workplans: [], fallback: true };
  }

  if (pathname.endsWith('/content-coverage-report.json')) {
    return { generatedAt: null, releaseBoard: { gaps: [] }, fallback: true };
  }

  return [];
}
