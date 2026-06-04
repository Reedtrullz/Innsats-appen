import { openDB } from 'idb';
import { afterEach, expect, it } from 'vitest';
import { archiveMission, clearArchivedMissions, clearLocalMissionData, deleteArchivedMission, deleteMission, getChecklistRun, getMission, listArchivedMissions, listMissions, replaceLocalMissionData, saveChecklistRun, saveMission } from '@/lib/mission/local-store';
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

it('atomically replaces local missions and checklist runs for local imports', async () => {
  const oldMission = MissionContextSchema.parse({ ...baseMission, id: 'mission-replace-old', title: 'Gammelt lokalt oppdrag' });
  const nextMission = MissionContextSchema.parse({ ...baseMission, id: 'mission-replace-new', title: 'Nytt importert oppdrag', updatedAt: '2026-06-03T11:00:00.000Z' });
  await saveMission(oldMission);
  await saveChecklistRun({ id: 'run-replace-old', missionId: oldMission.id, templateSlug: 'fig-under-innsats', checkedItemIds: ['old'], notesByItemId: {}, updatedAt: '2026-06-03T10:10:00.000Z', schemaVersion: 1 });

  const counts = await replaceLocalMissionData([nextMission], [{ id: 'run-replace-new', missionId: nextMission.id, templateSlug: 'fig-under-innsats', checkedItemIds: ['new'], notesByItemId: {}, equipmentStatusByItemId: {}, updatedAt: '2026-06-03T11:05:00.000Z', schemaVersion: 1 }]);

  expect(counts).toEqual({ missions: 1, checklistRuns: 1 });
  expect(await getMission(oldMission.id)).toBeUndefined();
  expect(await getChecklistRun('run-replace-old')).toBeUndefined();
  expect((await getMission(nextMission.id))?.title).toBe('Nytt importert oppdrag');
  expect((await getChecklistRun('run-replace-new'))?.checkedItemIds).toEqual(['new']);
});

