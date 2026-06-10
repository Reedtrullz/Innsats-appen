export const RUNBOOK_BETA_STORAGE_KEY = 'beredskapsboka-runbook-beta-v1';
export const RUNBOOK_BETA_EVENT = 'innsats-runbook-beta-change';

function getStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readRunbookBeta(storage = getStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(RUNBOOK_BETA_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveRunbookBeta(enabled: boolean, storage = getStorage()): boolean {
  if (storage) {
    try {
      if (enabled) storage.setItem(RUNBOOK_BETA_STORAGE_KEY, '1');
      else storage.removeItem(RUNBOOK_BETA_STORAGE_KEY);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(RUNBOOK_BETA_EVENT));
    } catch {
      // Storage blocked/full — return the requested value anyway.
    }
  }
  return enabled;
}

export function subscribeRunbookBeta(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => callback();
  window.addEventListener(RUNBOOK_BETA_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(RUNBOOK_BETA_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
