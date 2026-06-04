import { openDB, type DBSchema } from 'idb';
import { ChecklistRunSchema, MissionContextSchema, type ChecklistRun, type ChecklistRunInput, type MissionContext, type ExternalContextSignal } from './schemas';

interface BeredskapsbokaDb extends DBSchema {
  missions: {
    key: string;
    value: MissionContext;
    indexes: { 'by-updated': string };
  };
  checklistRuns: {
    key: string;
    value: ChecklistRun;
    indexes: { 'by-mission': string };
  };
}

export const DB_NAME = 'beredskapsboka-local';
export const LOCAL_MISSION_DB_VERSION = 1;
export const LOCAL_MISSION_RECORD_SCHEMA_VERSION = 1;
export const LOCAL_MISSION_STORES = ['missions', 'checklistRuns'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeStoredSignals(value: unknown): ExternalContextSignal[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((signal) => {
    if (!isRecord(signal)) return signal;
    const { geometry: _geometry, ...sanitizedSignal } = signal;
    return sanitizedSignal;
  }) as ExternalContextSignal[];
}

function sanitizeStoredMission(input: unknown) {
  if (!isRecord(input)) return input;
  const externalSignals = sanitizeStoredSignals(input.externalSignals);
  const externalSignalHistory = sanitizeStoredSignals(input.externalSignalHistory);
  return {
    ...input,
    ...(externalSignals ? { externalSignals } : {}),
    ...(externalSignalHistory ? { externalSignalHistory } : {}),
  };
}

export function migrateStoredMissionContext(input: unknown): MissionContext {
  const mission = sanitizeStoredMission(input);
  if (!isRecord(mission)) return MissionContextSchema.parse(mission);
  return MissionContextSchema.parse({ ...mission, schemaVersion: mission.schemaVersion ?? LOCAL_MISSION_RECORD_SCHEMA_VERSION });
}

export function migrateStoredChecklistRun(input: unknown): ChecklistRun {
  if (!isRecord(input)) return ChecklistRunSchema.parse(input);
  return ChecklistRunSchema.parse({ ...input, schemaVersion: input.schemaVersion ?? LOCAL_MISSION_RECORD_SCHEMA_VERSION });
}

function db() {
  return openDB<BeredskapsbokaDb>(DB_NAME, LOCAL_MISSION_DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('missions')) {
        const store = database.createObjectStore('missions', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
      }
      if (!database.objectStoreNames.contains('checklistRuns')) {
        const store = database.createObjectStore('checklistRuns', { keyPath: 'id' });
        store.createIndex('by-mission', 'missionId');
      }
    },
  });
}

export async function saveMission(input: MissionContext): Promise<MissionContext> {
  const parsed = migrateStoredMissionContext(input);
  await (await db()).put('missions', parsed);
  return parsed;
}

export async function getMission(id: string): Promise<MissionContext | undefined> {
  const mission = await (await db()).get('missions', id);
  return mission ? migrateStoredMissionContext(mission) : undefined;
}

