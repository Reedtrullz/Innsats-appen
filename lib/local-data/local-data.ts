import { FIELD_FEEDBACK_STORAGE_KEY, FIELD_MODE_STORAGE_EVENT, FIELD_MODE_STORAGE_KEY, normalizeFieldModeSettings, parseFieldFeedbackEntries } from '@/lib/field-mode/field-mode';
import { EXTERNAL_DATA_SOURCE_SETTINGS_EVENT, EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY, normalizeExternalDataSourceSettings } from '@/lib/integrations/source-settings';
import { ACTIVE_MISSION_STORAGE_KEY } from '@/lib/mission/active-mission-selection';
import { OFFLINE_MAP_CACHE_EVENT, OFFLINE_MAP_CACHE_STORAGE_KEY, normalizeCachedOfflineMapPackage } from '@/lib/maps/offline-map';
import { OPERATIONS_MAP_EVENT, OPERATIONS_MAP_STORAGE_KEY, normalizeMissionMapState, retainMissionMapObjects } from '@/lib/maps/operations-map';
import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';
import { PERSONAL_PREP_STORAGE_KEY, sanitizePersonalPrepState } from '@/lib/personlig/personal-prep-store';
import {
  DB_NAME,
  LOCAL_MISSION_DB_VERSION,
  LOCAL_MISSION_RECORD_SCHEMA_VERSION,
  LOCAL_MISSION_STORES,
  listAllChecklistRuns,
  listAllMissions,
  migrateStoredChecklistRun,
  migrateStoredMissionContext,
  replaceLocalMissionData,
} from '@/lib/mission/local-store';
import type { ChecklistRun, MissionContext } from '@/lib/mission/schemas';
import {
  LOCAL_AUDIT_LOG_STORAGE_KEY,
  LOCAL_RETENTION_STORAGE_KEY,
  readLocalAuditLog,
  readRetentionSettings,
} from '@/lib/privacy/local-profile';
import { defaultReleasePlan, type ReleaseItem, type ReleasePlan, type RiskLevel, type StageId, type StageStatus, type WorkStatus } from '@/lib/release/plan';

export const LOCAL_DATA_SCHEMA_VERSION = 1;
export const LOCAL_DATA_EXPORT_VERSION = 1;
export const LOCAL_DATA_EXPORT_KIND = 'beredskapsboka-local-data-export';
export const LOCAL_DATA_LARGE_IMPORT_WARNING_CHARS = 2_000_000;
export const MAX_LOCAL_STORAGE_VALUE_CHARS = 250_000;
export const MAX_LOCAL_IMPORT_TEXT_CHARS = 2_000_000;
export const MAX_LOCAL_IMPORT_DEPTH = 25;
export const MAX_LOCAL_IMPORT_MISSIONS = 100;
export const MAX_LOCAL_IMPORT_CHECKLIST_RUNS = 500;

export const RELEASE_READINESS_STORAGE_KEY = 'beredskapsboka-release-readiness-v1';

export const LOCAL_DATA_STORE_KEYS = [
  LOCAL_RETENTION_STORAGE_KEY,
  LOCAL_AUDIT_LOG_STORAGE_KEY,
  FIELD_MODE_STORAGE_KEY,
  FIELD_FEEDBACK_STORAGE_KEY,
  OPERATIONS_MAP_STORAGE_KEY,
  OFFLINE_MAP_CACHE_STORAGE_KEY,
  EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY,
  RELEASE_READINESS_STORAGE_KEY,
  ACTIVE_MISSION_STORAGE_KEY,
  PERSONAL_PREP_STORAGE_KEY,
] as const;

export type LocalDataStoreKey = typeof LOCAL_DATA_STORE_KEYS[number];
export type LocalStorageSnapshot = Partial<Record<LocalDataStoreKey, string>>;

