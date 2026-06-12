export const RECENT_CARDS_STORAGE_KEY = 'beredskapsboka:recent-cards:v1';
export const RECENT_CARDS_EVENT = 'beredskapsboka:recent-cards-changed';
const MAX_RECENT_CARDS = 6;

function getBrowserLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function parseRecentCardSlugs(serialized: string | null | undefined): string[] {
  if (!serialized) return [];
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT_CARDS);
  } catch {
    return [];
  }
}

export function readRecentCardSlugs(storage: Pick<Storage, 'getItem'> | null = getBrowserLocalStorage()): string[] {
  try {
    return parseRecentCardSlugs(storage?.getItem(RECENT_CARDS_STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Records a card visit locally (slugs only — no persondata, no timestamps). */
export function recordRecentCard(slug: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null = getBrowserLocalStorage()): string[] {
  const next = [slug, ...readRecentCardSlugs(storage).filter((item) => item !== slug)].slice(0, MAX_RECENT_CARDS);
  try {
    storage?.setItem(RECENT_CARDS_STORAGE_KEY, JSON.stringify(next));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(RECENT_CARDS_EVENT));
  } catch {
    // Recents are a convenience; locked-down browsers must not break the card.
  }
  return next;
}
