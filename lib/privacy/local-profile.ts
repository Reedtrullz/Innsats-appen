import { roles, type Role } from '@/lib/content/taxonomy';

export const LOCAL_PROFILE_STORAGE_KEY = 'beredskapsboka-local-profile-v1';
export const LOCAL_RETENTION_STORAGE_KEY = 'beredskapsboka-local-retention-v1';
export const LOCAL_AUDIT_LOG_STORAGE_KEY = 'beredskapsboka-local-audit-v1';
export const LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY = 'beredskapsboka-local-competence-reminders-v1';

export const LOCAL_PROFILE_SCHEMA_VERSION = 1;
export const DEFAULT_PIN_ITERATIONS = 120_000;
export const PIN_HASH_LENGTH_BITS = 256;
export const MAX_AUDIT_ENTRIES = 200;
export const MAX_COMPETENCE_REMINDERS = 12;

export type LocalProfileRole = Role | 'ikke-valgt';

export type LocalPinLock = {
  algorithm: 'PBKDF2-SHA-256';
  saltBase64: string;
  hashBase64: string;
  iterations: number;
  keyLengthBits: number;
  createdAt: string;
};

export type EncryptedLocalProfilePayload = {
  algorithm: 'AES-GCM';
  ivBase64: string;
  ciphertextBase64: string;
  createdAt: string;
};

export type LocalProfile = {
  schemaVersion: typeof LOCAL_PROFILE_SCHEMA_VERSION;
  profileEnabled: boolean;
  displayName: string;
  callsign: string;
  preferredRole: LocalProfileRole;
  pinLock?: LocalPinLock;
  encryptedProfilePayload?: EncryptedLocalProfilePayload;
  updatedAt: string;
};

export type CompetenceExpiryReminder = {
  id: string;
  label: string;
  expiresOn: string;
  createdAt: string;
  updatedAt: string;
};

export type RetentionSettings = {
  schemaVersion: typeof LOCAL_PROFILE_SCHEMA_VERSION;
  missionRetentionDays: number;
  archiveRetentionDays: number;
  profileRetentionDays: number;
  auditRetentionDays: number;
  updatedAt: string;
};

export type AuditEntryType = 'order-created' | 'status-changed' | 'export-created' | 'local-reset';

export type LocalAuditEntry = {
  id: string;
  type: AuditEntryType;
  createdAt: string;
  details: Record<string, string | number | boolean>;
};

export type PrivacyGatedFeatureId = 'competence-records' | 'personal-equipment' | 'availability' | 'calendar-integration' | 'multiple-profiles';

export type PrivacyGatedFeature = {
  id: PrivacyGatedFeatureId;
  title: string;
  enabled: false;
  status: 'privacy-review-required';
  reason: string;
};

export const BIOMETRIC_UNLOCK_EVALUATION = {
  status: 'deferred' as const,
  title: 'Biometrisk opplåsing',
  summary: 'Nettlesere kan støtte plattformautentisering via WebAuthn/PublicKeyCredential, men MVP implementerer det ikke.',
  guardrail: 'Skal kun vurderes etter egen personvern- og sikkerhetsgjennomgang, med tydelig fallback og uten påstand om sterk autentisering.',
};

export const PRIVACY_GATED_LOCAL_PROFILE_FEATURES: PrivacyGatedFeature[] = [
  {
    id: 'competence-records',
    title: 'Kompetanse-/sertifiseringsregister',
    enabled: false,
    status: 'privacy-review-required',
    reason: 'Ikke implementert i MVP. Kan røpe personopplysninger, arbeidsgiver-/rolleforhold eller sertifikat-ID-er.',
  },
  {
    id: 'personal-equipment',
    title: 'Personlig utstyr utlevert/status',
    enabled: false,
    status: 'privacy-review-required',
    reason: 'Ikke implementert i MVP. Kan røpe person-/materiellkoblinger, serienummer eller lagerinformasjon.',
  },
  {
    id: 'availability',
    title: 'Lokal tilgjengelighetsstatus',
    enabled: false,
    status: 'privacy-review-required',
    reason: 'Ikke implementert i MVP. Tilgjengelighet kan være persondata og må ha egen lagrings-/slettepolicy.',
  },
  {
    id: 'calendar-integration',
    title: 'Kalender for øvelser/kurs',
    enabled: false,
    status: 'privacy-review-required',
    reason: 'Ikke implementert i MVP. Kalenderkobling kan gi tilgang til private kalenderdata.',
  },
  {
    id: 'multiple-profiles',
    title: 'Flere lokale profiler',
    enabled: false,
    status: 'privacy-review-required',
    reason: 'Ikke implementert i MVP. Flere profiler krever tydelig separasjon, sletting og risikoanalyse.',
  },
];