export const LOCAL_DATABASE_DECISION = {
  chosen: 'raw-idb',
  status: 'accepted-for-public-offline-mvp',
  adr: 'docs/adr/2026-06-04-local-data-store-backup-migrations.md',
  summary: 'Use the existing raw idb wrapper for IndexedDB mission/checklist stores, plus an allowlisted localStorage snapshot for small local settings. Keep export/import manual, local JSON only.',
  options: [
    {
      id: 'raw-idb',
      decision: 'chosen',
      evaluation: 'Already in use, tiny dependency, works offline in browsers, sufficient for the current missions/checklistRuns object stores, and keeps migrations explicit in app code.',
      tradeoffs: ['More boilerplate than Dexie', 'No relational query layer', 'Manual migration tests required'],
    },
    {
      id: 'dexie',
      decision: 'deferred',
      evaluation: 'Good IndexedDB ergonomics and versioned schema API, but adds another abstraction before the MVP needs richer queries or sync-safe conflict handling.',
      tradeoffs: ['Potential future upgrade path', 'Additional dependency and migration surface now'],
    },
    {
      id: 'sqlite-wasm-opfs',
      decision: 'rejected-for-mvp',
      evaluation: 'Powerful relational/offline option, but larger payload, OPFS/browser compatibility concerns, more complex backups and migration risk for a public offline MVP.',
      tradeoffs: ['Could be revisited for heavy relational data post-MVP', 'Too heavy for current local-only scope'],
    },
  ],
  guardrails: [
    'No backend sync, upload, cloud backup, account, auth or official command-system integration.',
    'No patient data, persondata, private locations or precise person-linked live tracking in backups/imports.',
    'Import/export is explicit manual JSON on the device and only includes allowlisted local app data keys.',
  ],
} as const;

export type LocalDataAppMetadata = {
  name: 'beredskapsboka';
  dbName: typeof DB_NAME;
  dbVersion: typeof LOCAL_MISSION_DB_VERSION;
  dbStores: typeof LOCAL_MISSION_STORES;
  missionRecordSchemaVersion: typeof LOCAL_MISSION_RECORD_SCHEMA_VERSION;
};

export type LocalDataExport = {
  kind: typeof LOCAL_DATA_EXPORT_KIND;
  exportVersion: typeof LOCAL_DATA_EXPORT_VERSION;
  schemaVersion: typeof LOCAL_DATA_SCHEMA_VERSION;
  exportedAt: string;
  app: LocalDataAppMetadata;
  localStorage: LocalStorageSnapshot;
  indexedDb: {
    missions: MissionContext[];
    checklistRuns: ChecklistRun[];
  };
};

export type StorageEstimateLike = {
  usage?: number;
  quota?: number;
};

