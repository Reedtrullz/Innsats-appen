import { describe, expect, it } from 'vitest';
import {
  PERSONAL_PREP_STORAGE_KEY,
  readPersonalPrepChecked,
  readPersonalPrepState,
  resetPersonalPrep,
  sanitizePersonalPrepState,
  togglePersonalPrepItem,
} from '@/lib/personlig/personal-prep-store';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('personal-prep-store', () => {
  it('toggles an item on and off for a checklist slug', () => {
    const s = memoryStorage();
    togglePersonalPrepItem('personlig-utstyr-for-utrykning', 'hjelm-og-verneutstyr', s);
    expect(readPersonalPrepChecked('personlig-utstyr-for-utrykning', s)).toEqual(['hjelm-og-verneutstyr']);
    togglePersonalPrepItem('personlig-utstyr-for-utrykning', 'hjelm-og-verneutstyr', s);
    expect(readPersonalPrepChecked('personlig-utstyr-for-utrykning', s)).toEqual([]);
  });

  it('drops the slug key entirely when its last item is unchecked', () => {
    const s = memoryStorage();
    togglePersonalPrepItem('pakk', 'a', s);
    togglePersonalPrepItem('pakk', 'a', s);
    expect(JSON.parse(s.getItem(PERSONAL_PREP_STORAGE_KEY)!)).toEqual({});
  });

  it('keeps slugs independent', () => {
    const s = memoryStorage();
    togglePersonalPrepItem('pakk', 'a', s);
    togglePersonalPrepItem('lagsutstyr', 'b', s);
    expect(readPersonalPrepChecked('pakk', s)).toEqual(['a']);
    expect(readPersonalPrepChecked('lagsutstyr', s)).toEqual(['b']);
  });

  it('rejects non-slug ids and slugs (no free text / persondata surface)', () => {
    const state = sanitizePersonalPrepState({
      'valid-slug': ['ok-id', 'Ola Nordmann', '<script>', 'another-ok'],
      'Bad Slug!': ['x'],
    });
    expect(state).toEqual({ 'valid-slug': ['ok-id', 'another-ok'] });
  });

  it('resets all prep state', () => {
    const s = memoryStorage();
    togglePersonalPrepItem('pakk', 'a', s);
    resetPersonalPrep(s);
    expect(readPersonalPrepState(s)).toEqual({});
  });
});
