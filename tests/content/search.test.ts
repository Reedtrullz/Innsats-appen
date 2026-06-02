import { buildSearchIndex, searchContent } from '@/lib/content/search';

it('finds operational stress terms', () => {
  const index = buildSearchIndex([
    { id: 'card-tilfluktsrom', title: 'Klargjør tilfluktsrom', body: 'ventilasjon nødstrøm vann sanitær' },
    { id: 'card-radiac', title: 'Dosekontroll', body: 'dosimeter radiac jod' },
  ]);
  expect(searchContent(index, 'tilfluktsrom')[0]?.id).toBe('card-tilfluktsrom');
  expect(searchContent(index, 'jod')[0]?.id).toBe('card-radiac');
});