export type StorageQuotaStatus = {
  level: 'unknown' | 'ok' | 'warning' | 'critical';
  usageBytes?: number;
  quotaBytes?: number;
  usageRatio?: number;
  formatted: string;
  message: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type LocalDataExportInput = {
  now?: Date | string;
  localStorage?: LocalStorageSnapshot;
  missions?: unknown[];
  checklistRuns?: unknown[];
};

type ApplyLocalDataImportOptions = {
  confirmLocalOnly: boolean;
  confirmReplaceExistingLocalData: boolean;
  storage?: StorageLike;
  replaceLocalStorage?: boolean;
  replaceMissionData?: (missions: MissionContext[], checklistRuns: ChecklistRun[]) => Promise<{ missions: number; checklistRuns: number }>;
};

type NormalizeExportRecordOptions = {
  enforceImportLimits?: boolean;
};

type SanitizeLocalStorageSnapshotOptions = {
  enforceImportLimits?: boolean;
  importedMissionIds?: ReadonlySet<string>;
};

const dangerousImportFieldNames = new Set([
  'auth',
  'authentication',
  'backend',
  'backendsync',
  'cloud',
  'cloudupload',
  'sync',
  'uploadurl',
  'token',
  'accesstoken',
  'refreshtoken',
  'password',
  'apikey',
  'authorization',
  'bearer',
  'clientsecret',
  'secret',
  'credential',
  'credentials',
  'session',
  'cookie',
  'patient',
  'patientdata',
  'patientid',
  'patientname',
  'persondata',
  'personaldata',
  'personnummer',
  'fødselsnummer',
  'privateaddress',
  'privatelocation',
  'privatelocations',
  'officialcommandsystem',
]);

const dangerousImportFieldPattern = /(token|secret|apikey|authorization|bearer|credential|session|cookie)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getBrowserLocalStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function keyIsAllowed(key: string): key is LocalDataStoreKey {
  return (LOCAL_DATA_STORE_KEYS as readonly string[]).includes(key);
}

function emitLocalDataImportEvents(): void {
  if (typeof window === 'undefined') return;
  for (const eventName of [
    'beredskapsboka-local-profile-change',
    FIELD_MODE_STORAGE_EVENT,
    OPERATIONS_MAP_EVENT,
    OFFLINE_MAP_CACHE_EVENT,
    EXTERNAL_DATA_SOURCE_SETTINGS_EVENT,
  ]) {
    window.dispatchEvent(new Event(eventName));
  }
}

function dangerousKeyName(key: string) {
  return key.normalize('NFKC').replace(/[^a-zA-Z0-9æøåÆØÅ]/g, '').toLowerCase();
}

function assertNoDangerousFields(value: unknown, path = 'import'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoDangerousFields(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = dangerousKeyName(key);
    if (dangerousImportFieldNames.has(normalizedKey) || dangerousImportFieldPattern.test(normalizedKey)) {
      throw new Error(`Local import rejected: unsupported dangerous field "${path}.${key}".`);
    }
    assertNoDangerousFields(nested, `${path}.${key}`);
  }
}

function assertImportTextSize(text: string): void {
  if (text.length > MAX_LOCAL_IMPORT_TEXT_CHARS) {
    throw new Error('Local import rejected: import text is too large.');
  }
}

function assertLocalImportDepth(value: unknown, maxDepth = MAX_LOCAL_IMPORT_DEPTH, path = 'import', depth = 0): void {
  if (depth > maxDepth) throw new Error(`Local import rejected: import payload is too deep at ${path}.`);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertLocalImportDepth(item, maxDepth, `${path}[${index}]`, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    assertLocalImportDepth(nested, maxDepth, `${path}.${key}`, depth + 1);
  }
}

function parseVersionNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`Local import rejected: ${label} is invalid.`);
  return value;
}

function hasLegacyExportShape(record: Record<string, unknown>): boolean {
  const indexedDb = isRecord(record.indexedDb) ? record.indexedDb : null;
  return isRecord(record.localStorage)
    || Array.isArray(record.missions)
    || Array.isArray(record.checklistRuns)
    || (Boolean(indexedDb) && (Array.isArray(indexedDb?.missions) || Array.isArray(indexedDb?.checklistRuns)));
}

function assertOptionalLegacyPayloadShape(record: Record<string, unknown>): void {
  if ('localStorage' in record && !isRecord(record.localStorage)) throw new Error('Local import rejected: legacy localStorage payload must be an object.');
  if ('missions' in record && !Array.isArray(record.missions)) throw new Error('Local import rejected: legacy missions payload must be an array.');
  if ('checklistRuns' in record && !Array.isArray(record.checklistRuns)) throw new Error('Local import rejected: legacy checklistRuns payload must be an array.');
  if ('indexedDb' in record) {
    if (!isRecord(record.indexedDb)) throw new Error('Local import rejected: legacy indexedDb payload must be an object.');
    if ('missions' in record.indexedDb && !Array.isArray(record.indexedDb.missions)) throw new Error('Local import rejected: legacy indexedDb.missions payload must be an array.');
    if ('checklistRuns' in record.indexedDb && !Array.isArray(record.indexedDb.checklistRuns)) throw new Error('Local import rejected: legacy indexedDb.checklistRuns payload must be an array.');
  }
}

function assertCurrentExportPayloadShape(record: Record<string, unknown>): void {
  if ('missions' in record || 'checklistRuns' in record) throw new Error('Local import rejected: current exports must store mission data under indexedDb only.');
  if (!isRecord(record.localStorage)) throw new Error('Local import rejected: localStorage payload must be an object.');
  if (!isRecord(record.indexedDb)) throw new Error('Local import rejected: indexedDb payload must be an object.');
  if (!Array.isArray(record.indexedDb.missions)) throw new Error('Local import rejected: indexedDb.missions payload must be an array.');
  if (!Array.isArray(record.indexedDb.checklistRuns)) throw new Error('Local import rejected: indexedDb.checklistRuns payload must be an array.');
}

