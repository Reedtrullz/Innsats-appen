import { getActionCards, getSourceDocuments } from '@/lib/content/load-content';
import type { ActionCard, SourceDocument } from '@/lib/content/schemas';

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
    ...card.steps,
    ...card.safety,
    ...card.reporting,
    ...card.competenceRequired,
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
