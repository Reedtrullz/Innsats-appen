import { MissionContextSchema } from '@/lib/mission/schemas';

it('accepts local tilfluktsrom mission context', () => {
  const mission = MissionContextSchema.parse({
    id: 'mission-1',
    title: 'Øvelse tilfluktsrom',
    createdAt: '2026-06-02T20:00:00.000Z',
    updatedAt: '2026-06-02T20:00:00.000Z',
    phase: 'for',
    role: 'beredskapsvakt',
    scenario: 'tilfluktsrom',
    locationText: 'Trondheim sentrum',
    externalSignals: [],
    activeChecklistIds: ['tilfluktsrom-teknisk-status'],
    notes: 'Lokal øvelse',
    contentVersion: 'v1',
  });
  expect(mission.scenario).toBe('tilfluktsrom');
});

it('rejects person-identifying fields outside the schema', () => {
  const result = MissionContextSchema.safeParse({
    id: 'mission-1', title: 'Oppdrag', createdAt: '2026-06-02T20:00:00.000Z', updatedAt: '2026-06-02T20:00:00.000Z', phase: 'for', role: 'mannskap', scenario: 'generelt', locationText: 'Trondheim', externalSignals: [], activeChecklistIds: [], notes: '', contentVersion: 'v1', patientName: 'Ola Nordmann', personnummer: '01010112345',
  });
  expect(result.success).toBe(false);
});
