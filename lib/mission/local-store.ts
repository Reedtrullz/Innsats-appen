import { openDB, type DBSchema } from 'idb';
import { ChecklistRunSchema, MissionContextSchema, type ChecklistRun, type MissionContext } from './schemas';

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
  return missions.map((mission) => MissionContextSchema.parse({ ...mission, schemaVersion: mission.schemaVersion ?? 1 })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteMission(id: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(['missions', 'checklistRuns'], 'readwrite');
  await tx.objectStore('missions').delete(id);
  const runs = await tx.objectStore('checklistRuns').index('by-mission').getAll(id);
  await Promise.all(runs.map((run) => tx.objectStore('checklistRuns').delete(run.id)));
  await tx.done;
}

export async function saveChecklistRun(input: ChecklistRun): Promise<ChecklistRun> {
  const parsed = ChecklistRunSchema.parse({ ...input, schemaVersion: input.schemaVersion ?? 1 });
  await (await db()).put('checklistRuns', parsed);
  return parsed;
}

export async function getChecklistRun(id: string): Promise<ChecklistRun | undefined> {
  return (await db()).get('checklistRuns', id);
}

export async function listChecklistRuns(missionId: string): Promise<ChecklistRun[]> {
  return (await db()).getAllFromIndex('checklistRuns', 'by-mission', missionId);
}

export async function clearLocalMissionData(): Promise<void> {
  const database = await db();
  const tx = database.transaction(['missions', 'checklistRuns'], 'readwrite');
  await Promise.all([tx.objectStore('missions').clear(), tx.objectStore('checklistRuns').clear()]);
  await tx.done;
}
