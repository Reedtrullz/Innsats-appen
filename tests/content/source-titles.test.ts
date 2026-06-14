import { describe, expect, it } from 'vitest';

import { buildSourceTitleById, formatSourceList } from '@/lib/content/source-titles';

describe('formatSourceList (P1-3 — no raw src- IDs in UI)', () => {
  const titleById = buildSourceTitleById([
    { id: 'src-sjekkliste-fig-og-figp', title: 'FIG/FIGP feltinstruks' },
    { id: 'src-haandbok', title: 'Håndbok for innsats' },
  ]);

  it('resolves known IDs to human source titles', () => {
    expect(formatSourceList(['src-sjekkliste-fig-og-figp', 'src-haandbok'], titleById)).toBe(
      'FIG/FIGP feltinstruks, Håndbok for innsats',
    );
  });

  it('strips the src- prefix as a fallback for unknown IDs', () => {
    expect(formatSourceList(['src-ukjent-kilde'], titleById)).toBe('ukjent-kilde');
  });

  it('never emits a raw src- token', () => {
    const rendered = formatSourceList(['src-a', 'src-b-c'], {});
    expect(rendered).not.toMatch(/\bsrc-/);
  });

  it('returns empty string for missing or empty input', () => {
    expect(formatSourceList(undefined)).toBe('');
    expect(formatSourceList([])).toBe('');
  });
});
