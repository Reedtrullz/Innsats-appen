import { filterActionCards } from '@/lib/content/filters';
import type { ActionCard } from '@/lib/content/schemas';

const cards = [
  { slug: 'tilflukt', title: 'Tilfluktsrom', phase: 'for', roles: ['leder'], scenarios: ['tilfluktsrom'], priority: 'high', steps: ['a'], safety: [], reporting: [], sourceIds: ['src-a'], competenceRequired: [], warning: 'w' },
  { slug: 'mannskap', title: 'Mannskap', phase: 'under', roles: ['mannskap'], scenarios: ['generelt'], priority: 'low', steps: ['b'], safety: [], reporting: [], sourceIds: ['src-b'], competenceRequired: [], warning: 'w' },
] as ActionCard[];

it('filters by scenario, role, and phase', () => {
  expect(filterActionCards(cards, { scenario: 'tilfluktsrom' }).map((c) => c.slug)).toEqual(['tilflukt']);
  expect(filterActionCards(cards, { role: 'mannskap' }).map((c) => c.slug)).toEqual(['mannskap']);
  expect(filterActionCards(cards, {}).map((c) => c.slug)).toEqual(['tilflukt', 'mannskap']);
  expect(filterActionCards(cards, { phase: 'for' }).map((c) => c.slug)).toEqual(['tilflukt']);
});
