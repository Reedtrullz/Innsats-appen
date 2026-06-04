import { buildOrderUpdateSuggestions } from '@/lib/mission/order-update-suggestions';
import type { FieldLogEntry } from '@/lib/mission/schemas';

const entries: FieldLogEntry[] = [
  { id: 'normal', timestamp: '2026-06-04T09:00:00.000Z', category: 'observasjon', text: 'Normal observasjon', criticalObservation: false, mustBeForwarded: false },
  { id: 'critical', timestamp: '2026-06-04T09:05:00.000Z', category: 'vaer-fare', text: 'Flomvei stengt', criticalObservation: true, mustBeForwarded: true, mapReference: { source: 'map-marker', objectId: 'hazard-1', label: 'Fare nord', point: { x: 44, y: 55 } } },
];

it('suggests manual order update text only from critical or must-forward logs', () => {
  const suggestions = buildOrderUpdateSuggestions(entries);
  expect(suggestions).toHaveLength(1);
  expect(suggestions[0]).toContain('Flomvei stengt');
  expect(suggestions[0]).toContain('Kart: Fare nord 44,55');
  expect(suggestions[0]).toContain('Vurder å oppdatere ordre manuelt');
  expect(suggestions.join(' ')).not.toContain('Normal observasjon');
});