function validateImportVersions(record: Record<string, unknown>): number {
  let exportVersion: number;
  if ('exportVersion' in record) {
    exportVersion = parseVersionNumber(record.exportVersion, 'export version');
  } else if ('version' in record) {
    exportVersion = parseVersionNumber(record.version, 'legacy export version');
  } else if (hasLegacyExportShape(record)) {
    exportVersion = 0;
  } else {
    throw new Error('Local import rejected: missing export kind/version.');
  }
  if (exportVersion > LOCAL_DATA_EXPORT_VERSION) throw new Error(`Local import rejected: export version ${exportVersion} is newer than supported version ${LOCAL_DATA_EXPORT_VERSION}.`);
  if (record.kind !== undefined && record.kind !== LOCAL_DATA_EXPORT_KIND) throw new Error('Local import rejected: export kind is unsupported.');
  if (exportVersion === 0 && !hasLegacyExportShape(record)) throw new Error('Local import rejected: legacy export payload is missing.');
  if (exportVersion === LOCAL_DATA_EXPORT_VERSION && record.kind !== LOCAL_DATA_EXPORT_KIND) throw new Error('Local import rejected: export kind is missing or unsupported.');
  if ('schemaVersion' in record) {
    const schemaVersion = parseVersionNumber(record.schemaVersion, 'schema version');
    if (schemaVersion > LOCAL_DATA_SCHEMA_VERSION) throw new Error(`Local import rejected: schema version ${schemaVersion} is newer than supported version ${LOCAL_DATA_SCHEMA_VERSION}.`);
  }
  if (exportVersion === LOCAL_DATA_EXPORT_VERSION) assertCurrentExportPayloadShape(record);
  if (exportVersion === 0) assertOptionalLegacyPayloadShape(record);
  return exportVersion;
}

function assertLocalImportCounts(record: Record<string, unknown>, exportVersion: number): void {
  const indexedDb = isRecord(record.indexedDb) ? record.indexedDb : {};
  const rawMissions = exportVersion === LOCAL_DATA_EXPORT_VERSION ? indexedDb.missions : (record.missions ?? indexedDb.missions);
  const rawChecklistRuns = exportVersion === LOCAL_DATA_EXPORT_VERSION ? indexedDb.checklistRuns : (record.checklistRuns ?? indexedDb.checklistRuns);
  if (Array.isArray(rawMissions) && rawMissions.length > MAX_LOCAL_IMPORT_MISSIONS) {
    throw new Error('Local import rejected: too many missions in import.');
  }
  if (Array.isArray(rawChecklistRuns) && rawChecklistRuns.length > MAX_LOCAL_IMPORT_CHECKLIST_RUNS) {
    throw new Error('Local import rejected: too many checklist runs in import.');
  }
}

function sortedLocalStorageSnapshot(snapshot: LocalStorageSnapshot): LocalStorageSnapshot {
  return Object.fromEntries(
    LOCAL_DATA_STORE_KEYS.flatMap((key) => (typeof snapshot[key] === 'string' ? [[key, snapshot[key]]] : [])),
  ) as LocalStorageSnapshot;
}

