import type { MissionContext } from './schemas';

export const ACTIVE_MISSION_STORAGE_KEY = 'beredskapsboka-active-mission-id-v1';

export function selectActiveMission(missions: MissionContext[], selectedId?: string | null) {
  const sanitizedSelectedId = selectedId?.trim() || null;
  return missions.find((mission) => mission.id === sanitizedSelectedId) ?? missions[0] ?? null;
}

function resolveReadableStorage(storage?: Pick<Storage, 'getItem'>): Pick<Storage, 'getItem'> | null {
  if (storage) return storage;
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function resolveWritableStorage(storage?: Pick<Storage, 'setItem' | 'removeItem'>): Pick<Storage, 'setItem' | 'removeItem'> | null {
  if (storage) return storage;
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readSelectedActiveMissionId(storage?: Pick<Storage, 'getItem'>): string | null {
  const targetStorage = resolveReadableStorage(storage);
  if (!targetStorage) return null;
  try {
    const selectedId = targetStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)?.trim() ?? '';
    return selectedId || null;
  } catch {
    return null;
  }
}

export function saveSelectedActiveMissionId(missionId: string | null, storage?: Pick<Storage, 'setItem' | 'removeItem'>): string | null {
  const targetStorage = resolveWritableStorage(storage);
  if (!targetStorage) return null;
  const selectedId = missionId?.trim() ?? '';
  try {
    if (!selectedId) {
      targetStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
      return null;
    }
    targetStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, selectedId);
    return selectedId;
  } catch {
    return null;
  }
}
