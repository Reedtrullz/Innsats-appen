import { afterEach, expect, it, vi } from 'vitest';

import { scrollMapElementIntoView } from '@/lib/maps/map-scrolling';

afterEach(() => {
  vi.restoreAllMocks();
});

it('does not throw when the runtime element has no scrollIntoView implementation', () => {
  vi.spyOn(document, 'getElementById').mockReturnValue(document.createElement('div'));

  expect(() => scrollMapElementIntoView('water-supply-planner')).not.toThrow();
});

it('centres the requested element when scrolling is supported', () => {
  const scrollIntoView = vi.fn();
  const element = document.createElement('div');
  Object.defineProperty(element, 'scrollIntoView', { value: scrollIntoView });
  vi.spyOn(document, 'getElementById').mockReturnValue(element);

  scrollMapElementIntoView('water-supply-planner');

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
});
