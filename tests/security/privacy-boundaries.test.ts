import fs from 'node:fs';
import path from 'node:path';
import { afterEach, vi } from 'vitest';
import { GET as geocodeGet } from '@/app/api/context/geocode/route';
import { GET as hazardsGet } from '@/app/api/context/hazards/route';
import { GET as weatherGet } from '@/app/api/context/weather/route';
import { getActionCards, getChecklists, getGlossaryTerms, getProtectionMeasures, getSourceDocuments, getTrainingPaths } from '@/lib/content/load-content';
import { containsSensitiveStructuredKey, sensitiveFieldNames } from '@/lib/content/source-policy';
import { guardAllowedQuery } from '@/lib/integrations/route-guards';
import { ChecklistRunSchema, FieldLogEntrySchema, MissionContextSchema } from '@/lib/mission/schemas';

const sensitiveSchemaFieldNames = sensitiveFieldNames.filter((field) => !['url', 'upstream'].includes(field));
const forbiddenProxyParams = ['url', 'upstream', 'proxy', 'target', 'href'];

afterEach(() => {
  vi.unstubAllGlobals();
});

function generatedContent() {
  return [
    ...getActionCards(),
    ...getChecklists(),
    ...getGlossaryTerms(),
    ...getProtectionMeasures(),
    ...getSourceDocuments(),
    ...getTrainingPaths(),
  ];
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

function collectStrings(value: unknown, strings: string[] = []) {
  if (typeof value === 'string') strings.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, strings));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, strings));
  return strings;
}

