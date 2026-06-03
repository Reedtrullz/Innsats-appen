import fs from 'node:fs';
import path from 'node:path';
import { afterEach, vi } from 'vitest';
import { GET as geocodeGet } from '@/app/api/context/geocode/route';
import { GET as hazardsGet } from '@/app/api/context/hazards/route';
import { GET as weatherGet } from '@/app/api/context/weather/route';
import { getActionCards, getChecklists, getGlossaryTerms, getProtectionMeasures, getSourceDocuments, getTrainingPaths } from '@/lib/content/load-content';
import { containsSensitiveStructuredKey, sensitiveFieldNames } from '@/lib/content/source-policy';
import { guardAllowedQuery } from '@/lib/integrations/route-guards';

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
    phoneNumber: '+4712345678',
  });

  expect(hits).toEqual(expect.arrayContaining(['PatientName', 'patient_name', 'fnr', 'fødselsnr', 'fodselsnummer', 'tracking_device_id', 'phoneNumber']));
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
