import { expect, it } from 'vitest';
import { ACTIVE_MISSION_STORAGE_KEY, readSelectedActiveMissionId, saveSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import type { MissionContext } from '@/lib/mission/schemas';

function mission(id: string): MissionContext {
  return {
    id,
    title: id,
    createdAt: '2026-06-04T08:00:00.000Z',
    updatedAt: '2026-06-04T08:00:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Lokalt område',
    externalSignals: [],
    externalSignalHistory: [],
    activeChecklistIds: [],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    fieldLogEntries: [],
    ruhReports: [],
    welfareChecks: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  };
}

it('selects the mission matching the selected id', () => {
  const missions = [mission('mission-a'), mission('mission-b')];

  expect(selectActiveMission(missions, 'mission-b')?.id).toBe('mission-b');
});

it('falls back to the first mission for missing, null or stale selected id', () => {
  const missions = [mission('mission-a'), mission('mission-b')];

  expect(selectActiveMission(missions)?.id).toBe('mission-a');
  expect(selectActiveMission(missions, null)?.id).toBe('mission-a');
  expect(selectActiveMission(missions, 'stale-mission')?.id).toBe('mission-a');
  expect(selectActiveMission([], 'stale-mission')).toBeNull();
});

it('read/save helper handles storage safely and clears empty or null selection', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };

  expect(saveSelectedActiveMissionId('  mission-b  ', storage)).toBe('mission-b');
  expect(values.get(ACTIVE_MISSION_STORAGE_KEY)).toBe('mission-b');
  expect(readSelectedActiveMissionId(storage)).toBe('mission-b');

  expect(saveSelectedActiveMissionId('', storage)).toBeNull();
  expect(values.has(ACTIVE_MISSION_STORAGE_KEY)).toBe(false);

  values.set(ACTIVE_MISSION_STORAGE_KEY, '   ');
  expect(readSelectedActiveMissionId(storage)).toBeNull();

  values.set(ACTIVE_MISSION_STORAGE_KEY, 'mission-a');
  expect(saveSelectedActiveMissionId(null, storage)).toBeNull();
  expect(values.has(ACTIVE_MISSION_STORAGE_KEY)).toBe(false);

  expect(readSelectedActiveMissionId({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
  expect(saveSelectedActiveMissionId('mission-c', { setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } })).toBeNull();
});
