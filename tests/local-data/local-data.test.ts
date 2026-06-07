import { expect, it, vi } from 'vitest';
import { FIELD_MODE_STORAGE_EVENT, FIELD_MODE_STORAGE_KEY, FIELD_FEEDBACK_STORAGE_KEY } from '@/lib/field-mode/field-mode';
import { EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY } from '@/lib/integrations/source-settings';
import { ACTIVE_MISSION_STORAGE_KEY } from '@/lib/mission/active-mission-selection';
import { OFFLINE_MAP_CACHE_STORAGE_KEY } from '@/lib/maps/offline-map';
import { OPERATIONS_MAP_STORAGE_KEY } from '@/lib/maps/operations-map';
import {
  LOCAL_DATA_EXPORT_KIND,
  LOCAL_DATA_EXPORT_VERSION,
  LOCAL_DATA_SCHEMA_VERSION,
  LOCAL_DATA_STORE_KEYS,
  LOCAL_DATABASE_DECISION,
  RELEASE_READINESS_STORAGE_KEY,
  MAX_LOCAL_IMPORT_CHECKLIST_RUNS,
  MAX_LOCAL_IMPORT_MISSIONS,
  applyLocalDataImport,
  buildLocalDataExport,
  formatStorageEstimate,
  migrateLocalDataExport,
  parseLocalDataImport,
  readKnownLocalStorage,
  serializeLocalDataExport,
  storageQuotaStatus,
} from '@/lib/local-data/local-data';
import type { ChecklistRun, MissionContext } from '@/lib/mission/schemas';
import { LOCAL_AUDIT_LOG_STORAGE_KEY, LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY, LOCAL_PROFILE_STORAGE_KEY, LOCAL_RETENTION_STORAGE_KEY } from '@/lib/privacy/local-profile';
import { defaultReleasePlan } from '@/lib/release/plan';
import { buildMission } from '../helpers/mission-fixtures';

const baseMission = buildMission({
  id: 'mission-local-data-1',
  title: 'Lokal øvelse',
  createdAt: '2026-06-04T10:00:00.000Z',
  updatedAt: '2026-06-04T10:05:00.000Z',
  phase: 'under',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Skjematisk øvingsområde',
  externalSignals: [],
  externalSignalHistory: [],
  activeChecklistIds: ['fig-under-innsats'],
  notes: 'Lokal note uten persondata',
  tasks: [],
  statusLog: [],
  resourceRequests: [],
  fieldLogEntries: [],
  ruhReports: [],
  welfareChecks: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
});

const baseRun: ChecklistRun = {
  id: 'run-local-data-1',
  missionId: baseMission.id,
  templateSlug: 'fig-under-innsats',
  checkedItemIds: ['item-a'],
  notesByItemId: { 'item-a': 'OK' },
  equipmentStatusByItemId: {},
  updatedAt: '2026-06-04T10:06:00.000Z',
  schemaVersion: 1,
};

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

it('documents the raw idb local database decision against Dexie and SQLite WASM/OPFS', () => {
  expect(LOCAL_DATABASE_DECISION.chosen).toBe('raw-idb');
  expect(LOCAL_DATABASE_DECISION.summary).toMatch(/manual.*local JSON|local JSON/i);
  expect(LOCAL_DATABASE_DECISION.options.find((option) => option.id === 'raw-idb')?.decision).toBe('chosen');
  expect(LOCAL_DATABASE_DECISION.options.find((option) => option.id === 'dexie')?.decision).toBe('deferred');
  expect(LOCAL_DATABASE_DECISION.options.find((option) => option.id === 'sqlite-wasm-opfs')?.decision).toBe('rejected-for-mvp');
  expect(LOCAL_DATABASE_DECISION.guardrails.join(' ')).toMatch(/No backend sync/i);
});