function parseRequiredLocalStorageJson(value: string, key: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Local import rejected: localStorage.${key} contains invalid JSON.`);
  }
}

function storageForValue(key: string, value: string): StorageLike {
  return {
    getItem: (requestedKey: string) => (requestedKey === key ? value : null),
    setItem: () => undefined,
    removeItem: () => undefined,
  };
}

const RELEASE_STAGE_IDS: StageId[] = ['idea', 'scope', 'build', 'verify', 'release'];
const RELEASE_STAGE_STATUSES: StageStatus[] = ['not-started', 'in-progress', 'ready'];
const RELEASE_WORK_STATUSES: WorkStatus[] = ['needs-work', 'in-progress', 'blocked', 'completed'];
const RELEASE_RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];

function isReleaseStageId(value: unknown): value is StageId {
  return typeof value === 'string' && RELEASE_STAGE_IDS.includes(value as StageId);
}

function isReleaseStageStatus(value: unknown): value is StageStatus {
  return typeof value === 'string' && RELEASE_STAGE_STATUSES.includes(value as StageStatus);
}

function isReleaseWorkStatus(value: unknown): value is WorkStatus {
  return typeof value === 'string' && RELEASE_WORK_STATUSES.includes(value as WorkStatus);
}

function isReleaseRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && RELEASE_RISK_LEVELS.includes(value as RiskLevel);
}

function sanitizeReleaseReadinessText(value: unknown, maxLength = 500): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F<>`{}[\]\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeReleaseReadinessItem(value: unknown): ReleaseItem | null {
  if (!isRecord(value)) return null;
  const id = sanitizeReleaseReadinessText(value.id, 120);
  const title = sanitizeReleaseReadinessText(value.title, 180);
  if (!id || !title || !isReleaseStageId(value.stage) || !isReleaseWorkStatus(value.status) || !isReleaseRiskLevel(value.risk)) return null;
  const owner = sanitizeReleaseReadinessText(value.owner, 80) || 'AR';
  const notes = sanitizeReleaseReadinessText(value.notes, 2_000);
  const completedAt = sanitizeReleaseReadinessText(value.completedAt, 40);
  return {
    id,
    title,
    owner,
    stage: value.stage,
    status: value.status,
    risk: value.risk,
    notes,
    ...(completedAt ? { completedAt } : {}),
  };
}

function normalizeReleaseReadinessPlan(value: unknown): ReleasePlan {
  if (!isRecord(value)) throw new Error(`Local import rejected: localStorage.${RELEASE_READINESS_STORAGE_KEY} must be a JSON object.`);
  const rawStages = isRecord(value.stages) ? value.stages : {};
  const stages = Object.fromEntries(
    RELEASE_STAGE_IDS.map((stageId) => [
      stageId,
      isReleaseStageStatus(rawStages[stageId]) ? rawStages[stageId] : defaultReleasePlan.stages[stageId],
    ]),
  ) as ReleasePlan['stages'];
  if (!Array.isArray(value.items)) throw new Error(`Local import rejected: localStorage.${RELEASE_READINESS_STORAGE_KEY}.items must be a JSON array.`);
  const items = value.items
    .map(normalizeReleaseReadinessItem)
    .filter((item): item is ReleaseItem => Boolean(item))
    .slice(0, 100);
  const syncedAt = sanitizeReleaseReadinessText(value.syncedAt, 40);
  return {
    stages,
    items,
    ...(syncedAt ? { syncedAt } : {}),
  };
}

function normalizeActiveMissionStorageValue(value: string, missionIds: ReadonlySet<string> | undefined): string | undefined {
  const missionId = value.trim();
  if (!missionId || missionId.length > 160) return undefined;
  if (!missionIds || missionIds.size === 0) return undefined;
  return missionIds.has(missionId) ? missionId : undefined;
}

function normalizeAllowedLocalStorageValue(key: LocalDataStoreKey, value: string, options: SanitizeLocalStorageSnapshotOptions): string | undefined {
  if (key === ACTIVE_MISSION_STORAGE_KEY) return normalizeActiveMissionStorageValue(value, options.importedMissionIds);
  const parsedValue = parseRequiredLocalStorageJson(value, key);
  if (options.enforceImportLimits) assertLocalImportDepth(parsedValue, MAX_LOCAL_IMPORT_DEPTH, `localStorage.${key}`);
  assertNoDangerousFields(parsedValue, `localStorage.${key}`);
  assertNoSensitiveOperationalTextInValue(parsedValue, `localStorage.${key}`);

  if (key === FIELD_MODE_STORAGE_KEY) return JSON.stringify(normalizeFieldModeSettings(parsedValue));
  if (key === FIELD_FEEDBACK_STORAGE_KEY) {
    if (!Array.isArray(parsedValue)) throw new Error(`Local import rejected: localStorage.${key} must be a JSON array.`);
    return JSON.stringify(parseFieldFeedbackEntries(JSON.stringify(parsedValue)));
  }
  if (key === OPERATIONS_MAP_STORAGE_KEY) {
    const normalized = retainMissionMapObjects(normalizeMissionMapState(parsedValue), options.importedMissionIds ?? new Set<string>());
    return JSON.stringify(normalized);
  }
  if (key === OFFLINE_MAP_CACHE_STORAGE_KEY) {
    const normalized = normalizeCachedOfflineMapPackage(parsedValue);
    if (!normalized) throw new Error(`Local import rejected: localStorage.${key} has invalid offline map cache data.`);
    return JSON.stringify(normalized);
  }
  if (key === EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY) return JSON.stringify(normalizeExternalDataSourceSettings(parsedValue));
  if (key === LOCAL_RETENTION_STORAGE_KEY) return JSON.stringify(readRetentionSettings(storageForValue(key, value)));
  if (key === LOCAL_AUDIT_LOG_STORAGE_KEY) {
    if (!Array.isArray(parsedValue)) throw new Error(`Local import rejected: localStorage.${key} must be a JSON array.`);
    return JSON.stringify(readLocalAuditLog(storageForValue(key, value)));
  }
  if (key === RELEASE_READINESS_STORAGE_KEY) return JSON.stringify(normalizeReleaseReadinessPlan(parsedValue));
  if (key === PERSONAL_PREP_STORAGE_KEY) return JSON.stringify(sanitizePersonalPrepState(parsedValue));
  return undefined;
}

function assertChecklistRunsReferenceImportedMissions(missions: MissionContext[], checklistRuns: ChecklistRun[]): void {
  const missionIds = new Set(missions.map((mission) => mission.id));
  for (const run of checklistRuns) {
    if (!missionIds.has(run.missionId)) {
      throw new Error(`Local import rejected: checklist run ${run.id} references missing mission ${run.missionId}.`);
    }
  }
}

export function sanitizeLocalStorageSnapshot(input: unknown, options: SanitizeLocalStorageSnapshotOptions = {}): LocalStorageSnapshot {
  if (!isRecord(input)) return {};
  const snapshot: LocalStorageSnapshot = {};
  for (const [key, value] of Object.entries(input)) {
    if (!keyIsAllowed(key) || typeof value !== 'string') continue;
    if (value.length > MAX_LOCAL_STORAGE_VALUE_CHARS) throw new Error(`Local import rejected: localStorage value for ${key} is too large.`);
    assertNoSensitiveOperationalTextInValue(value, `localStorage.${key}`);
    const normalizedValue = normalizeAllowedLocalStorageValue(key, value, options);
    if (typeof normalizedValue === 'string') snapshot[key] = normalizedValue;
  }
  return sortedLocalStorageSnapshot(snapshot);
}

export function readKnownLocalStorage(storage: StorageLike | undefined = getBrowserLocalStorage()): LocalStorageSnapshot {
  if (!storage) return {};
  const snapshot: LocalStorageSnapshot = {};
  for (const key of LOCAL_DATA_STORE_KEYS) {
    try {
      const value = storage.getItem(key);
      if (typeof value === 'string') snapshot[key] = value;
    } catch {
      // Restricted/private browser storage must not crash backup creation.
    }
  }
  return sortedLocalStorageSnapshot(snapshot);
}

function restoreKnownLocalStorage(storage: StorageLike, snapshot: LocalStorageSnapshot): void {
  for (const key of LOCAL_DATA_STORE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Keep trying to restore other keys.
    }
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (!keyIsAllowed(key) || typeof value !== 'string') continue;
    try {
      storage.setItem(key, value);
    } catch {
      // Best-effort restore; caller surfaces the original import failure.
    }
  }
}