export const DEFAULT_RETENTION_SETTINGS: RetentionSettings = {
  schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
  missionRetentionDays: 30,
  archiveRetentionDays: 180,
  profileRetentionDays: 365,
  auditRetentionDays: 90,
  updatedAt: '1970-01-01T00:00:00.000Z',
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type CryptoWithSubtle = Crypto & { subtle: SubtleCrypto };

function getStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function sanitizeLocalProfileText(value: unknown, maxLength = 48): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[<>`{}[\]\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeDateOnly(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? '' : text;
}

function sanitizeRole(value: unknown): LocalProfileRole {
  const role = String(value ?? 'ikke-valgt');
  return roles.includes(role as Role) ? role as LocalProfileRole : 'ikke-valgt';
}

function sanitizePositiveDays(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(3650, Math.max(1, Math.round(parsed)));
}

function sanitizePinIterations(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PIN_ITERATIONS;
  return Math.min(600_000, Math.max(1_000, Math.round(parsed)));
}

function sanitizeKeyLengthBits(value: unknown): number {
  const parsed = Number(value);
  return parsed === 128 || parsed === 192 || parsed === 256 ? parsed : PIN_HASH_LENGTH_BITS;
}

function sanitizePinLock(value: unknown): LocalPinLock | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  if (record.algorithm !== 'PBKDF2-SHA-256') return undefined;
  const saltBase64 = sanitizeLocalProfileText(record.saltBase64, 256);
  const hashBase64 = sanitizeLocalProfileText(record.hashBase64, 512);
  const iterations = sanitizePinIterations(record.iterations);
  const keyLengthBits = sanitizeKeyLengthBits(record.keyLengthBits);
  const createdAt = sanitizeLocalProfileText(record.createdAt, 40);
  if (!saltBase64 || !hashBase64) return undefined;
  return { algorithm: 'PBKDF2-SHA-256', saltBase64, hashBase64, iterations, keyLengthBits, createdAt };
}

function sanitizeEncryptedPayload(value: unknown): EncryptedLocalProfilePayload | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  if (record.algorithm !== 'AES-GCM') return undefined;
  const ivBase64 = sanitizeLocalProfileText(record.ivBase64, 128);
  const ciphertextBase64 = sanitizeLocalProfileText(record.ciphertextBase64, 4096);
  const createdAt = sanitizeLocalProfileText(record.createdAt, 40);
  if (!ivBase64 || !ciphertextBase64) return undefined;
  return { algorithm: 'AES-GCM', ivBase64, ciphertextBase64, createdAt };
}

export function sanitizeLocalProfile(input: unknown, now = new Date().toISOString()): LocalProfile {
  const record = asRecord(input) ?? {};
  const pinLock = sanitizePinLock(record.pinLock);
  const encryptedProfilePayload = sanitizeEncryptedPayload(record.encryptedProfilePayload);
  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    profileEnabled: Boolean(record.profileEnabled),
    displayName: sanitizeLocalProfileText(record.displayName),
    callsign: sanitizeLocalProfileText(record.callsign, 32),
    preferredRole: sanitizeRole(record.preferredRole),
    ...(pinLock ? { pinLock } : {}),
    ...(encryptedProfilePayload ? { encryptedProfilePayload } : {}),
    updatedAt: sanitizeLocalProfileText(record.updatedAt, 40) || now,
  };
}

export function readLocalProfile(storage: StorageLike | undefined = getStorage()): LocalProfile | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(LOCAL_PROFILE_STORAGE_KEY);
    return raw ? sanitizeLocalProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile: Partial<LocalProfile>, storage: StorageLike | undefined = getStorage(), now = new Date().toISOString()): LocalProfile {
  const sanitized = sanitizeLocalProfile({ ...profile, updatedAt: now }, now);
  if (storage) {
    try {
      storage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(sanitized));
      emitLocalProfileChange();
    } catch {
      // Keep the sanitized return value usable if localStorage is blocked or full.
    }
  }
  return sanitized;
}

export function deleteLocalProfile(storage: StorageLike | undefined = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(LOCAL_PROFILE_STORAGE_KEY);
    storage.removeItem(LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY);
    emitLocalProfileChange();
  } catch {
    // No-op when localStorage is blocked.
  }
}

export function localProfileSnapshot(storage: StorageLike | undefined = getStorage()): string {
  return JSON.stringify(readLocalProfile(storage));
}

export function subscribeLocalProfile(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    const watchedKeys = new Set([LOCAL_PROFILE_STORAGE_KEY, LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY, LOCAL_RETENTION_STORAGE_KEY, LOCAL_AUDIT_LOG_STORAGE_KEY]);
    if (!event.key || watchedKeys.has(event.key)) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('beredskapsboka-local-profile-change', listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('beredskapsboka-local-profile-change', listener);
  };
}

function emitLocalProfileChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('beredskapsboka-local-profile-change'));
}

export function readRetentionSettings(storage: StorageLike | undefined = getStorage()): RetentionSettings {
  if (!storage) return DEFAULT_RETENTION_SETTINGS;
  try {
    const raw = storage.getItem(LOCAL_RETENTION_STORAGE_KEY);
    if (!raw) return DEFAULT_RETENTION_SETTINGS;
    const record = asRecord(JSON.parse(raw)) ?? {};
    return {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      missionRetentionDays: sanitizePositiveDays(record.missionRetentionDays, DEFAULT_RETENTION_SETTINGS.missionRetentionDays),
      archiveRetentionDays: sanitizePositiveDays(record.archiveRetentionDays, DEFAULT_RETENTION_SETTINGS.archiveRetentionDays),
      profileRetentionDays: sanitizePositiveDays(record.profileRetentionDays, DEFAULT_RETENTION_SETTINGS.profileRetentionDays),
      auditRetentionDays: sanitizePositiveDays(record.auditRetentionDays, DEFAULT_RETENTION_SETTINGS.auditRetentionDays),
      updatedAt: sanitizeLocalProfileText(record.updatedAt, 40) || DEFAULT_RETENTION_SETTINGS.updatedAt,
    };
  } catch {
    return DEFAULT_RETENTION_SETTINGS;
  }
}

export function saveRetentionSettings(settings: Partial<RetentionSettings>, storage: StorageLike | undefined = getStorage(), now = new Date().toISOString()): RetentionSettings {
  const sanitized: RetentionSettings = {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    missionRetentionDays: sanitizePositiveDays(settings.missionRetentionDays, DEFAULT_RETENTION_SETTINGS.missionRetentionDays),
    archiveRetentionDays: sanitizePositiveDays(settings.archiveRetentionDays, DEFAULT_RETENTION_SETTINGS.archiveRetentionDays),
    profileRetentionDays: sanitizePositiveDays(settings.profileRetentionDays, DEFAULT_RETENTION_SETTINGS.profileRetentionDays),
    auditRetentionDays: sanitizePositiveDays(settings.auditRetentionDays, DEFAULT_RETENTION_SETTINGS.auditRetentionDays),
    updatedAt: now,
  };
  if (storage) {
    try {
      storage.setItem(LOCAL_RETENTION_STORAGE_KEY, JSON.stringify(sanitized));
      emitLocalProfileChange();
    } catch {
      // Keep sanitized return even if storage is unavailable.
    }
  }
  return sanitized;
}

export function resetRetentionSettings(storage: StorageLike | undefined = getStorage()): RetentionSettings {
  if (storage) {
    try {
      storage.removeItem(LOCAL_RETENTION_STORAGE_KEY);
      emitLocalProfileChange();
    } catch {
      // No-op when storage is blocked.
    }
  }
  return DEFAULT_RETENTION_SETTINGS;
}

export function sanitizeCompetenceReminder(input: unknown, now = new Date().toISOString()): CompetenceExpiryReminder | null {
  const record = asRecord(input) ?? {};
  const label = sanitizeLocalProfileText(record.label, 64);
  const expiresOn = sanitizeDateOnly(record.expiresOn);
  if (!label || !expiresOn) return null;
  return {
    id: sanitizeLocalProfileText(record.id, 64) || randomId('reminder'),
    label,
    expiresOn,
    createdAt: sanitizeLocalProfileText(record.createdAt, 40) || now,
    updatedAt: now,
  };
}

export function readCompetenceReminders(storage: StorageLike | undefined = getStorage()): CompetenceExpiryReminder[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => sanitizeCompetenceReminder(item))
      .filter((item): item is CompetenceExpiryReminder => Boolean(item))
      .slice(0, MAX_COMPETENCE_REMINDERS)
      .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  } catch {
    return [];
  }
}

export function saveCompetenceReminders(reminders: CompetenceExpiryReminder[], storage: StorageLike | undefined = getStorage()): CompetenceExpiryReminder[] {
  const sanitized = reminders
    .map((item) => sanitizeCompetenceReminder(item))
    .filter((item): item is CompetenceExpiryReminder => Boolean(item))
    .slice(0, MAX_COMPETENCE_REMINDERS)
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  if (storage) {
    try {
      storage.setItem(LOCAL_COMPETENCE_REMINDERS_STORAGE_KEY, JSON.stringify(sanitized));
      emitLocalProfileChange();
    } catch {
      // Keep sanitized return even if storage is unavailable.
    }
  }
  return sanitized;
}

export function addCompetenceReminder(input: Pick<CompetenceExpiryReminder, 'label' | 'expiresOn'>, storage: StorageLike | undefined = getStorage(), now = new Date().toISOString()): CompetenceExpiryReminder[] {
  const reminder = sanitizeCompetenceReminder({ ...input, id: randomId('reminder'), createdAt: now }, now);
  if (!reminder) return readCompetenceReminders(storage);
  return saveCompetenceReminders([...readCompetenceReminders(storage), reminder], storage);
}

export function deleteCompetenceReminder(id: string, storage: StorageLike | undefined = getStorage()): CompetenceExpiryReminder[] {
  const sanitizedId = sanitizeLocalProfileText(id, 64);
  return saveCompetenceReminders(readCompetenceReminders(storage).filter((item) => item.id !== sanitizedId), storage);
}

function getWebCrypto(): CryptoWithSubtle {
  const cryptoObject = globalThis.crypto;
  if (!cryptoObject?.subtle) throw new Error('Web Crypto is unavailable; sensitive local profile payloads stay disabled.');
  return cryptoObject as CryptoWithSubtle;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  getWebCrypto().getRandomValues(bytes);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(value: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toCryptoBuffer(bytes: Uint8Array): BufferSource {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes) as unknown as BufferSource;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

async function pbkdf2Hash(pin: string, salt: Uint8Array, iterations: number, keyLengthBits = PIN_HASH_LENGTH_BITS): Promise<Uint8Array> {
  const subtle = getWebCrypto().subtle;
  const key = await subtle.importKey('raw', toCryptoBuffer(utf8(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: toCryptoBuffer(salt), iterations }, key, keyLengthBits);
  return new Uint8Array(bits);
}

export async function createPinLock(pin: string, options: { iterations?: number; now?: string } = {}): Promise<LocalPinLock> {
  const normalizedPin = String(pin ?? '');
  if (normalizedPin.length < 4) throw new Error('PIN must be at least 4 characters for local privacy friction.');
  const salt = randomBytes(16);
  const iterations = options.iterations ?? DEFAULT_PIN_ITERATIONS;
  const hash = await pbkdf2Hash(normalizedPin, salt, iterations);
  return {
    algorithm: 'PBKDF2-SHA-256',
    saltBase64: toBase64(salt),
    hashBase64: toBase64(hash),
    iterations,
    keyLengthBits: PIN_HASH_LENGTH_BITS,
    createdAt: options.now ?? new Date().toISOString(),
  };
}

export async function verifyPin(pin: string, lock: LocalPinLock): Promise<boolean> {
  const sanitizedLock = sanitizePinLock(lock);
  if (!sanitizedLock) return false;
  const expected = fromBase64(sanitizedLock.hashBase64);
  const actual = await pbkdf2Hash(String(pin ?? ''), fromBase64(sanitizedLock.saltBase64), sanitizedLock.iterations, sanitizedLock.keyLengthBits);
  return constantTimeEqual(expected, actual);
}

export async function deriveAesGcmKeyFromPassphrase(passphrase: string, saltBase64: string, iterations = DEFAULT_PIN_ITERATIONS): Promise<CryptoKey> {
  const subtle = getWebCrypto().subtle;
  const keyMaterial = await subtle.importKey('raw', toCryptoBuffer(utf8(passphrase)), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toCryptoBuffer(fromBase64(saltBase64)), iterations },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptSensitiveProfilePayload(plaintext: string, key: CryptoKey, now = new Date().toISOString()): Promise<EncryptedLocalProfilePayload> {
  const subtle = getWebCrypto().subtle;
  const iv = randomBytes(12);
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv: toCryptoBuffer(iv) }, key, toCryptoBuffer(utf8(plaintext)));
  return { algorithm: 'AES-GCM', ivBase64: toBase64(iv), ciphertextBase64: toBase64(new Uint8Array(ciphertext)), createdAt: now };
}

export async function decryptSensitiveProfilePayload(payload: EncryptedLocalProfilePayload, key: CryptoKey): Promise<string> {
  const sanitized = sanitizeEncryptedPayload(payload);
  if (!sanitized) throw new Error('Encrypted payload is invalid.');
  const subtle = getWebCrypto().subtle;
  const plaintext = await subtle.decrypt({ name: 'AES-GCM', iv: toCryptoBuffer(fromBase64(sanitized.ivBase64)) }, key, toCryptoBuffer(fromBase64(sanitized.ciphertextBase64)));
  return new TextDecoder().decode(plaintext);
}

function sanitizeAuditValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') return sanitizeLocalProfileText(value, 64);
  return undefined;
}

export function sanitizeAuditDetails(details: Record<string, unknown> = {}): Record<string, string | number | boolean> {
  const allowedKeys = new Set([
    'missionId',
    'orderType',
    'exportKind',
    'resetScope',
    'statusChangeCount',
    'taskStatusChangeCount',
    'count',
    'beforeStatus',
    'afterStatus',
    'source',
    'templateId',
    'readbackConfirmed',
    'markerCount',
    'drawingCount',
  ]);
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(details)) {
    if (!allowedKeys.has(key)) continue;
    const sanitizedValue = sanitizeAuditValue(value);
    if (sanitizedValue !== undefined && sanitizedValue !== '') sanitized[key] = sanitizedValue;
  }
  return sanitized;
}

function sanitizeAuditEntry(input: unknown): LocalAuditEntry | null {
  const record = asRecord(input);
  if (!record) return null;
  const type = String(record.type ?? '') as AuditEntryType;
  if (!['order-created', 'status-changed', 'export-created', 'local-reset'].includes(type)) return null;
  const createdAt = sanitizeLocalProfileText(record.createdAt, 40);
  return {
    id: sanitizeLocalProfileText(record.id, 80) || randomId('audit'),
    type,
    createdAt: createdAt || new Date().toISOString(),
    details: sanitizeAuditDetails(asRecord(record.details) ?? {}),
  };
}

export function readLocalAuditLog(storage: StorageLike | undefined = getStorage()): LocalAuditEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(LOCAL_AUDIT_LOG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeAuditEntry).filter((entry): entry is LocalAuditEntry => Boolean(entry)).slice(-MAX_AUDIT_ENTRIES);
  } catch {
    return [];
  }
}

export function appendLocalAuditEntry(type: AuditEntryType, details: Record<string, unknown> = {}, now = new Date().toISOString(), storage: StorageLike | undefined = getStorage()): LocalAuditEntry {
  const entry: LocalAuditEntry = { id: randomId('audit'), type, createdAt: now, details: sanitizeAuditDetails(details) };
  if (storage) {
    try {
      const entries = [...readLocalAuditLog(storage), entry].slice(-MAX_AUDIT_ENTRIES);
      storage.setItem(LOCAL_AUDIT_LOG_STORAGE_KEY, JSON.stringify(entries));
      emitLocalProfileChange();
    } catch {
      // Return entry even when audit storage is unavailable.
    }
  }
  return entry;
}

export function resetLocalAuditLog(storage: StorageLike | undefined = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(LOCAL_AUDIT_LOG_STORAGE_KEY);
    emitLocalProfileChange();
  } catch {
    // No-op when storage is blocked.
  }
}

export function exportLocalAuditLog(storage: StorageLike | undefined = getStorage(), now = new Date().toISOString()): string {
  const payload = {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    exportedAt: now,
    localOnly: true,
    warning: 'Sanitert lokal auditlogg. Ikke offisiell logg, ingen backend sync, ingen persondata skal legges inn.',
    entries: readLocalAuditLog(storage),
  };
  return JSON.stringify(payload, null, 2);
}

function randomId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
