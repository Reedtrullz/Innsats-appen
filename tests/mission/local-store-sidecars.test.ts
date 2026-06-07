import { expect, it } from 'vitest';
import { ACTIVE_MISSION_STORAGE_KEY } from '@/lib/mission/active-mission-selection';
import {
  archiveMission,
  clearArchivedMissions,
  clearLocalMissionData,
  deleteMission,
  saveMission,
} from '@/lib/mission/local-store';
import {
  OPERATIONS_MAP_STORAGE_KEY,
  readMissionMapState,
  writeMissionMapState,
  type MissionMapState,
} from '@/lib/maps/operations-map';
import { buildMission } from '../helpers/mission-fixtures';

const now = '2026-06-05T10:00:00.000Z';

function marker(id: string, missionId?: string) {
  return {
    id,
    ...(missionId ? { missionId } : {}),
    itemType: 'marker' as const,
    kind: 'hazard' as const,
    label: id,
    point: { x: 10, y: 20 },
    createdAt: now,
  };
}

function drawing(id: string, missionId?: string) {
  return {
    id,
    ...(missionId ? { missionId } : {}),
    itemType: 'drawing' as const,
    kind: 'sector' as const,
    label: id,
    points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }],
    createdAt: now,
  };
}

function seedMapState(): MissionMapState {
  return writeMissionMapState({
    markers: [marker('marker-a', 'mission-a'), marker('marker-b', 'mission-b'), marker('legacy-marker')],
    drawings: [drawing('drawing-a', 'mission-a'), drawing('drawing-b', 'mission-b'), drawing('legacy-drawing')],
  });
}

it('deleteMission removes scoped map objects and only clears matching active mission id', async () => {
  await saveMission(buildMission({ id: 'mission-a', title: 'A' }));
  await saveMission(buildMission({ id: 'mission-b', title: 'B' }));
  seedMapState();
  localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, 'mission-b');

  await deleteMission('mission-a');

  expect(readMissionMapState().markers.map((item) => item.id)).toEqual(['marker-b', 'legacy-marker']);
  expect(readMissionMapState().drawings.map((item) => item.id)).toEqual(['drawing-b', 'legacy-drawing']);
  expect(localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)).toBe('mission-b');

  await saveMission(buildMission({ id: 'mission-a', title: 'A' }));
  writeMissionMapState({ markers: [marker('marker-a', 'mission-a'), marker('marker-b', 'mission-b')], drawings: [] });
  localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, 'mission-a');

  await deleteMission('mission-a');

  expect(readMissionMapState().markers.map((item) => item.id)).toEqual(['marker-b']);
  expect(localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)).toBeNull();
});

it('clearLocalMissionData clears operations map state and active mission id', async () => {
  await saveMission(buildMission({ id: 'mission-a', title: 'A' }));
  seedMapState();
  localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, 'mission-a');

  await clearLocalMissionData();

  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toBeNull();
  expect(readMissionMapState()).toEqual({ markers: [], drawings: [] });
  expect(localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)).toBeNull();
});

it('clearArchivedMissions purges sidecars for archived missions while preserving active mission map state', async () => {
  await saveMission(buildMission({ id: 'mission-active', title: 'Active' }));
  await saveMission(buildMission({ id: 'mission-archived', title: 'Archived' }));
  await archiveMission('mission-archived', { archivedAt: '2026-06-05T09:00:00.000Z' });
  writeMissionMapState({
    markers: [marker('active-marker', 'mission-active'), marker('archived-marker', 'mission-archived'), marker('legacy-marker')],
    drawings: [drawing('active-drawing', 'mission-active'), drawing('archived-drawing', 'mission-archived'), drawing('legacy-drawing')],
  });
  localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, 'mission-active');

  await clearArchivedMissions();

  expect(readMissionMapState().markers.map((item) => item.id)).toEqual(['active-marker', 'legacy-marker']);
  expect(readMissionMapState().drawings.map((item) => item.id)).toEqual(['active-drawing', 'legacy-drawing']);
  expect(localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)).toBe('mission-active');

  await saveMission(buildMission({ id: 'mission-archived-2', title: 'Archived 2' }));
  await archiveMission('mission-archived-2', { archivedAt: '2026-06-05T09:05:00.000Z' });
  localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, 'mission-archived-2');

  await clearArchivedMissions();

  expect(localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)).toBeNull();
});
