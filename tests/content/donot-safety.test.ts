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
});
