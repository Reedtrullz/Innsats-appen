import fs from 'node:fs';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

// P1-2 — the "Ikke gjør" (doNot) box must show real prohibitions, not a line
// copied verbatim into both doNot and safety. Enforce that no card has a doNot
// string identical to one of its safety strings.
type ActionCardLike = { slug: string; doNot?: string[]; safety?: string[] };

const cards = yaml.load(fs.readFileSync('content/curated/action-cards.yaml', 'utf8')) as ActionCardLike[];

describe('action-card doNot vs safety', () => {
  it('has cards to check', () => {
    expect(cards.length).toBeGreaterThan(0);
  });

  it('never repeats the same line in both doNot and safety on a card', () => {
    const offenders = cards.flatMap((card) => {
      const safety = new Set((card.safety ?? []).map((line) => line.trim()));
      return (card.doNot ?? [])
        .map((line) => line.trim())
        .filter((line) => safety.has(line))
        .map((line) => `${card.slug}: ${line}`);
    });
    expect(offenders, `doNot lines duplicated in safety:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps HRS 2026 SAR safety and prohibition guidance visible', () => {
    for (const slug of [
      'sok-og-redning-startkort',
      'soketeig-sektor',
      'soketeig-plan-kart',
      'ledelse-kommando-kontroll',
      'sok-og-redning-planlegging',
      'sok-og-redning-funn-og-redning',
      'sok-og-redning-faks-og-analogt-ko',
    ]) {
      const card = cards.find((item) => item.slug === slug);
      expect(card?.safety?.length, `${slug} safety`).toBeGreaterThan(0);
      expect(card?.doNot?.length, `${slug} doNot`).toBeGreaterThan(0);
    }

    const startCard = cards.find((item) => item.slug === 'sok-og-redning-startkort');
    expect(startCard?.doNot?.join(' ')).toMatch(/ikke fortsett søket/i);
    expect(startCard?.doNot?.join(' ')).not.toMatch(/^stans søk/i);
  });
});