it('exposes schema/export versions and allowlisted localStorage keys', () => {
  expect(LOCAL_DATA_SCHEMA_VERSION).toBe(1);
  expect(LOCAL_DATA_EXPORT_VERSION).toBe(1);
  expect(LOCAL_DATA_STORE_KEYS).not.toContain(LOCAL_PROFILE_STORAGE_KEY);
  expect(LOCAL_DATA_STORE_KEYS).not.toContain(LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY);
  expect(LOCAL_DATA_STORE_KEYS).toContain(FIELD_MODE_STORAGE_KEY);
  expect(LOCAL_DATA_STORE_KEYS).toContain(ACTIVE_MISSION_STORAGE_KEY);
});

it('migrates legacy v0 export shapes and stored mission records to current v1', () => {
  const legacy = {
    version: 0,
    exportedAt: '2026-06-04T11:00:00.000Z',
    localStorage: {
      [FIELD_MODE_STORAGE_KEY]: JSON.stringify({ enabled: true, unknown: 'ignored by field-mode reader' }),
      'unknown-key': 'stripped',
    },
    missions: [{
      ...baseMission,
      schemaVersion: undefined,
      externalSignals: [{ source: 'met', kind: 'weather', severity: 'info', title: 'Vær', summary: 'OK', validFrom: null, validTo: null, fetchedAt: '2026-06-04T09:00:00.000Z', staleness: 'fresh', rawRef: 'met:locationforecast', geometry: { type: 'Point', coordinates: [10, 63] } }],
    }],
    checklistRuns: [{ ...baseRun, schemaVersion: undefined }],
  };

  const migrated = migrateLocalDataExport(legacy);
  expect(migrated.kind).toBe(LOCAL_DATA_EXPORT_KIND);
  expect(migrated.schemaVersion).toBe(1);
  expect(migrated.localStorage).toEqual({ [FIELD_MODE_STORAGE_KEY]: JSON.stringify({ enabled: true, gloveMode: false, theme: 'day', outdoorReadabilityReviewed: false }) });
  expect(migrated.indexedDb.missions[0].schemaVersion).toBe(1);
  expect(JSON.stringify(migrated.indexedDb.missions[0])).not.toContain('geometry');
  expect(migrated.indexedDb.checklistRuns[0].schemaVersion).toBe(1);
});