function replaceKnownLocalStorageWithRollback(storage: StorageLike, next: LocalStorageSnapshot, replaceLocalStorage: boolean): LocalStorageSnapshot {
  const previous = readKnownLocalStorage(storage);
  try {
    for (const [key, value] of Object.entries(next)) {
      if (keyIsAllowed(key) && typeof value === 'string') storage.setItem(key, value);
    }
    if (replaceLocalStorage) {
      for (const key of LOCAL_DATA_STORE_KEYS) {
        if (!(key in next)) storage.removeItem(key);
      }
    }
  } catch (error) {
    try {
      restoreKnownLocalStorage(storage, previous);
    } catch {
      // Best-effort rollback; preserve the original import error below.
    }
    throw error;
  }
  return previous;
}

function normalizeMissions(input: unknown): MissionContext[] {
  if (!Array.isArray(input)) return [];
  return input.map(migrateStoredMissionContext);
}

function normalizeChecklistRuns(input: unknown): ChecklistRun[] {
  if (!Array.isArray(input)) return [];
  return input.map(migrateStoredChecklistRun);
}

function normalizeExportRecord(input: unknown, options: NormalizeExportRecordOptions = {}): LocalDataExport {
  if (!isRecord(input)) throw new Error('Local import rejected: JSON root must be an object.');
  if (options.enforceImportLimits) assertLocalImportDepth(input);
  assertNoDangerousFields(input);
  const exportVersion = validateImportVersions(input);
  if (options.enforceImportLimits) assertLocalImportCounts(input, exportVersion);
  assertNoSensitiveOperationalTextInValue(input, 'localImport');

  const indexedDb = isRecord(input.indexedDb) ? input.indexedDb : {};
  const missions = normalizeMissions(exportVersion === LOCAL_DATA_EXPORT_VERSION ? indexedDb.missions : (input.missions ?? indexedDb.missions));
  const checklistRuns = normalizeChecklistRuns(exportVersion === LOCAL_DATA_EXPORT_VERSION ? indexedDb.checklistRuns : (input.checklistRuns ?? indexedDb.checklistRuns));
  assertChecklistRunsReferenceImportedMissions(missions, checklistRuns);
  const exportedAt = typeof input.exportedAt === 'string' && input.exportedAt ? input.exportedAt : new Date(0).toISOString();

  return buildLocalDataExport({
    now: exportedAt,
    localStorage: sanitizeLocalStorageSnapshot(input.localStorage, { enforceImportLimits: options.enforceImportLimits, importedMissionIds: new Set(missions.map((mission) => mission.id)) }),
    missions,
    checklistRuns,
  });
}

