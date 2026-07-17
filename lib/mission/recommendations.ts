import type { ActionCard } from '@/lib/content/schemas';
import { filterActionCards, sortActionCards } from '@/lib/content/filters';
import { isWhatNextCard } from '@/lib/content/what-next-cards';
import type { MissionContext } from '@/lib/mission/schemas';

export type MissionRecommendationScope = 'exact' | 'widened-role' | 'none';

export type MissionRecommendations = {
  currentPhaseCards: ActionCard[];
  otherPhaseCards: ActionCard[];
  scope: MissionRecommendationScope;
};

function prioritizeWhatNext(cards: ActionCard[]) {
  const sortedCards = sortActionCards(cards);
  const firstActions = sortedCards.slice(0, 3);
  const firstWhatNextCard = sortedCards.find(isWhatNextCard);

  if (!firstWhatNextCard || firstActions.some((card) => card.slug === firstWhatNextCard.slug)) return firstActions;

  const replaceableIndex = firstActions.findLastIndex((card) => card.priority === firstWhatNextCard.priority);
  if (replaceableIndex === -1) return firstActions;

  return firstActions.map((card, index) => (index === replaceableIndex ? firstWhatNextCard : card));
}

export function selectMissionRecommendations(cards: ActionCard[], mission: MissionContext): MissionRecommendations {
  const exact = filterActionCards(cards, { phase: mission.phase, role: mission.role, scenario: mission.scenario });
  const samePhase = exact.length > 0 ? exact : filterActionCards(cards, { phase: mission.phase, scenario: mission.scenario });
  const otherPhases = cards.filter((card) => card.phase !== mission.phase && card.scenarios.includes(mission.scenario));

  return {
    currentPhaseCards: prioritizeWhatNext(samePhase),
    otherPhaseCards: prioritizeWhatNext(otherPhases),
    scope: exact.length > 0 ? 'exact' : samePhase.length > 0 ? 'widened-role' : 'none',
  };
}