it('rejects future versions and dangerous import fields while stripping non-dangerous unknown localStorage keys', () => {
  expect(() => parseLocalDataImport(JSON.stringify({ kind: LOCAL_DATA_EXPORT_KIND, exportVersion: 99 }))).toThrow(/newer than supported/i);
  expect(() => parseLocalDataImport(JSON.stringify({ kind: LOCAL_DATA_EXPORT_KIND, exportVersion: 1, schemaVersion: 99 }))).toThrow(/schema version 99 is newer/i);
  expect(() => parseLocalDataImport(JSON.stringify({ exportVersion: null }))).toThrow(/export version is invalid/i);
  expect(() => parseLocalDataImport(JSON.stringify({ exportVersion: 0 }))).toThrow(/legacy export payload is missing/i);
  expect(() => parseLocalDataImport(JSON.stringify({ version: 0 }))).toThrow(/legacy export payload is missing/i);
  expect(() => parseLocalDataImport(JSON.stringify({ exportVersion: 0, kind: 'evil', localStorage: {} }))).toThrow(/export kind is unsupported/i);
  expect(() => parseLocalDataImport(JSON.stringify({ exportVersion: 0, localStorage: null }))).toThrow(/legacy export payload|localStorage payload/i);
  expect(() => parseLocalDataImport(JSON.stringify({ exportVersion: 0, missions: 'x' }))).toThrow(/legacy export payload|missions payload/i);
  expect(() => parseLocalDataImport(JSON.stringify({ exportVersion: 0, indexedDb: null }))).toThrow(/legacy export payload|indexedDb payload/i);
  expect(() => parseLocalDataImport(JSON.stringify({ kind: LOCAL_DATA_EXPORT_KIND, exportVersion: 1, schemaVersion: 1, localStorage: null, indexedDb: null }))).toThrow(/localStorage payload must be an object/i);
  expect(() => parseLocalDataImport(JSON.stringify({ kind: LOCAL_DATA_EXPORT_KIND, exportVersion: 1, schemaVersion: 1, localStorage: {}, indexedDb: {} }))).toThrow(/indexedDb\.missions payload must be an array/i);
  expect(() => parseLocalDataImport(JSON.stringify({ kind: LOCAL_DATA_EXPORT_KIND, exportVersion: 1, schemaVersion: 1, localStorage: {}, indexedDb: { missions: [baseMission], checklistRuns: [] }, missions: [] }))).toThrow(/indexedDb only/i);
  expect(() => parseLocalDataImport('{}')).toThrow(/missing export kind\/version/i);
  expect(() => parseLocalDataImport(JSON.stringify({ exportVersion: 1, localStorage: {} }))).toThrow(/export kind is missing/i);
  expect(() => parseLocalDataImport(JSON.stringify({ kind: LOCAL_DATA_EXPORT_KIND, exportVersion: 1, patientData: { name: 'Nope' } }))).toThrow(/dangerous field/i);
  expect(() => parseLocalDataImport(JSON.stringify({
    kind: LOCAL_DATA_EXPORT_KIND,
    exportVersion: 1,
    schemaVersion: 1,
    localStorage: { [FIELD_MODE_STORAGE_KEY]: JSON.stringify({ patientName: 'Nope' }) },
    indexedDb: { missions: [], checklistRuns: [] },
  }))).toThrow(/dangerous field/i);
  expect(() => parseLocalDataImport(JSON.stringify({
    kind: LOCAL_DATA_EXPORT_KIND,
    exportVersion: 1,
    schemaVersion: 1,
    localStorage: { [FIELD_MODE_STORAGE_KEY]: JSON.stringify({ apiToken: 'Nope' }) },
    indexedDb: { missions: [], checklistRuns: [] },
  }))).toThrow(/dangerous field/i);

  const parsed = parseLocalDataImport(JSON.stringify({
    kind: LOCAL_DATA_EXPORT_KIND,
    exportVersion: 1,
    schemaVersion: 1,
    localStorage: {
      [FIELD_MODE_STORAGE_KEY]: JSON.stringify({ enabled: true }),
      [LOCAL_PROFILE_STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, profileEnabled: false, displayName: 'ALFA' }),
      [LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY]: JSON.stringify([{ id: 'reminder-1', label: 'Pumpe', enabled: true }]),
      'beredskapsboka-unknown': 'drop',
    },
    indexedDb: { missions: [], checklistRuns: [] },
  }));
  expect(parsed.localStorage).toEqual({ [FIELD_MODE_STORAGE_KEY]: JSON.stringify({ enabled: true, gloveMode: false, theme: 'day', outdoorReadabilityReviewed: false }) });
});

it('rejects imported local data with high-confidence sensitive mission text before replacing stored data', async () => {
  const sensitiveExport = buildLocalDataExport({
    missions: [baseMission],
    checklistRuns: [baseRun],
  });
  sensitiveExport.indexedDb.missions[0] = { ...sensitiveExport.indexedDb.missions[0], notes: 'pasient Ola Nordmann' };
  const serialized = JSON.stringify(sensitiveExport);
  const replaceMissionData = vi.fn(async () => ({ missions: 1, checklistRuns: 1 }));

  expect(() => parseLocalDataImport(serialized)).toThrow(/localImport\.indexedDb\.missions\[0\]\.notes/i);
  await expect(applyLocalDataImport(serialized, {
    confirmLocalOnly: true,
    confirmReplaceExistingLocalData: true,
    storage: new MemoryStorage(),
    replaceMissionData,
  })).rejects.toThrow(/persondata|pasientdata|skjermet/i);
  expect(replaceMissionData).not.toHaveBeenCalled();
});

