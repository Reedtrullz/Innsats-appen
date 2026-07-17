import { OFFLINE_MAP_PACKAGES } from '@/lib/maps/offline-map';
import { approvedLocalMapPackages } from '@/lib/maps/offline-map-package-manifest';

export const MAP_PACKAGE_SELECTION_STORAGE_KEY = 'beredskapsboka-map-package-selection-v1';
export const MAP_PACKAGE_SELECTION_EVENT = 'beredskapsboka-map-package-selection-change';

export type MapPackageSelection = {
  schematicPackageId?: string;
  pmtilesPackageId?: string;
};

const schematicPackageIds = new Set<string>(OFFLINE_MAP_PACKAGES.map((mapPackage) => mapPackage.id));
const pmtilesPackageIds = new Set<string>(approvedLocalMapPackages.map((mapPackage) => mapPackage.id));

function storage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function mapPackageSelectionSnapshot() {
  try {
    return storage()?.getItem(MAP_PACKAGE_SELECTION_STORAGE_KEY) ?? '{}';
  } catch {
    return '{}';
  }
}

export function normalizeMapPackageSelection(value: unknown): MapPackageSelection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    ...(typeof record.schematicPackageId === 'string' && schematicPackageIds.has(record.schematicPackageId)
      ? { schematicPackageId: record.schematicPackageId }
      : {}),
    ...(typeof record.pmtilesPackageId === 'string' && pmtilesPackageIds.has(record.pmtilesPackageId)
      ? { pmtilesPackageId: record.pmtilesPackageId }
      : {}),
  };
}

export function parseMapPackageSelection(snapshot: string): MapPackageSelection {
  try {
    return normalizeMapPackageSelection(JSON.parse(snapshot));
  } catch {
    return {};
  }
}

export function writeMapPackageSelection(selection: MapPackageSelection) {
  try {
    storage()?.setItem(MAP_PACKAGE_SELECTION_STORAGE_KEY, JSON.stringify(normalizeMapPackageSelection(selection)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(MAP_PACKAGE_SELECTION_EVENT));
  } catch {
    // Package selection is a local convenience; the default schematic map remains available.
  }
}

export function subscribeMapPackageSelection(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === MAP_PACKAGE_SELECTION_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(MAP_PACKAGE_SELECTION_EVENT, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(MAP_PACKAGE_SELECTION_EVENT, listener);
  };
}
