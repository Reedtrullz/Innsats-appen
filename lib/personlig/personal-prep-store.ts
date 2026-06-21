/**
 * Personal-prep progress store (board: Personlig modus "pakk sekken").
 *
 * Mission-independent on purpose — personal preparation happens before any
 * mission exists, so it must not depend on a mission record. Kept in
 * localStorage (like the local profile), NOT the mission IndexedDB, and stores
 * only checked item ids per checklist slug. No free text, no notes, no
 * equipment status — zero persondata surface. The local-reset flow clears this
 * key alongside the other beredskapsboka-local-* keys.
 */

export const PERSONAL_PREP_STORAGE_KEY = 'beredskapsboka-personal-prep-v1';
export const PERSONAL_PREP_CHANGE_EVENT = 'beredskapsboka-personal-prep-change';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUGS = 40;
const MAX_ITEMS_PER_SLUG = 80;

/** slug → checked item ids. */
export type PersonalPrepState = Record<string, string[]>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function sanitizeSlug(value: unknown): string | null {
  const slug = String(value ?? '').trim().toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug.slice(0, 80) : null;
}

function sanitizeItemIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const raw of value) {
    const id = sanitizeSlug(raw);
    if (id) seen.add(id);
    if (seen.size >= MAX_ITEMS_PER_SLUG) break;
  }
  return [...seen];
}

export function sanitizePersonalPrepState(input: unknown): PersonalPrepState {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  const out: PersonalPrepState = {};
  let slugCount = 0;
  for (const [rawSlug, rawIds] of Object.entries(input as Record<string, unknown>)) {
    const slug = sanitizeSlug(rawSlug);
    if (!slug) continue;
    const ids = sanitizeItemIds(rawIds);
    if (ids.length === 0) continue;
    out[slug] = ids;
    slugCount += 1;
    if (slugCount >= MAX_SLUGS) break;
  }
  return out;
}

export function readPersonalPrepState(storage: StorageLike | undefined = getStorage()): PersonalPrepState {
  if (!storage) return {};
  try {
    const raw = storage.getItem(PERSONAL_PREP_STORAGE_KEY);
    return raw ? sanitizePersonalPrepState(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function readPersonalPrepChecked(slug: string, storage: StorageLike | undefined = getStorage()): string[] {
  const key = sanitizeSlug(slug);
  if (!key) return [];
  return readPersonalPrepState(storage)[key] ?? [];
}

function writeState(state: PersonalPrepState, storage: StorageLike | undefined): PersonalPrepState {
  const sanitized = sanitizePersonalPrepState(state);
  if (storage) {
    try {
      storage.setItem(PERSONAL_PREP_STORAGE_KEY, JSON.stringify(sanitized));
      emitChange();
    } catch {
      // Keep sanitized return usable even if storage is blocked or full.
    }
  }
  return sanitized;
}

/** Toggle one item's checked state for a checklist slug. */
export function togglePersonalPrepItem(
  slug: string,
  itemId: string,
  storage: StorageLike | undefined = getStorage(),
): PersonalPrepState {
  const key = sanitizeSlug(slug);
  const id = sanitizeSlug(itemId);
  if (!key || !id) return readPersonalPrepState(storage);
  const state = readPersonalPrepState(storage);
  const current = new Set(state[key] ?? []);
  if (current.has(id)) current.delete(id);
  else current.add(id);
  const next = { ...state };
  if (current.size === 0) delete next[key];
  else next[key] = [...current];
  return writeState(next, storage);
}

export function resetPersonalPrep(storage: StorageLike | undefined = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(PERSONAL_PREP_STORAGE_KEY);
    emitChange();
  } catch {
    // No-op when storage is blocked.
  }
}

export function personalPrepSnapshot(storage: StorageLike | undefined = getStorage()): string {
  return JSON.stringify(readPersonalPrepState(storage));
}

export function subscribePersonalPrep(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === PERSONAL_PREP_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(PERSONAL_PREP_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(PERSONAL_PREP_CHANGE_EVENT, listener);
  };
}

function emitChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PERSONAL_PREP_CHANGE_EVENT));
}
