export type OfflineMapPackageId = 'trondheim-lokal' | 'trondelag-oversikt' | 'ovelse-liten';

export type SchematicMapFeatureKind = 'depot' | 'meeting-point' | 'risk-area' | 'route' | 'resource';

export type SchematicMapFeature = {
  id: string;
  label: string;
  kind: SchematicMapFeatureKind;
  x: number;
  y: number;
};

export type OfflineMapPackage = {
  id: OfflineMapPackageId;
  title: string;
  district: string;
  description: string;
  estimatedSizeMb: number;
  version: string;
  updatedAt: string;
  features: SchematicMapFeature[];
};

export type CachedOfflineMapPackage = {
  packageId: OfflineMapPackageId;
  title: string;
  estimatedSizeMb: number;
  version: string;
  cachedAt: string;
};

export const OFFLINE_MAP_CACHE_STORAGE_KEY = 'beredskapsboka-offline-map-cache-v1';
export const OFFLINE_MAP_CACHE_EVENT = 'beredskapsboka:offline-map-cache';
export const OFFLINE_MAP_CACHE_WARNING_THRESHOLD_MB = 25;
export const MAX_RENDERED_MAP_FEATURES = 12;

export const OFFLINE_MAP_APPROACH = {
  decision: 'Static schematic local map package for MVP, with MBTiles/MapLibre/Leaflet deferred to a governed package plan.',
  adr: 'docs/adr/2026-06-04-offline-map-architecture.md',
  networkPolicy: 'No tile URLs, external map APIs or backend sync are used by the MVP map page.',
} as const;

export const OFFLINE_MAP_ATTRIBUTION = 'Schematic local map package, not authoritative navigation. © Beredskapsboka MVP.';
export const OFFLINE_MAP_LIMITATION_COPY = 'Skjematisk lokalkart for øvelse og beslutningsstøtte. Ikke bruk som autoritativ navigasjon, posisjonering eller offisielt kommandosystem.';

export const OFFLINE_MAP_PACKAGES: OfflineMapPackage[] = [
  {
    id: 'trondheim-lokal',
    title: 'Trondheim lokalpakke',
    district: 'Trondheim / Trøndelag',
    description: 'Liten skjematisk pakke for lokale møteplasser, depot og hovedakser i en hendelse.',
    estimatedSizeMb: 18,
    version: '2026.06-a',
    updatedAt: '2026-06-04',
    features: [
      { id: 'trd-depot', label: 'Depot', kind: 'depot', x: 18, y: 68 },
      { id: 'trd-mote-nord', label: 'Møteplass nord', kind: 'meeting-point', x: 34, y: 28 },
      { id: 'trd-mote-sor', label: 'Møteplass sør', kind: 'meeting-point', x: 58, y: 72 },
      { id: 'trd-ressurs', label: 'Ressursakse', kind: 'route', x: 49, y: 50 },
      { id: 'trd-risiko', label: 'Marker risiko', kind: 'risk-area', x: 73, y: 34 },
      { id: 'trd-samband', label: 'Samband', kind: 'resource', x: 76, y: 70 },
    ],
  },
  {
    id: 'trondelag-oversikt',
    title: 'Trøndelag oversiktspakke',
    district: 'Trøndelag distrikt',
    description: 'Større skjematisk distriktsoversikt for forhåndsplanlagte akser og ressursområder.',
    estimatedSizeMb: 42,
    version: '2026.06-a',
    updatedAt: '2026-06-04',
    features: [
      { id: 'trl-01', label: 'Distrikt nord', kind: 'meeting-point', x: 24, y: 18 },
      { id: 'trl-02', label: 'Distrikt sør', kind: 'meeting-point', x: 42, y: 78 },
      { id: 'trl-03', label: 'Kystakse', kind: 'route', x: 18, y: 48 },
      { id: 'trl-04', label: 'Innlandsakse', kind: 'route', x: 72, y: 48 },
      { id: 'trl-05', label: 'Depot vest', kind: 'depot', x: 14, y: 64 },
      { id: 'trl-06', label: 'Depot øst', kind: 'depot', x: 80, y: 28 },
      { id: 'trl-07', label: 'Ressurs nord', kind: 'resource', x: 39, y: 30 },
      { id: 'trl-08', label: 'Ressurs sør', kind: 'resource', x: 63, y: 68 },
      { id: 'trl-09', label: 'Risiko flom', kind: 'risk-area', x: 52, y: 40 },
      { id: 'trl-10', label: 'Risiko skred', kind: 'risk-area', x: 68, y: 22 },
      { id: 'trl-11', label: 'Reserve møteplass', kind: 'meeting-point', x: 31, y: 58 },
      { id: 'trl-12', label: 'Samband høyde', kind: 'resource', x: 84, y: 58 },
      { id: 'trl-13', label: 'Ekstra punkt', kind: 'resource', x: 46, y: 16 },
      { id: 'trl-14', label: 'Ekstra akse', kind: 'route', x: 58, y: 84 },
    ],
  },
  {
    id: 'ovelse-liten',
    title: 'Øvelse liten pakke',
    district: 'Lokal øvingsflate',
    description: 'Minimal skissepakke for å teste offline flyt uten stor cachebruk.',
    estimatedSizeMb: 6,
    version: '2026.06-a',
    updatedAt: '2026-06-04',
    features: [
      { id: 'ov-depot', label: 'Depot', kind: 'depot', x: 22, y: 70 },
      { id: 'ov-mote', label: 'Møteplass', kind: 'meeting-point', x: 50, y: 42 },
      { id: 'ov-risiko', label: 'Markert område', kind: 'risk-area', x: 72, y: 32 },
    ],
  },
];

