import type { ActionCard, SourceDocument } from './schemas';

export interface SourceCardLink {
  slug: string;
  title: string;
  phase: ActionCard['phase'];
  priority: ActionCard['priority'];
}

export function linkedCardsForSource(source: SourceDocument, cards: ActionCard[]): SourceCardLink[] {
  return cards
    .filter((card) => card.sourceIds.includes(source.id))
    .map((card) => ({ slug: card.slug, title: card.title, phase: card.phase, priority: card.priority }))
    .sort((a, b) => a.title.localeCompare(b.title, 'nb'));
}

export function sourceSectionAnchor(source: SourceDocument): string {
  return source.body.trim().length > 0 ? 'excerpt' : 'metadata';
}

export function sourceExcerpt(source: SourceDocument, maxLength = 900): string {
  const clean = source.body.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()} …`;
}
