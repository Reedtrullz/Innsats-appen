import { afterEach, expect, it } from 'vitest';
import { clearLocalMissionData, deleteMission, getChecklistRun, getMission, listMissions, saveChecklistRun, saveMission } from '@/lib/mission/local-store';
import { MissionContextSchema } from '@/lib/mission/schemas';

const baseMission = {
  id: 'm2b',
  title: 'FIG innsats lokal tavle',
  createdAt: '2026-06-03T10:00:00.000Z',
  updatedAt: '2026-06-03T10:05:00.000Z',
  phase: 'under',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Innsatsområde nord',
  externalSignals: [],
  activeChecklistIds: ['fig-under-innsats'],
  notes: 'Kort lokal situasjonsnote uten persondata',
  contentVersion: 'test-v1',
  schemaVersion: 1,
} as const;

afterEach(async () => clearLocalMissionData());

it('saves, loads, lists and deletes missions without network', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('network should not be used'); }) as any;
  try {
    const mission = MissionContextSchema.parse({
      ...baseMission,
      id: 'mission-store-1',
      title: 'Øvelse tilfluktsrom',
      phase: 'for',
      role: 'beredskapsvakt',
      scenario: 'tilfluktsrom',
      locationText: 'Trondheim sentrum',
      externalSignals: [{ source: 'met', kind: 'weather', severity: 'info', title: 'Vær', summary: 'Siste værdata', validFrom: null, validTo: null, fetchedAt: '2026-06-02T20:00:00.000Z', staleness: 'fresh', upstreamHash: 'abc123', rawRef: 'met:locationforecast' }],
      activeChecklistIds: [],
      notes: 'lokalt',
    });

    await saveMission(mission);
    expect((await getMission(mission.id))?.title).toBe('Øvelse tilfluktsrom');
    expect((await listMissions()).map((stored) => stored.id)).toContain(mission.id);
    await deleteMission(mission.id);
    expect(await listMissions()).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

it('persists checklist runs and complete source-health-like signals locally', async () => {
  const mission = MissionContextSchema.parse({
    ...baseMission,
    id: 'mission-store-signals',
    externalSignals: [{ source: 'met', kind: 'weather', severity: 'info', title: 'Vær', summary: 'Siste værdata', validFrom: null, validTo: null, fetchedAt: '2026-06-02T20:00:00.000Z', staleness: 'fresh', upstreamHash: 'abc123', rawRef: 'met:locationforecast' }],
  });

  await saveMission(mission);
  await saveChecklistRun({ id: 'run-1', missionId: mission.id, templateSlug: 'tilfluktsrom-teknisk-status', checkedItemIds: ['ventilasjon'], notesByItemId: { ventilasjon: 'OK' }, updatedAt: '2026-06-02T20:05:00.000Z', schemaVersion: 1 });

  expect((await getChecklistRun('run-1'))?.checkedItemIds).toContain('ventilasjon');
  expect((await getMission(mission.id))?.externalSignals[0]?.title).toBe('Vær');
});

it('stores local mission tasks, quick status log and resource requests with allowed status values only', async () => {
  const mission = MissionContextSchema.parse({
    ...baseMission,
    tasks: [
      { id: 'task-1', title: 'Kontroller sperring ved nordre innkjøring', status: 'in-progress', createdAt: '2026-06-03T10:01:00.000Z', updatedAt: '2026-06-03T10:02:00.000Z', notes: 'Ikke legg inn navn eller ID' },
      { id: 'task-2', title: 'Avklar ekstra lys', status: 'needs-assistance', createdAt: '2026-06-03T10:03:00.000Z', updatedAt: '2026-06-03T10:04:00.000Z' },
    ],
    statusLog: [
      { id: 'status-1', message: 'på posisjon', createdAt: '2026-06-03T10:02:00.000Z' },
      { id: 'status-2', message: 'trenger assistanse', createdAt: '2026-06-03T10:04:00.000Z', note: 'Ved materiellpunkt' },
    ],
    resourceRequests: [
      { id: 'resource-1', kind: 'water', status: 'not-started', createdAt: '2026-06-03T10:04:00.000Z', note: 'Vann til laget' },
      { id: 'resource-2', kind: 'ppe', status: 'blocked', createdAt: '2026-06-03T10:05:00.000Z', quantity: '3 sett', note: 'Ekstra verneutstyr' },
    ],
  });

  await saveMission(mission);
  const [stored] = await listMissions();

  expect(stored.tasks.map((task) => task.status)).toEqual(['in-progress', 'needs-assistance']);
  expect(stored.statusLog.map((status) => status.message)).toEqual(['på posisjon', 'trenger assistanse']);
  expect(stored.resourceRequests.map((request) => request.kind)).toEqual(['water', 'ppe']);
});

it('rejects unsupported local task statuses and quick status messages', () => {
  expect(MissionContextSchema.safeParse({
    ...baseMission,
    tasks: [{ id: 'bad-task', title: 'Ugyldig', status: 'waiting', createdAt: '2026-06-03T10:01:00.000Z', updatedAt: '2026-06-03T10:01:00.000Z' }],
  }).success).toBe(false);

  expect(MissionContextSchema.safeParse({
    ...baseMission,
    statusLog: [{ id: 'bad-status', message: 'sendt til server', createdAt: '2026-06-03T10:01:00.000Z' }],
  }).success).toBe(false);
});
