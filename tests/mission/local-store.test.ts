import { afterEach, expect, it } from 'vitest';
import { clearLocalMissionData, deleteMission, getChecklistRun, getMission, listMissions, saveChecklistRun, saveMission } from '@/lib/mission/local-store';

const mission = {
  id: 'mission-store-1', title: 'Øvelse tilfluktsrom', createdAt: '2026-06-02T20:00:00.000Z', updatedAt: '2026-06-02T20:00:00.000Z', phase: 'for', role: 'beredskapsvakt', scenario: 'tilfluktsrom', locationText: 'Trondheim sentrum', externalSignals: [{ source: 'met', staleness: 'fresh' }], activeChecklistIds: [], notes: 'lokalt', contentVersion: 'v1',
} as const;

afterEach(async () => clearLocalMissionData());

it('saves, loads, lists and deletes missions without network', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('network should not be used'); }) as any;
  await saveMission(mission as any);
  expect((await getMission(mission.id))?.title).toBe('Øvelse tilfluktsrom');
  expect(await listMissions()).toHaveLength(1);
  await deleteMission(mission.id);
  expect(await listMissions()).toHaveLength(0);
  globalThis.fetch = originalFetch;
});

it('persists checklist runs and source-health-like signals locally', async () => {
  await saveMission(mission as any);
  await saveChecklistRun({ id: 'run-1', missionId: mission.id, templateSlug: 'tilfluktsrom-teknisk-status', checkedItemIds: ['ventilasjon'], notesByItemId: { ventilasjon: 'OK' }, updatedAt: '2026-06-02T20:05:00.000Z', schemaVersion: 1 });
  expect((await getChecklistRun('run-1'))?.checkedItemIds).toContain('ventilasjon');
  expect((await getMission(mission.id))?.externalSignals[0]?.source).toBe('met');
});
