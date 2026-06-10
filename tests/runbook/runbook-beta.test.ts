import { describe, expect, it } from 'vitest';
import { RUNBOOK_BETA_STORAGE_KEY, readRunbookBeta, saveRunbookBeta } from '@/lib/runbook/runbook-beta';

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe('runbook beta flag', () => {
  it('defaults to off', () => {
    expect(readRunbookBeta(makeStorage())).toBe(false);
  });

  it('persists enabled as a flag and clears it on disable', () => {
    const storage = makeStorage();
    saveRunbookBeta(true, storage);
    expect(storage.getItem(RUNBOOK_BETA_STORAGE_KEY)).toBe('1');
    expect(readRunbookBeta(storage)).toBe(true);

    saveRunbookBeta(false, storage);
    expect(readRunbookBeta(storage)).toBe(false);
  });
});