it('rejects orphan checklist runs before replacing stored data', async () => {
  const orphanedExport = buildLocalDataExport({
    missions: [baseMission],
    checklistRuns: [{ ...baseRun, id: 'run-orphaned', missionId: 'missing-mission' }],
  });
  const replaceMissionData = vi.fn(async () => ({ missions: 1, checklistRuns: 1 }));

  expect(() => parseLocalDataImport(JSON.stringify(orphanedExport))).toThrow(/checklist run.*missing-mission/i);
  await expect(applyLocalDataImport(JSON.stringify(orphanedExport), {
    confirmLocalOnly: true,
    confirmReplaceExistingLocalData: true,
    storage: new MemoryStorage(),
    replaceMissionData,
  })).rejects.toThrow(/checklist run.*missing-mission/i);
  expect(replaceMissionData).not.toHaveBeenCalled();
});

it('normalizes allowed localStorage import values before writing', async () => {
  const storage = new MemoryStorage();
  const exportData = buildLocalDataExport({
    localStorage: {
      [FIELD_MODE_STORAGE_KEY]: JSON.stringify({ enabled: true, gloveMode: 'yes', theme: 'storm', outdoorReadabilityReviewed: true, extra: 'drop' }),
      [FIELD_FEEDBACK_STORAGE_KEY]: JSON.stringify([{ id: 'fb-1', createdAt: '2026-06-04T12:00:00.000Z', conditions: '<regn>', observations: 'obs', blockers: 'ingen', suggestedChange: 'større knapper', extra: 'drop' }]),
      [OPERATIONS_MAP_STORAGE_KEY]: JSON.stringify({
        markers: [
          { id: 'map-a', missionId: baseMission.id, itemType: 'marker', kind: 'hazard', label: 'Fare', point: { x: 10, y: 10 }, createdAt: '2026-06-04T12:00:00.000Z', extra: 'drop' },
          { id: 'map-orphan', missionId: 'missing-mission', itemType: 'marker', kind: 'hazard', label: 'Drop', point: { x: 20, y: 20 }, createdAt: '2026-06-04T12:00:00.000Z' },
          { id: 'map-legacy', itemType: 'marker', kind: 'observation', label: 'Legacy', point: { x: 30, y: 30 }, createdAt: '2026-06-04T12:00:00.000Z' },
        ],
        drawings: [],
      }),
      [OFFLINE_MAP_CACHE_STORAGE_KEY]: JSON.stringify({ packageId: 'ovelse-liten', title: 'tampered', estimatedSizeMb: 999, version: 3, cachedAt: '2026-06-04T12:00:00.000Z', runtimeFormat: 'evil' }),
      [EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY]: JSON.stringify({ kartverket: false, met: 'no', nve: true, extra: 'drop' }),
      [LOCAL_RETENTION_STORAGE_KEY]: JSON.stringify({ missionRetentionDays: 7.4, archiveRetentionDays: '45', profileRetentionDays: 'bad', auditRetentionDays: 0, updatedAt: '2026-06-04T12:00:00.000Z', extra: 'drop' }),
      [LOCAL_AUDIT_LOG_STORAGE_KEY]: JSON.stringify([{ id: 'audit-1', type: 'local-reset', createdAt: '2026-06-04T12:00:00.000Z', details: { resetScope: 'mission-data', unknown: 'drop', backupBytes: 1200 } }]),
      [RELEASE_READINESS_STORAGE_KEY]: JSON.stringify({
        stages: { ...defaultReleasePlan.stages, verify: 'ready', release: 'bad-status' },
        items: [
          { id: 'release-item-1', title: 'Pilot item', owner: 'TS', stage: 'verify', status: 'completed', risk: 'low', notes: 'klar', completedAt: '2026-06-04T12:00:00.000Z', extra: 'drop' },
          { id: 'release-item-bad', title: 'Bad item', owner: 'TS', stage: 'bad-stage', status: 'completed', risk: 'low', notes: 'drop' },
        ],
        syncedAt: '2026-06-04T12:10:00.000Z',
        extra: 'drop',
      }),
      [ACTIVE_MISSION_STORAGE_KEY]: baseMission.id,
    },
    missions: [baseMission],
    checklistRuns: [baseRun],
  });

  await applyLocalDataImport(JSON.stringify(exportData), {
    confirmLocalOnly: true,
    confirmReplaceExistingLocalData: true,
    storage,
    replaceMissionData: async (missions, checklistRuns) => ({ missions: missions.length, checklistRuns: checklistRuns.length }),
  });

  expect(JSON.parse(storage.getItem(FIELD_MODE_STORAGE_KEY) ?? '{}')).toEqual({ enabled: true, gloveMode: false, theme: 'day', outdoorReadabilityReviewed: true });
  expect(JSON.parse(storage.getItem(FIELD_FEEDBACK_STORAGE_KEY) ?? '[]')).toEqual([{ id: 'fb-1', createdAt: '2026-06-04T12:00:00.000Z', conditions: '<regn>', observations: 'obs', blockers: 'ingen', suggestedChange: 'større knapper' }]);
  expect(JSON.parse(storage.getItem(OPERATIONS_MAP_STORAGE_KEY) ?? '{}').markers.map((marker: { id: string }) => marker.id)).toEqual(['map-a', 'map-legacy']);
  expect(JSON.parse(storage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY) ?? '{}')).toMatchObject({ packageId: 'ovelse-liten', title: 'Øvelse liten pakke', estimatedSizeMb: 6, runtimeFormat: 'schematic' });
  expect(JSON.parse(storage.getItem(EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY) ?? '{}')).toEqual({ kartverket: false, met: true, nve: true });
  expect(JSON.parse(storage.getItem(LOCAL_RETENTION_STORAGE_KEY) ?? '{}')).toMatchObject({ missionRetentionDays: 7, archiveRetentionDays: 45, profileRetentionDays: 365, auditRetentionDays: 1 });
  expect(JSON.parse(storage.getItem(LOCAL_AUDIT_LOG_STORAGE_KEY) ?? '[]')).toEqual([{ id: 'audit-1', type: 'local-reset', createdAt: '2026-06-04T12:00:00.000Z', details: { resetScope: 'mission-data', backupBytes: 1200 } }]);
  expect(JSON.parse(storage.getItem(RELEASE_READINESS_STORAGE_KEY) ?? '{}')).toEqual({
    stages: { ...defaultReleasePlan.stages, verify: 'ready' },
    items: [{ id: 'release-item-1', title: 'Pilot item', owner: 'TS', stage: 'verify', status: 'completed', risk: 'low', notes: 'klar', completedAt: '2026-06-04T12:00:00.000Z' }],
    syncedAt: '2026-06-04T12:10:00.000Z',
  });
  expect(storage.getItem(ACTIVE_MISSION_STORAGE_KEY)).toBe(baseMission.id);
});

