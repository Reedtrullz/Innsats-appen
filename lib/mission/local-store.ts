import { openDB, type DBSchema } from 'idb';
import { ChecklistRunSchema, MissionContextSchema, type ChecklistRun, type ChecklistRunInput, type MissionContext } from './schemas';

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

const DB_NAME = 'beredskapsboka-local';

function db() {
  return openDB<BeredskapsbokaDb>(DB_NAME, 1, {
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
  const parsed = MissionContextSchema.parse({ ...input, schemaVersion: input.schemaVersion ?? 1 });
  await (await db()).put('missions', parsed);
  return parsed;
}

export async function getMission(id: string): Promise<MissionContext | undefined> {
  const mission = await (await db()).get('missions', id);
  return mission ? MissionContextSchema.parse({ ...mission, schemaVersion: mission.schemaVersion ?? 1 }) : undefined;
}

export async function listMissions(): Promise<MissionContext[]> {
  const missions = await (await db()).getAll('missions');
  return missions
    .map((mission) => MissionContextSchema.parse({ ...mission, schemaVersion: mission.schemaVersion ?? 1 }))
    .filter((mission) => !mission.archivedAt)
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
  const archived = MissionContextSchema.parse({
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
    .map((mission) => MissionContextSchema.parse({ ...mission, schemaVersion: mission.schemaVersion ?? 1 }))
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
  const parsed = ChecklistRunSchema.parse({ ...input, schemaVersion: input.schemaVersion ?? 1 });
  await (await db()).put('checklistRuns', parsed);
  return parsed;
}

export async function getChecklistRun(id: string): Promise<ChecklistRun | undefined> {
  const run = await (await db()).get('checklistRuns', id);
  return run ? ChecklistRunSchema.parse({ ...run, schemaVersion: run.schemaVersion ?? 1 }) : undefined;
}

export async function listChecklistRuns(missionId: string): Promise<ChecklistRun[]> {
  const runs = await (await db()).getAllFromIndex('checklistRuns', 'by-mission', missionId);
  return runs.map((run) => ChecklistRunSchema.parse({ ...run, schemaVersion: run.schemaVersion ?? 1 }));
}

export async function clearLocalMissionData(): Promise<void> {
  const database = await db();
  const tx = database.transaction(['missions', 'checklistRuns'], 'readwrite');
  await Promise.all([tx.objectStore('missions').clear(), tx.objectStore('checklistRuns').clear()]);
  await tx.done;
}