export function getOfflineMapPackage(packageId: string | null | undefined) {
  return OFFLINE_MAP_PACKAGES.find((mapPackage) => mapPackage.id === packageId);
}

export function capMapFeatures(features: SchematicMapFeature[], limit = MAX_RENDERED_MAP_FEATURES) {
  return features.slice(0, Math.max(0, limit));
}

export function getRenderableMapFeatures(mapPackage: OfflineMapPackage | undefined, limit = MAX_RENDERED_MAP_FEATURES) {
  return capMapFeatures(mapPackage?.features ?? OFFLINE_MAP_PACKAGES[0].features, limit);
}

export function normalizeCachedOfflineMapPackage(value: unknown): CachedOfflineMapPackage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Partial<Record<keyof CachedOfflineMapPackage, unknown>>;
  const mapPackage = typeof record.packageId === 'string' ? getOfflineMapPackage(record.packageId) : undefined;
  if (!mapPackage) return null;
  return {
    packageId: mapPackage.id,
    title: mapPackage.title,
    estimatedSizeMb: mapPackage.estimatedSizeMb,
    version: typeof record.version === 'string' ? record.version : mapPackage.version,
    cachedAt: typeof record.cachedAt === 'string' ? record.cachedAt : new Date(0).toISOString(),
  };
}

export function parseCachedOfflineMapPackage(raw: string | null): CachedOfflineMapPackage | null {
  if (!raw) return null;
  try {
    return normalizeCachedOfflineMapPackage(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getBrowserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readCachedOfflineMapPackage(storage?: Pick<Storage, 'getItem'>): CachedOfflineMapPackage | null {
  try {
    const resolvedStorage = storage ?? getBrowserLocalStorage();
    return parseCachedOfflineMapPackage(resolvedStorage?.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function writeCachedOfflineMapPackage(packageId: OfflineMapPackageId, storage?: Pick<Storage, 'setItem'>, now = new Date()): CachedOfflineMapPackage {
  const mapPackage = getOfflineMapPackage(packageId) ?? OFFLINE_MAP_PACKAGES[0];
  const cached: CachedOfflineMapPackage = {
    packageId: mapPackage.id,
    title: mapPackage.title,
    estimatedSizeMb: mapPackage.estimatedSizeMb,
    version: mapPackage.version,
    cachedAt: now.toISOString(),
  };
  try {
    const resolvedStorage = storage ?? getBrowserLocalStorage();
    resolvedStorage?.setItem(OFFLINE_MAP_CACHE_STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Browser storage can be unavailable or quota-limited. Return the normalized record so UI can stay usable.
  }
  if (!storage && typeof window !== 'undefined') window.dispatchEvent(new Event(OFFLINE_MAP_CACHE_EVENT));
  return cached;
}

export function resetCachedOfflineMapPackage(storage?: Pick<Storage, 'removeItem'>) {
  try {
    const resolvedStorage = storage ?? getBrowserLocalStorage();
    resolvedStorage?.removeItem(OFFLINE_MAP_CACHE_STORAGE_KEY);
  } catch {
    // Keep reset idempotent even when browser storage is restricted.
  }
  if (!storage && typeof window !== 'undefined') window.dispatchEvent(new Event(OFFLINE_MAP_CACHE_EVENT));
}

export function offlineMapCacheSnapshot() {
  return JSON.stringify(readCachedOfflineMapPackage());
}

export function subscribeOfflineMapCache(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === OFFLINE_MAP_CACHE_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(OFFLINE_MAP_CACHE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(OFFLINE_MAP_CACHE_EVENT, callback);
  };
}

export function cacheSizeWarningForPackage(mapPackage: Pick<OfflineMapPackage, 'estimatedSizeMb' | 'title'>) {
  if (mapPackage.estimatedSizeMb < OFFLINE_MAP_CACHE_WARNING_THRESHOLD_MB) return null;
  return `Cache-varsel: ${mapPackage.title} er anslått til ${mapPackage.estimatedSizeMb} MB. Store lokale kartpakker kan fortrenge annet offline-innhold på eldre telefoner.`;
}