export function migrateLocalDataExport(input: unknown): LocalDataExport {
  return normalizeExportRecord(input, { enforceImportLimits: true });
}

export function buildLocalDataExport(input: LocalDataExportInput = {}): LocalDataExport {
  const exportedAt = typeof input.now === 'string' ? input.now : (input.now ?? new Date()).toISOString();
  const missions = normalizeMissions(input.missions ?? []);
  const checklistRuns = normalizeChecklistRuns(input.checklistRuns ?? []);
  const localStorage = sanitizeLocalStorageSnapshot(input.localStorage ?? {}, { importedMissionIds: new Set(missions.map((mission) => mission.id)) });
  return {
    kind: LOCAL_DATA_EXPORT_KIND,
    exportVersion: LOCAL_DATA_EXPORT_VERSION,
    schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
    exportedAt,
    app: {
      name: 'beredskapsboka',
      dbName: DB_NAME,
      dbVersion: LOCAL_MISSION_DB_VERSION,
      dbStores: LOCAL_MISSION_STORES,
      missionRecordSchemaVersion: LOCAL_MISSION_RECORD_SCHEMA_VERSION,
    },
    localStorage,
    indexedDb: {
      missions,
      checklistRuns,
    },
  };
}

export async function buildBrowserLocalDataExport(storage: StorageLike | undefined = getBrowserLocalStorage(), now = new Date()): Promise<LocalDataExport> {
  return buildLocalDataExport({
    now,
    localStorage: readKnownLocalStorage(storage),
    missions: await listAllMissions(),
    checklistRuns: await listAllChecklistRuns(),
  });
}

export function serializeLocalDataExport(exportData: LocalDataExport): string {
  return `${JSON.stringify(normalizeExportRecord(exportData), null, 2)}\n`;
}

export function parseLocalDataImport(text: string): LocalDataExport {
  assertImportTextSize(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Local import rejected: invalid JSON.');
  }
  return migrateLocalDataExport(parsed);
}

