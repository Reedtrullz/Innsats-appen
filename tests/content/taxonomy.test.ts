import { scenarioLabels, scenarios, roleLabels, roles, phases, nextPhase, prevPhase } from '@/lib/content/taxonomy';

it('contains the required operational scenarios', () => {
  expect(scenarios).toContain('tilfluktsrom');
  expect(scenarios).toContain('cbrn-cbrne');
  expect(scenarios).toContain('radiac-nedfall');
});

it('has labels for every role and scenario', () => {
  for (const role of roles) expect(roleLabels[role]).toBeTruthy();
  for (const scenario of scenarios) expect(scenarioLabels[scenario]).toBeTruthy();
  expect(phases).toEqual(['for', 'under', 'etter']);
});

it('walks phases forward, terminating at etter', () => {
  expect(nextPhase('for')).toBe('under');
  expect(nextPhase('under')).toBe('etter');
  expect(nextPhase('etter')).toBeNull();
});

it('walks phases backward, terminating at for', () => {
  expect(prevPhase('etter')).toBe('under');
  expect(prevPhase('under')).toBe('for');
  expect(prevPhase('for')).toBeNull();
});