it('rejects malformed allowed localStorage JSON and drops active mission ids missing from imported missions', async () => {
  expect(() => parseLocalDataImport(JSON.stringify({
    kind: LOCAL_DATA_EXPORT_KIND,
    exportVersion: 1,
    schemaVersion: 1,
    localStorage: { [FIELD_MODE_STORAGE_KEY]: '{not-json' },
    indexedDb: { missions: [baseMission], checklistRuns: [baseRun] },
  }))).toThrow(new RegExp(`localStorage\\.${FIELD_MODE_STORAGE_KEY}.*invalid JSON`));

  const releaseParsed = parseLocalDataImport(JSON.stringify({
    kind: LOCAL_DATA_EXPORT_KIND,
    exportVersion: 1,
    schemaVersion: 1,
    localStorage: { [RELEASE_READINESS_STORAGE_KEY]: JSON.stringify({ stages: 'bad', items: [] }) },
    indexedDb: { missions: [baseMission], checklistRuns: [baseRun] },
  }));
  expect(JSON.parse(releaseParsed.localStorage[RELEASE_READINESS_STORAGE_KEY] ?? '{}')).toEqual({ stages: defaultReleasePlan.stages, items: [] });
  expect(() => parseLocalDataImport(JSON.stringify({
    kind: LOCAL_DATA_EXPORT_KIND,
    exportVersion: 1,
    schemaVersion: 1,
    localStorage: { [RELEASE_READINESS_STORAGE_KEY]: JSON.stringify({ stages: defaultReleasePlan.stages, items: 'bad' }) },
    indexedDb: { missions: [baseMission], checklistRuns: [baseRun] },
  }))).toThrow(/release-readiness-v1\.items must be a JSON array/i);

  const parsed = parseLocalDataImport(JSON.stringify(buildLocalDataExport({
    localStorage: {
      [ACTIVE_MISSION_STORAGE_KEY]: 'missing-mission',
      [OPERATIONS_MAP_STORAGE_KEY]: JSON.stringify({
        markers: [{ id: 'orphan', missionId: 'missing-mission', itemType: 'marker', kind: 'hazard', label: 'Orphan', point: { x: 10, y: 10 }, createdAt: '2026-06-04T12:00:00.000Z' }],
        drawings: [],
      }),
    },
    missions: [baseMission],
    checklistRuns: [baseRun],
  })));

  expect(parsed.localStorage[ACTIVE_MISSION_STORAGE_KEY]).toBeUndefined();
  expect(JSON.parse(parsed.localStorage[OPERATIONS_MAP_STORAGE_KEY] ?? '{}')).toEqual({ markers: [], drawings: [] });
});