export async function applyLocalDataImport(importData: LocalDataExport | string, options: ApplyLocalDataImportOptions): Promise<{ localStorageKeys: number; missions: number; checklistRuns: number }> {
  if (!options.confirmLocalOnly) throw new Error('Local import requires explicit confirmation that the JSON stays local to this device.');
  if (!options.confirmReplaceExistingLocalData) throw new Error('Local import requires explicit confirmation that existing local app data will be replaced.');
  const parsed = typeof importData === 'string' ? parseLocalDataImport(importData) : migrateLocalDataExport(importData);
  const storage = options.storage ?? getBrowserLocalStorage();
  const replaceLocalStorage = options.replaceLocalStorage ?? true;
  let previousSnapshot: LocalStorageSnapshot | null = null;
  let localStorageChanged = false;

  try {
    if (storage) {
      previousSnapshot = replaceKnownLocalStorageWithRollback(storage, parsed.localStorage, replaceLocalStorage);
      localStorageChanged = true;
    }
    const replace = options.replaceMissionData ?? replaceLocalMissionData;
    const dbCounts = await replace(parsed.indexedDb.missions, parsed.indexedDb.checklistRuns);
    emitLocalDataImportEvents();
    return {
      localStorageKeys: Object.keys(parsed.localStorage).length,
      missions: dbCounts.missions,
      checklistRuns: dbCounts.checklistRuns,
    };
  } catch (error) {
    if (storage && localStorageChanged && previousSnapshot) {
      try {
        restoreKnownLocalStorage(storage, previousSnapshot);
      } catch {
        // Best-effort rollback; surface original import failure.
      }
    }
    if (error instanceof Error && error.message.startsWith('Local import')) throw error;
    throw new Error(error instanceof Error ? `Local import stopped: ${error.message}` : 'Local import stopped before existing data could be safely replaced.');
  }
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'ukjent';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatStorageEstimate(estimate: StorageEstimateLike | undefined): string {
  const usage = estimate?.usage;
  const quota = estimate?.quota;
  if (!Number.isFinite(usage) || !Number.isFinite(quota) || !quota || quota <= 0) return 'Lagringskvote er ukjent i denne nettleseren.';
  const ratio = Math.max(0, Math.min(1, Number(usage) / Number(quota)));
  return `${formatBytes(Number(usage))} brukt av ${formatBytes(Number(quota))} (${Math.round(ratio * 100)} %).`;
}

export function storageQuotaStatus(estimate: StorageEstimateLike | undefined): StorageQuotaStatus {
  const usage = estimate?.usage;
  const quota = estimate?.quota;
  if (!Number.isFinite(usage) || !Number.isFinite(quota) || !quota || quota <= 0) {
    return {
      level: 'unknown',
      formatted: formatStorageEstimate(estimate),
      message: 'Nettleseren oppgir ikke lokal lagringskvote. Eksport/import er fortsatt manuell og lokal, men store offlinepakker bør kontrolleres før bruk.',
    };
  }
  const usageBytes = Math.max(0, Number(usage));
  const quotaBytes = Math.max(0, Number(quota));
  const usageRatio = quotaBytes > 0 ? usageBytes / quotaBytes : 0;
  const level = usageRatio >= 0.9 ? 'critical' : usageRatio >= 0.75 ? 'warning' : 'ok';
  const message = level === 'critical'
    ? 'Kritisk lav lokal lagringsmargin. Lag manuell JSON-backup og slett unødvendige lokale data før mer offlineinnhold.'
    : level === 'warning'
      ? 'Lokal lagring nærmer seg kvoten. Vurder eksport og opprydding før store offlinepakker.'
      : 'Lokal lagringsbruk ser ok ut for MVP-data.';
  return { level, usageBytes, quotaBytes, usageRatio, formatted: formatStorageEstimate(estimate), message };
}

export async function estimateStorageQuota(scope: Pick<Navigator, 'storage'> | undefined = typeof navigator === 'undefined' ? undefined : navigator): Promise<StorageQuotaStatus> {
  try {
    const estimate = await scope?.storage?.estimate?.();
    return storageQuotaStatus(estimate);
  } catch {
    return storageQuotaStatus(undefined);
  }
}
