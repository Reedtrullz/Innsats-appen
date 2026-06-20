import type { ActionCard } from './schemas';

export function isWhatNextCard(card: ActionCard) {
  const title = card.title.toLowerCase();
  return title.includes('hva nå') || title.includes('første minutter');
}

export function getWhatNextCards(cards: ActionCard[], options: { phase?: ActionCard['phase']; limit?: number } = {}) {
  const { phase, limit = 6 } = options;
  return cards
    .filter((card) => (!phase || card.phase === phase) && isWhatNextCard(card))
    .slice(0, limit);
}