it('migrates old local missions by stripping retired geometry fields from context signals', async () => {
  await saveMission(MissionContextSchema.parse({ ...baseMission, id: 'mission-store-migration-seed' }));
  const database = await openDB('beredskapsboka-local', 1);
  await database.put('missions', {
    ...baseMission,
    id: 'mission-store-legacy-context-shape',
    updatedAt: '2026-06-03T10:06:00.000Z',
    externalSignals: [{ source: 'met', kind: 'weather', severity: 'info', title: 'Vær', summary: 'OK', validFrom: null, validTo: null, fetchedAt: '2026-06-02T20:00:00.000Z', staleness: 'fresh', upstreamHash: 'abc123', rawRef: 'met:locationforecast', geometry: { type: 'Point', coordinates: [10.39, 63.43] } }],
    externalSignalHistory: [{ source: 'met', kind: 'weather', severity: 'info', title: 'Historisk vær', summary: 'OK', validFrom: null, validTo: null, fetchedAt: '2026-06-02T19:00:00.000Z', staleness: 'stale', upstreamHash: 'old123', rawRef: 'met:locationforecast', geometry: { type: 'Point', coordinates: [10.39, 63.43] } }],
  });

  const stored = (await listMissions()).find((mission) => mission.id === 'mission-store-legacy-context-shape');
  expect(stored?.externalSignals[0]).toMatchObject({ title: 'Vær', rawRef: 'met:locationforecast' });
  expect(JSON.stringify(stored)).not.toContain('geometry');
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

it('stores structured field log entries and defaults old missions to empty field log, RUH and welfare arrays', async () => {
  const oldMission = MissionContextSchema.parse({ ...baseMission, id: 'mission-old-field-log-default' });
  const mission = MissionContextSchema.parse({
    ...baseMission,
    id: 'mission-field-log-roundtrip',
    fieldLogEntries: [
      {
        id: 'field-log-1',
        timestamp: '2026-06-03T10:06:00.000Z',
        locationText: 'Sperrepunkt øst',
        category: 'observasjon',
        text: 'Vannstand stiger uten persondata',
        linkedMissionId: 'mission-field-log-roundtrip',
        criticalObservation: true,
        mustBeForwarded: true,
      },
    ],
    ruhReports: [
      {
        id: 'ruh-store-1',
        timestamp: '2026-06-03T10:07:00.000Z',
        category: 'hms',
        whatHappened: 'Glatt dekke ved depot uten persondata',
        immediateMeasure: 'Strødd og varslet laget',
        risk: 'middels',
        followUpNeeded: true,
        linkedMissionId: 'mission-field-log-roundtrip',
      },
    ],
    welfareChecks: [
      {
        id: 'welfare-store-1',
        timestamp: '2026-06-03T10:08:00.000Z',
        physicalLoad: 'moderat',
        mentalLoad: 'lav',
        needsRest: false,
        needsRelief: true,
        reminders: { water: true, food: true, warmth: false, rest: false, dryClothing: true },
        note: 'Planlegg avløsning',
      },
    ],
  });

  await saveMission(oldMission);
  await saveMission(mission);

  const storedOldMission = await getMission(oldMission.id);
  const storedMission = await getMission(mission.id);
  expect(storedOldMission?.fieldLogEntries).toEqual([]);
  expect(storedOldMission?.ruhReports).toEqual([]);
  expect(storedOldMission?.welfareChecks).toEqual([]);
  expect(storedMission?.fieldLogEntries).toEqual(mission.fieldLogEntries);
  expect(storedMission?.ruhReports).toEqual(mission.ruhReports);
  expect(storedMission?.welfareChecks).toEqual(mission.welfareChecks);
  const listedMission = (await listMissions()).find((stored) => stored.id === mission.id);
  expect(listedMission?.fieldLogEntries[0]?.category).toBe('observasjon');
  expect(listedMission?.ruhReports[0]?.category).toBe('hms');
  expect(listedMission?.welfareChecks[0]?.needsRelief).toBe(true);
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

it('archives completed missions locally and excludes them from active mission lists', async () => {
  const mission = MissionContextSchema.parse({
    ...baseMission,
    id: 'mission-archive-1',
    title: 'Fullført flomvakt',
    locationText: 'Lokal sone vest',
    notes: 'Kort lokal læring uten persondata',
    lessonsLearned: {
      summary: 'Kort erfaringsoppsummering',
      whatWorked: 'Tydelig rollefordeling',
      improvements: 'Bedre lys ved depot',
      followUp: 'Teste samband neste øvelse',
    },
    feedback: {
      leadership: 'Rolig ledelse',
      equipment: 'Mangler ekstra lykter',
      procedures: 'Tiltakskort fungerte',
      training: 'Mer øving på skiftbytte',
      safety: 'God sperring',
      communications: 'Samband må testes tidligere',
    },
  });

  await saveMission(mission);
  await archiveMission(mission.id, { completedAt: '2026-06-03T12:00:00.000Z', archivedAt: '2026-06-03T12:05:00.000Z' });

  expect(await listMissions()).toEqual([]);
  const archived = await listArchivedMissions();
  expect(archived).toHaveLength(1);
  expect(archived[0]).toMatchObject({ id: mission.id, completedAt: '2026-06-03T12:00:00.000Z', archivedAt: '2026-06-03T12:05:00.000Z' });
  expect(archived[0]?.lessonsLearned?.whatWorked).toContain('rollefordeling');
  expect(archived[0]?.feedback?.communications).toContain('testes tidligere');
});

it('searches archived missions across title, location, lessons and feedback', async () => {
  await saveMission(MissionContextSchema.parse({
    ...baseMission,
    id: 'archive-search-hit',
    title: 'Etterkontroll MFE',
    locationText: 'Depot nord',
    lessonsLearned: { summary: 'Samband og utstyr må klargjøres tidligere', whatWorked: '', improvements: '', followUp: '' },
    feedback: { leadership: '', equipment: 'Ekstra radio', procedures: '', training: '', safety: '', communications: 'Kallesett uklart' },
  }));
  await saveMission(MissionContextSchema.parse({
    ...baseMission,
    id: 'archive-search-miss',
    title: 'Rutinekontroll',
    locationText: 'Depot sør',
  }));
  await archiveMission('archive-search-hit', { archivedAt: '2026-06-03T12:00:00.000Z' });
  await archiveMission('archive-search-miss', { archivedAt: '2026-06-03T11:00:00.000Z' });

  expect((await listArchivedMissions('radio')).map((item) => item.id)).toEqual(['archive-search-hit']);
  expect((await listArchivedMissions('depot')).map((item) => item.id)).toEqual(['archive-search-hit', 'archive-search-miss']);
});

it('deletes one archived mission and can reset only the local archive', async () => {
  await saveMission(MissionContextSchema.parse({ ...baseMission, id: 'active-kept', title: 'Aktivt oppdrag' }));
  await saveMission(MissionContextSchema.parse({ ...baseMission, id: 'archived-delete', title: 'Arkiv slettes' }));
  await saveMission(MissionContextSchema.parse({ ...baseMission, id: 'archived-clear', title: 'Arkiv tømmes' }));
  await saveChecklistRun({ id: 'run-archive-delete', missionId: 'archived-delete', templateSlug: 'fig-under-innsats', checkedItemIds: [], notesByItemId: {}, updatedAt: '2026-06-03T12:00:00.000Z', schemaVersion: 1 });
  await archiveMission('archived-delete', { archivedAt: '2026-06-03T12:00:00.000Z' });
  await archiveMission('archived-clear', { archivedAt: '2026-06-03T12:05:00.000Z' });

  await deleteArchivedMission('archived-delete');
  expect(await getMission('archived-delete')).toBeUndefined();
  expect(await getChecklistRun('run-archive-delete')).toBeUndefined();
  expect((await listArchivedMissions()).map((item) => item.id)).toEqual(['archived-clear']);

  await clearArchivedMissions();
  expect(await listArchivedMissions()).toEqual([]);
  expect((await listMissions()).map((item) => item.id)).toContain('active-kept');
});
