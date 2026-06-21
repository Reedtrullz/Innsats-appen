import { afterEach, expect, it } from 'vitest';
import {
  BIOMETRIC_UNLOCK_EVALUATION,
  DEFAULT_RETENTION_SETTINGS,
  LOCAL_AUDIT_LOG_STORAGE_KEY,
  LOCAL_PROFILE_STORAGE_KEY,
  MAX_AUDIT_ENTRIES,
  PRIVACY_GATED_LOCAL_PROFILE_FEATURES,
  addCompetenceReminder,
  appendLocalAuditEntry,
  createPinLock,
  deleteLocalProfile,
  deriveAesGcmKeyFromPassphrase,
  encryptSensitiveProfilePayload,
  decryptSensitiveProfilePayload,
  exportLocalAuditLog,
  readCompetenceReminders,
  readLocalAuditLog,
  readLocalProfile,
  readRetentionSettings,
  resetLocalAuditLog,
  saveLocalProfile,
  saveRetentionSettings,
  sanitizeLocalProfile,
  verifyPin,
} from '@/lib/privacy/local-profile';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
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

afterEach(() => {
  localStorage.clear();
});

it('sanitizes optional local profile fields and keeps local role separate from auth', () => {
  const profile = sanitizeLocalProfile({
    profileEnabled: true,
    displayName: ' <Operatør>  Test  ',
    callsign: ' ALFA-1 {hemmelig} ',
    preferredRole: 'lagforer',
    accountId: 'must-not-survive',
  });

  expect(profile).toMatchObject({ profileEnabled: true, displayName: 'Operatør Test', callsign: 'ALFA-1 hemmelig', preferredRole: 'lagforer' });
  expect(JSON.stringify(profile)).not.toMatch(/account|auth|login|must-not-survive/i);

  const fallback = sanitizeLocalProfile({ preferredRole: 'admin' });
  expect(fallback.preferredRole).toBe('ikke-valgt');
});

it('creates and verifies PIN lock with Web Crypto without storing raw PIN', async () => {
  const lock = await createPinLock('1234', { iterations: 1_000, now: '2026-06-04T10:00:00.000Z' });

  expect(await verifyPin('1234', lock)).toBe(true);
  expect(await verifyPin('9999', lock)).toBe(false);
  expect(JSON.stringify(lock)).not.toContain('1234');
  expect(lock).toMatchObject({ algorithm: 'PBKDF2-SHA-256', iterations: 1_000, keyLengthBits: 256 });
});

it('round-trips harmless AES-GCM payloads with Web Crypto helpers', async () => {
  const lock = await createPinLock('2468', { iterations: 1_000 });
  const key = await deriveAesGcmKeyFromPassphrase('harmless test passphrase', lock.saltBase64, 1_000);
  const encrypted = await encryptSensitiveProfilePayload('harmless fixture only', key, '2026-06-04T10:00:00.000Z');

  expect(encrypted.algorithm).toBe('AES-GCM');
  expect(encrypted.ciphertextBase64).not.toContain('harmless fixture only');
  await expect(decryptSensitiveProfilePayload(encrypted, key)).resolves.toBe('harmless fixture only');
});

it('documents biometric and privacy-gated sensitive features as deferred', () => {
  expect(BIOMETRIC_UNLOCK_EVALUATION.status).toBe('deferred');
  expect(BIOMETRIC_UNLOCK_EVALUATION.summary).toMatch(/WebAuthn|PublicKeyCredential/i);

  const gateIds = PRIVACY_GATED_LOCAL_PROFILE_FEATURES.map((feature) => feature.id);
  expect(gateIds).toEqual(['competence-records', 'personal-equipment', 'availability', 'calendar-integration', 'multiple-profiles']);
  expect(PRIVACY_GATED_LOCAL_PROFILE_FEATURES.every((feature) => feature.enabled === false && feature.status === 'privacy-review-required')).toBe(true);
});

it('stores, reads and deletes local profile and sanitized competence reminders from localStorage', () => {
  const storage = new MemoryStorage();
  const saved = saveLocalProfile({ profileEnabled: true, displayName: 'Lokal', callsign: 'Delta', preferredRole: 'mannskap' }, storage, '2026-06-04T10:00:00.000Z');
  addCompetenceReminder({ label: 'Førstehjelp <ID 123>', expiresOn: '2026-12-31' }, storage, '2026-06-04T10:00:00.000Z');

  expect(saved.callsign).toBe('Delta');
  expect(readLocalProfile(storage)?.preferredRole).toBe('mannskap');
  expect(readCompetenceReminders(storage)[0]).toMatchObject({ label: 'Førstehjelp ID 123', expiresOn: '2026-12-31' });
  addCompetenceReminder({ label: 'Ugyldig dato', expiresOn: '2026-02-31' }, storage, '2026-06-04T10:00:00.000Z');
  expect(readCompetenceReminders(storage).map((reminder) => reminder.label)).not.toContain('Ugyldig dato');

  deleteLocalProfile(storage);
  expect(readLocalProfile(storage)).toBeNull();
  expect(readCompetenceReminders(storage)).toEqual([]);
  expect(storage.getItem(LOCAL_PROFILE_STORAGE_KEY)).toBeNull();
});

it('uses safe retention defaults and clamps local retention settings without deleting data', () => {
  const storage = new MemoryStorage();
  expect(readRetentionSettings(storage)).toEqual(DEFAULT_RETENTION_SETTINGS);

  const saved = saveRetentionSettings({ missionRetentionDays: -10, archiveRetentionDays: 9000, profileRetentionDays: 45, auditRetentionDays: Number.NaN }, storage, '2026-06-04T10:00:00.000Z');

  expect(saved).toMatchObject({ missionRetentionDays: 1, archiveRetentionDays: 3650, profileRetentionDays: 45, auditRetentionDays: DEFAULT_RETENTION_SETTINGS.auditRetentionDays });
  expect(storage.values.size).toBe(1);
});

it('sanitizes and caps local audit log export', () => {
  const storage = new MemoryStorage();
  for (let index = 0; index < MAX_AUDIT_ENTRIES + 5; index += 1) {
    appendLocalAuditEntry('export-created', {
      missionId: `mission-${index}`,
      exportKind: 'field-log-json',
      title: 'Hemmelig tittel skal ikke eksporteres',
      locationText: 'privat lokasjon',
      count: index,
    }, `2026-06-04T10:${String(index % 60).padStart(2, '0')}:00.000Z`, storage);
  }

  const log = readLocalAuditLog(storage);
  const exported = exportLocalAuditLog(storage, '2026-06-04T12:00:00.000Z');

  expect(log).toHaveLength(MAX_AUDIT_ENTRIES);
  expect(JSON.parse(storage.getItem(LOCAL_AUDIT_LOG_STORAGE_KEY) ?? '[]')).toHaveLength(MAX_AUDIT_ENTRIES);
  expect(exported).toContain('Sanitert lokal auditlogg');
  expect(exported).toContain('field-log-json');
  expect(exported).not.toMatch(/Hemmelig|privat lokasjon|locationText|title/i);

  resetLocalAuditLog(storage);
  expect(readLocalAuditLog(storage)).toEqual([]);
});

it('defaults mode to innsats and accepts only valid modes', () => {
  expect(sanitizeLocalProfile({}).mode).toBe('innsats');
  expect(sanitizeLocalProfile({ mode: 'personlig' }).mode).toBe('personlig');
  expect(sanitizeLocalProfile({ mode: 'bogus' }).mode).toBe('innsats');
});