export async function listMissions(): Promise<MissionContext[]> {
  const missions = await (await db()).getAll('missions');
  return missions
    .map(migrateStoredMissionContext)
    .filter((mission) => !mission.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listAllMissions(): Promise<MissionContext[]> {
  const missions = await (await db()).getAll('missions');
  return missions
    .map(migrateStoredMissionContext)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

type ArchiveMissionFields = {
  completedAt?: string;
  archivedAt?: string;
};

function archiveSearchText(mission: MissionContext) {
  return [
    mission.title,
    mission.locationText,
    mission.municipality,
    mission.notes,
    mission.lessonsLearned?.summary,
    mission.lessonsLearned?.whatWorked,
    mission.lessonsLearned?.improvements,
    mission.lessonsLearned?.followUp,
    mission.feedback?.leadership,
    mission.feedback?.equipment,
    mission.feedback?.procedures,
    mission.feedback?.training,
    mission.feedback?.safety,
    mission.feedback?.communications,
  ].filter(Boolean).join(' ').toLowerCase();
}

export async function archiveMission(id: string, fields: ArchiveMissionFields = {}): Promise<MissionContext | undefined> {
  const database = await db();
  const mission = await database.get('missions', id);
  if (!mission) return undefined;
  const now = new Date().toISOString();
  const archived = migrateStoredMissionContext({
    ...mission,
    completedAt: fields.completedAt ?? mission.completedAt ?? now,
    archivedAt: fields.archivedAt ?? now,
    updatedAt: now,
    schemaVersion: mission.schemaVersion ?? 1,
  });
  await database.put('missions', archived);
  return archived;
}

export async function listArchivedMissions(query = ''): Promise<MissionContext[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const missions = await (await db()).getAll('missions');
  return missions
    .map(migrateStoredMissionContext)
    .filter((mission) => Boolean(mission.archivedAt))
    .filter((mission) => !normalizedQuery || archiveSearchText(mission).includes(normalizedQuery))
    .sort((a, b) => (b.archivedAt ?? b.updatedAt).localeCompare(a.archivedAt ?? a.updatedAt));
}

export async function deleteMission(id: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(['missions', 'checklistRuns'], 'readwrite');
  await tx.objectStore('missions').delete(id);
  const runs = await tx.objectStore('checklistRuns').index('by-mission').getAll(id);
  await Promise.all(runs.map((run) => tx.objectStore('checklistRuns').delete(run.id)));
  await tx.done;
}

export async function deleteArchivedMission(id: string): Promise<void> {
  const mission = await getMission(id);
  if (!mission?.archivedAt) return;
  await deleteMission(id);
}

export async function clearArchivedMissions(): Promise<void> {
  const archived = await listArchivedMissions();
  await Promise.all(archived.map((mission) => deleteMission(mission.id)));
}

export async function saveChecklistRun(input: ChecklistRunInput): Promise<ChecklistRun> {
  const parsed = migrateStoredChecklistRun(input);
  await (await db()).put('checklistRuns', parsed);
  return parsed;
}

export async function getChecklistRun(id: string): Promise<ChecklistRun | undefined> {
  const run = await (await db()).get('checklistRuns', id);
  return run ? migrateStoredChecklistRun(run) : undefined;
}

export async function listChecklistRuns(missionId: string): Promise<ChecklistRun[]> {
  const runs = await (await db()).getAllFromIndex('checklistRuns', 'by-mission', missionId);
  return runs.map(migrateStoredChecklistRun);
}

export async function listAllChecklistRuns(): Promise<ChecklistRun[]> {
  const runs = await (await db()).getAll('checklistRuns');
  return runs.map(migrateStoredChecklistRun).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function replaceLocalMissionData(missions: MissionContext[], checklistRuns: ChecklistRun[]): Promise<{ missions: number; checklistRuns: number }> {
  const parsedMissions = missions.map(migrateStoredMissionContext);
  const parsedRuns = checklistRuns.map(migrateStoredChecklistRun);
  const database = await db();
  const tx = database.transaction(['missions', 'checklistRuns'], 'readwrite');
  try {
    await Promise.all([tx.objectStore('missions').clear(), tx.objectStore('checklistRuns').clear()]);
    await Promise.all(parsedMissions.map((mission) => tx.objectStore('missions').put(mission)));
    await Promise.all(parsedRuns.map((run) => tx.objectStore('checklistRuns').put(run)));
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Transaction may already be inactive/aborted; preserve original error.
    }
    throw error;
  }
  return { missions: parsedMissions.length, checklistRuns: parsedRuns.length };
}

export async function clearLocalMissionData(): Promise<void> {
  const database = await db();
  const tx = database.transaction(['missions', 'checklistRuns'], 'readwrite');
  await Promise.all([tx.objectStore('missions').clear(), tx.objectStore('checklistRuns').clear()]);
  await tx.done;
}
