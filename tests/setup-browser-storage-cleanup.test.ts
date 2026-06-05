import { expect, it } from 'vitest';
import { listMissions, saveMission } from '@/lib/mission/local-store';
import { buildMission } from './helpers/mission-fixtures';

it('records browser storage state that must not leak past the test boundary', async () => {
  localStorage.setItem('task-25-local-storage-leak', 'dirty');
  sessionStorage.setItem('task-25-session-storage-leak', 'dirty');
  await saveMission(buildMission({
    id: 'task-25-indexeddb-leak',
    title: 'Task 25 IndexedDB leak proof',
    createdAt: '2026-06-05T00:00:00.000Z',
    updatedAt: '2026-06-05T00:01:00.000Z',
    contentVersion: 'test-v1',
  }));

  expect(localStorage.getItem('task-25-local-storage-leak')).toBe('dirty');
  expect(sessionStorage.getItem('task-25-session-storage-leak')).toBe('dirty');
  expect((await listMissions()).map((mission) => mission.id)).toContain('task-25-indexeddb-leak');
});

it('starts the next test with clean browser storage', async () => {
  expect(localStorage.getItem('task-25-local-storage-leak')).toBeNull();
  expect(sessionStorage.getItem('task-25-session-storage-leak')).toBeNull();
  expect((await listMissions()).map((mission) => mission.id)).not.toContain('task-25-indexeddb-leak');
});