it('reads only known localStorage keys for backup', () => {
  const storage = new MemoryStorage();
  storage.setItem(FIELD_MODE_STORAGE_KEY, '{"enabled":true}');
  storage.setItem(LOCAL_PROFILE_STORAGE_KEY, '{"schemaVersion":1,"profileEnabled":true,"displayName":"ALFA"}');
  storage.setItem(LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY, '[{"id":"reminder-1","label":"Pumpe"}]');
  storage.setItem('random-third-party-key', 'must not export');

  expect(readKnownLocalStorage(storage)).toEqual({ [FIELD_MODE_STORAGE_KEY]: '{"enabled":true}' });
});

it('formats storage quota status with warning and unknown fallbacks', () => {
  expect(formatStorageEstimate({ usage: 512 * 1024, quota: 2 * 1024 * 1024 })).toMatch(/512 KB brukt av 2.0 MB \(25 %\)/);
  expect(storageQuotaStatus({ usage: 80, quota: 100 })).toMatchObject({ level: 'warning' });
  expect(storageQuotaStatus({ usage: 95, quota: 100 })).toMatchObject({ level: 'critical' });
  expect(storageQuotaStatus(undefined)).toMatchObject({ level: 'unknown' });
});

it('does not silently truncate exports while import parsing rejects over-cap payloads', () => {
  const manyMissions = Array.from({ length: 105 }, (_, index) => ({
    ...baseMission,
    id: `mission-full-backup-${index}`,
    title: `Lokal øvelse ${index}`,
    updatedAt: `2026-06-04T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
  }));
  const manyRuns = Array.from({ length: 505 }, (_, index) => ({
    ...baseRun,
    id: `run-full-backup-${index}`,
    missionId: `mission-full-backup-${index % MAX_LOCAL_IMPORT_MISSIONS}`,
    updatedAt: `2026-06-04T11:${String(index % 60).padStart(2, '0')}:00.000Z`,
  }));

  const exportData = buildLocalDataExport({ missions: manyMissions, checklistRuns: manyRuns, now: '2026-06-04T12:30:00.000Z' });
  expect(exportData.indexedDb.missions).toHaveLength(manyMissions.length);
  expect(exportData.indexedDb.checklistRuns).toHaveLength(manyRuns.length);
  const serializedExport = JSON.parse(serializeLocalDataExport(exportData));
  expect(serializedExport.indexedDb.missions).toHaveLength(manyMissions.length);
  expect(serializedExport.indexedDb.checklistRuns).toHaveLength(manyRuns.length);

  expect(() => parseLocalDataImport(JSON.stringify({
    ...exportData,
    indexedDb: { missions: manyMissions, checklistRuns: manyRuns.slice(0, MAX_LOCAL_IMPORT_CHECKLIST_RUNS) },
  }))).toThrow(/too many missions/i);
  expect(() => parseLocalDataImport(JSON.stringify({
    ...exportData,
    indexedDb: { missions: manyMissions.slice(0, MAX_LOCAL_IMPORT_MISSIONS), checklistRuns: manyRuns },
  }))).toThrow(/too many checklist runs/i);

  const cappedExportData = buildLocalDataExport({
    missions: manyMissions.slice(0, MAX_LOCAL_IMPORT_MISSIONS),
    checklistRuns: manyRuns.slice(0, MAX_LOCAL_IMPORT_CHECKLIST_RUNS),
    now: '2026-06-04T12:30:00.000Z',
  });
  const parsed = parseLocalDataImport(JSON.stringify(cappedExportData));
  expect(parsed.indexedDb.missions).toHaveLength(MAX_LOCAL_IMPORT_MISSIONS);
  expect(parsed.indexedDb.checklistRuns).toHaveLength(MAX_LOCAL_IMPORT_CHECKLIST_RUNS);
});

it('rolls back localStorage if import storage writes fail before DB replacement', async () => {
  class FailingStorage extends MemoryStorage {
    private failuresRemaining = 1;
    constructor(private readonly failKey: string) { super(); }
    setItem(key: string, value: string) {
      if (key === this.failKey && this.failuresRemaining > 0) {
        this.failuresRemaining -= 1;
        throw new Error('quota exceeded');
      }
      super.setItem(key, value);
    }
  }
  const storage = new FailingStorage(FIELD_MODE_STORAGE_KEY);
  storage.values.set(FIELD_MODE_STORAGE_KEY, '{"enabled":false}');
  storage.values.set(LOCAL_PROFILE_STORAGE_KEY, '{"schemaVersion":1,"profileEnabled":true}');
  const exportData = buildLocalDataExport({
    localStorage: {
      [FIELD_MODE_STORAGE_KEY]: '{"enabled":true}',
    },
    missions: [baseMission],
    checklistRuns: [baseRun],
  });
  const replaceMissionData = vi.fn(async () => ({ missions: 1, checklistRuns: 1 }));

  await expect(applyLocalDataImport(JSON.stringify(exportData), {
    confirmLocalOnly: true,
    confirmReplaceExistingLocalData: true,
    storage,
    replaceMissionData,
  })).rejects.toThrow(/quota exceeded/i);

  expect(storage.getItem(FIELD_MODE_STORAGE_KEY)).toBe('{"enabled":false}');
  expect(storage.getItem(LOCAL_PROFILE_STORAGE_KEY)).toBe('{"schemaVersion":1,"profileEnabled":true}');
  expect(replaceMissionData).not.toHaveBeenCalled();
});

it('rolls back localStorage if IndexedDB replacement fails', async () => {
  const storage = new MemoryStorage();
  storage.setItem(FIELD_MODE_STORAGE_KEY, '{"enabled":false}');
  const exportData = buildLocalDataExport({
    localStorage: { [FIELD_MODE_STORAGE_KEY]: '{"enabled":true}' },
    missions: [baseMission],
    checklistRuns: [baseRun],
  });

  await expect(applyLocalDataImport(JSON.stringify(exportData), {
    confirmLocalOnly: true,
    confirmReplaceExistingLocalData: true,
    storage,
    replaceMissionData: async () => { throw new Error('idb transaction failed'); },
  })).rejects.toThrow(/idb transaction failed/i);

  expect(storage.getItem(FIELD_MODE_STORAGE_KEY)).toBe('{"enabled":false}');
});

it('notifies same-tab local state subscribers after successful import', async () => {
  const storage = new MemoryStorage();
  const exportData = buildLocalDataExport({ localStorage: { [FIELD_MODE_STORAGE_KEY]: '{"enabled":true}' }, missions: [baseMission], checklistRuns: [baseRun] });
  const profileListener = vi.fn();
  const fieldModeListener = vi.fn();
  window.addEventListener('beredskapsboka-local-profile-change', profileListener);
  window.addEventListener(FIELD_MODE_STORAGE_EVENT, fieldModeListener);
  try {
    await applyLocalDataImport(JSON.stringify(exportData), {
      confirmLocalOnly: true,
      confirmReplaceExistingLocalData: true,
      storage,
      replaceMissionData: async (missions, checklistRuns) => ({ missions: missions.length, checklistRuns: checklistRuns.length }),
    });
  } finally {
    window.removeEventListener('beredskapsboka-local-profile-change', profileListener);
    window.removeEventListener(FIELD_MODE_STORAGE_EVENT, fieldModeListener);
  }

  expect(profileListener).toHaveBeenCalledTimes(1);
  expect(fieldModeListener).toHaveBeenCalledTimes(1);
});

it('roundtrips backup/import with injected local storage and DB writers', async () => {
  const storage = new MemoryStorage();
  storage.setItem(FIELD_MODE_STORAGE_KEY, '{"enabled":true}');
  storage.setItem('not-allowlisted', 'drop');
  const exportData = buildLocalDataExport({
    now: '2026-06-04T12:00:00.000Z',
    localStorage: readKnownLocalStorage(storage),
    missions: [baseMission],
    checklistRuns: [baseRun],
  });
  const serialized = JSON.stringify(exportData);
  const importedMissions: MissionContext[] = [];
  const importedRuns: ChecklistRun[] = [];
  await expect(applyLocalDataImport(serialized, { confirmLocalOnly: false, confirmReplaceExistingLocalData: true })).rejects.toThrow(/explicit confirmation/i);
  await expect(applyLocalDataImport(serialized, { confirmLocalOnly: true, confirmReplaceExistingLocalData: false })).rejects.toThrow(/existing local app data will be replaced/i);
  const nextStorage = new MemoryStorage();
  const replaceMissionData = vi.fn(async (missions: MissionContext[], checklistRuns: ChecklistRun[]) => {
    importedMissions.push(...missions);
    importedRuns.push(...checklistRuns);
    return { missions: missions.length, checklistRuns: checklistRuns.length };
  });
  const counts = await applyLocalDataImport(serialized, {
    confirmLocalOnly: true,
    confirmReplaceExistingLocalData: true,
    storage: nextStorage,
    replaceMissionData,
  });

  expect(counts).toEqual({ localStorageKeys: 1, missions: 1, checklistRuns: 1 });
  expect(nextStorage.getItem(FIELD_MODE_STORAGE_KEY)).toBe(JSON.stringify({ enabled: true, gloveMode: false, theme: 'day', outdoorReadabilityReviewed: false }));
  expect(nextStorage.getItem('not-allowlisted')).toBeNull();
  expect(replaceMissionData).toHaveBeenCalledTimes(1);
  expect(importedMissions[0]).toMatchObject({ id: baseMission.id, schemaVersion: 1 });
  expect(importedRuns[0]).toMatchObject({ id: baseRun.id, schemaVersion: 1 });
});
