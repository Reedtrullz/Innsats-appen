import type { ActionCard } from './schemas';
import type { Phase, Role, Scenario } from './taxonomy';

export interface CardFilter {
  phase?: Phase;
  role?: Role;
  scenario?: Scenario;
  query?: string;
}

export function filterActionCards(cards: ActionCard[], filter: CardFilter): ActionCard[] {
  const query = filter.query?.trim().toLowerCase();
  return cards.filter((card) => {
    if (filter.phase && card.phase !== filter.phase) return false;
    if (filter.role && !card.roles.includes(filter.role)) return false;
    if (filter.scenario && !card.scenarios.includes(filter.scenario)) return false;
    if (query) {
      const haystack = [card.title, ...(card.steps ?? []), ...(card.safety ?? []), ...(card.reporting ?? []), card.warning ?? '', ...(card.competenceRequired ?? []), ...(card.equipmentRequired ?? [])].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortActionCards(cards: ActionCard[]): ActionCard[] {
  const weight = { high: 0, medium: 1, low: 2 } as const;
  return [...cards].sort((a, b) => weight[a.priority] - weight[b.priority] || a.title.localeCompare(b.title, 'nb'));
}
