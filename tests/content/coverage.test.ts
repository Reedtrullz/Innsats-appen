import { buildContentCoverageReport } from '@/lib/content/coverage-report';
import { getActionCards, getChecklists, getGlossaryTerms, getProtectionMeasures, getSourceDocuments, getTrainingPaths } from '@/lib/content/load-content';
import type { ActionCard, SourceDocument } from '@/lib/content/schemas';
import { stepText } from '@/lib/content/steps';

const requiredMarkers = [
  '5-punktsordre',
  'samband',
  'FIG10',
  'MFE',
  'RADIAC',
  'CBRN',
  'tilfluktsrom',
  'psykologisk førstehjelp',
  'sjekkliste',
];

function normalize(parts: string[]) {
  return parts.join('\n').toLowerCase();
}

function cardText(card: ActionCard) {
  return normalize([
    card.title,
    card.slug,
    ...card.steps.map(stepText),
    ...(card.safety ?? []),
    ...(card.reporting ?? []),
    ...(card.competenceRequired ?? []),
    ...(card.warning ? [card.warning] : []),
  ]);
}

function sourceText(source: SourceDocument) {
  return normalize([
    source.title,
    source.id,
    source.body,
    ...source.warnings,
  ]);
}

it('keeps critical source domains represented by at least one generated card or source', () => {
  const cards = getActionCards();
  const sources = getSourceDocuments();
  const corpus = normalize([...cards.map(cardText), ...sources.map(sourceText)]);

  for (const marker of requiredMarkers) {
    expect(corpus, `missing critical content marker: ${marker}`).toContain(marker.toLowerCase());
  }
});

it('keeps coverage backed by both action cards and source documents', () => {
  const cards = getActionCards();
  const sources = getSourceDocuments();
  const cardsText = normalize(cards.map(cardText));
  const sourcesText = normalize(sources.map(sourceText));

  expect(cards.length).toBeGreaterThan(0);
  expect(sources.length).toBeGreaterThan(0);
  expect(cardsText).toContain('tilfluktsrom');
  expect(cardsText).toContain('radiac');
  expect(cardsText).toContain('sjekkliste');
  expect(cardsText).toContain('psykologisk');
  expect(sourcesText).toContain('5-punktsordre');
});

it('does not leave orphan sources without accepted-risk metadata', () => {
  const report = buildContentCoverageReport({
    sources: getSourceDocuments(),
    actionCards: getActionCards(),
    checklists: getChecklists(),
    trainingPaths: getTrainingPaths(),
    protectionMeasures: getProtectionMeasures(),
    glossary: getGlossaryTerms(),
  }, '2026-06-04T00:00:00.000Z');

  expect(report.linkage.sourcesWithoutReferences).toEqual([]);
  expect(report.releaseBoard.gaps.find((gap) => gap.id === 'content-orphan-sources')?.count ?? 0).toBe(0);
});

it('flags expanded cards that are not fagperson-reviewed and clears them once reviewed', () => {
  const baseCard = {
    phase: 'under',
    roles: ['lagforer'],
    scenarios: ['generelt'],
    priority: 'high',
    safety: [],
    reporting: [],
    sourceIds: ['src-x'],
    authority: 'leder',
  };
  const expandedSteps = ['et', 'to', 'tre', 'fire', 'fem'];
  const graph = {
    sources: [],
    actionCards: [
      { ...baseCard, slug: 'expanded-unreviewed', steps: expandedSteps, reviewStatus: 'unreviewed' },
      { ...baseCard, slug: 'expanded-pending', steps: expandedSteps, reviewStatus: 'pending-fagperson' },
      { ...baseCard, slug: 'expanded-reviewed', steps: expandedSteps, reviewStatus: 'reviewed', reviewedBy: 'Fagperson' },
      { ...baseCard, slug: 'short-unreviewed', steps: ['et', 'to', 'tre'], reviewStatus: 'unreviewed' },
    ],
  };

  const report = buildContentCoverageReport(graph as never, '2026-06-13T00:00:00.000Z');
  expect(report.risk.expandedCardsAwaitingFagperson).toEqual(['expanded-pending', 'expanded-unreviewed']);
  const gap = report.releaseBoard.gaps.find((candidate) => candidate.id === 'content-expanded-cards-unreviewed');
  expect(gap?.count).toBe(2);
  expect(gap?.severity).toBe('high');
});

it('ensures every action card has a valid authority value', () => {
  const cards = getActionCards();
  const validAuthorities = new Set(['leder', 'lagforer', 'mannskap', 'beredskapsvakt']);
  for (const card of cards) {
    expect(card.authority, `card ${card.slug} missing authority`).toBeDefined();
    expect(validAuthorities.has(card.authority!), `card ${card.slug} invalid authority: ${card.authority}`).toBe(true);
  }
});

it('ensures doNot entries are non-empty strings', () => {
  const cards = getActionCards();
  for (const card of cards) {
    if (!card.doNot || card.doNot.length === 0) continue;
    for (const item of card.doNot) {
      expect(typeof item, `card ${card.slug} doNot item is not a string`).toBe('string');
      expect((item as string).length, `card ${card.slug} doNot item is empty`).toBeGreaterThan(0);
    }
  }
});