function repoTextFor(paths: string[]) {
  return paths.map((relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')).join('\n');
}

function isRealisticNorwegianNationalIdentityNumber(candidate: string) {
  const digits = candidate.split('').map(Number);
  let day = Number(candidate.slice(0, 2));
  let month = Number(candidate.slice(2, 4));
  const year = Number(candidate.slice(4, 6));
  if (day > 40) day -= 40; // D-number date offset.
  if (month > 40) month -= 40; // H-number month offset.
  if (day < 1 || day > 31 || month < 1 || month > 12) return false;
  const fullYear = year <= 39 ? 2000 + year : 1900 + year;
  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (date.getUTCFullYear() !== fullYear || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  const k1Weights = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  const k2Weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const calc = (weights: number[]) => {
    const remainder = weights.reduce((sum, weight, index) => sum + weight * digits[index], 0) % 11;
    const control = 11 - remainder;
    return control === 11 ? 0 : control;
  };
  const k1 = calc(k1Weights);
  if (k1 === 10 || k1 !== digits[9]) return false;
  const k2 = calc(k2Weights);
  return k2 !== 10 && k2 === digits[10];
}

it('does not publish sensitive structured fields in generated MVP content', () => {
  const content = generatedContent();
  const keys = collectKeys(content);
  const policyHits = containsSensitiveStructuredKey(content);

  expect(policyHits, `source policy found sensitive keys: ${policyHits.join(', ')}`).toEqual([]);
  for (const key of sensitiveFieldNames) {
    expect(keys.has(key), `generated content exposes banned key: ${key}`).toBe(false);
  }
  const nationalIds = collectStrings(content)
    .flatMap((text) => text.match(/\b\d{11}\b/g) ?? [])
    .filter(isRealisticNorwegianNationalIdentityNumber);
  expect(nationalIds, 'generated content must not contain raw Norwegian national identity numbers').toEqual([]);

  const leakedLocalPaths = collectStrings(content).filter((text) => /\/Users\/|[A-Za-z]:\\\\Users\\\\|Hvelvet|Projectos\/Beredskapsboka/.test(text));
  expect(leakedLocalPaths, 'generated content must not expose local filesystem paths or vault names').toEqual([]);
});

it('keeps MVP schemas free of sensitive scope-creep fields', () => {
  const schemaText = repoTextFor([
    'lib/content/schemas.ts',
    'lib/mission/schemas.ts',
    'lib/integrations/types.ts',
  ]);

  for (const field of sensitiveSchemaFieldNames) {
    expect(schemaText, `schema code exposes banned field: ${field}`).not.toContain(field);
  }
});

it('normalizes sensitive structured field variants before matching', () => {
  const hits = containsSensitiveStructuredKey({
    PatientName: 'Ola',
    patient_name: 'Ola',
    fnr: '01010112345',
    fødselsnr: '01010112345',
    fodselsnummer: '01010112345',
    tracking_device_id: 'tracker-1',
    phoneNumber: '+471****5678',
  });

  expect(hits).toEqual(expect.arrayContaining(['PatientName', 'patient_name', 'fnr', 'fødselsnr', 'fodselsnummer', 'tracking_device_id', 'phoneNumber']));
});

it('rejects patient-identifying fields in local mission and checklist/log schemas', () => {
  const now = '2026-06-03T12:00:00.000Z';
  const mission = {
    id: 'mission-1',
    title: 'Lokal støtte',
    createdAt: now,
    updatedAt: now,
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Kun område',
    externalSignals: [],
    activeChecklistIds: [],
    notes: '',
    contentVersion: 'test',
    schemaVersion: 1,
  };
  for (const field of ['patientName', 'patientId', 'fødselsnummer', 'phoneNumber', 'medicalRecordNumber']) {
    expect(MissionContextSchema.safeParse({ ...mission, [field]: 'forbudt' }).success, `mission accepted ${field}`).toBe(false);
  }

  const checklistRun = {
    id: 'run-1',
    missionId: 'mission-1',
    templateSlug: 'checklist-1',
    checkedItemIds: [],
    notesByItemId: {},
    updatedAt: now,
    schemaVersion: 1,
  };
  for (const field of ['patientName', 'patientId', 'fødselsnummer', 'phoneNumber', 'medicalRecordNumber']) {
    expect(ChecklistRunSchema.safeParse({ ...checklistRun, [field]: 'forbudt' }).success, `checklist/log accepted ${field}`).toBe(false);
  }
});

it('does not accept true map coordinates or external geometry in field-log map references', () => {
  const baseEntry = {
    id: 'entry-map-privacy',
    timestamp: '2026-06-04T10:00:00.000Z',
    category: 'observasjon',
    text: 'Lokal observasjon',
  };

  expect(FieldLogEntrySchema.safeParse({
    ...baseEntry,
    mapReference: { source: 'map-marker', objectId: 'marker-1', label: 'OK', point: { x: 50, y: 50 } },
  }).success).toBe(true);
  expect(FieldLogEntrySchema.safeParse({
    ...baseEntry,
    mapReference: { source: 'map-marker', objectId: 'marker-1', label: 'Lat lon', point: { lat: 63.4305, lon: 10.3951 } },
  }).success).toBe(false);
});

it('documents local retention, browser-offline threat model, governance, post-MVP security, DPIA, and source-publication policies', () => {
  const docs = [
    'docs/privacy-retention.md',
    'docs/threat-model-browser-offline.md',
    'docs/governance-gates.md',
    'docs/post-mvp-security-architecture.md',
    'docs/dpia-checklist.md',
    'docs/source-publication-policy.md',
  ];
  for (const doc of docs) {
    const text = fs.readFileSync(path.join(process.cwd(), doc), 'utf8');
    expect(text.length, `${doc} should be specific enough`).toBeGreaterThan(700);
  }

  expect(repoTextFor(['docs/privacy-retention.md'])).toMatch(/IndexedDB|localStorage|slett/i);
  expect(repoTextFor(['docs/threat-model-browser-offline.md'])).toMatch(/offline|nettleser|trussel|tiltak/i);
  expect(repoTextFor(['docs/governance-gates.md'])).toMatch(/auth|sync|push|live tracking|backend storage/i);
  expect(repoTextFor(['docs/post-mvp-security-architecture.md'])).toMatch(/før delt backend|security architecture|autentisering|logging/i);
  expect(repoTextFor(['docs/dpia-checklist.md'])).toMatch(/DPIA|personvernkonsekvensvurdering|persondata/i);
  expect(repoTextFor(['docs/source-publication-policy.md'])).toMatch(/statisk|generert|private\/skjermede tilfluktsrom|persondata/i);
});

it('rejects generic upstream URL proxy parameters before adapter fetches', async () => {
  for (const key of forbiddenProxyParams) {
    const params = new URLSearchParams([[key, 'https://example.invalid/payload']]);
    expect(guardAllowedQuery(params, ['q']).ok, `${key} should be rejected`).toBe(false);
  }

  const fetchMock = vi.fn(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);

  const routes = [
    { name: 'geocode', get: geocodeGet, baseUrl: 'http://localhost/api/context/geocode', validQuery: 'q=Trondheim' },
    { name: 'weather', get: weatherGet, baseUrl: 'http://localhost/api/context/weather', validQuery: 'lat=63.43&lon=10.39' },
    { name: 'hazards', get: hazardsGet, baseUrl: 'http://localhost/api/context/hazards', validQuery: 'municipality=5001' },
  ];
  for (const route of routes) {
    for (const key of forbiddenProxyParams) {
      const response = await route.get(new Request(`${route.baseUrl}?${route.validQuery}&${key}=https://example.invalid/payload`));
      expect(response.status, `${route.name} should reject ${key}`).toBe(400);
      const body = await response.json();
      expect(body.error, `${route.name} should reject ${key} with guard error`).toMatch(/Generic proxy parameter rejected/i);
    }
  }
  expect(fetchMock).not.toHaveBeenCalled();
});
