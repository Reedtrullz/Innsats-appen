export type SensitiveTextMatch = {
  kind: 'national-id' | 'patient-reference' | 'shielded-location' | 'private-location';
};

const NATIONAL_ID_PATTERN = /(?:^|[^\p{L}\p{N}])(?:fødselsnummer|fodselsnummer|personnummer|fnr)(?![\p{L}\p{N}])[^\d]{0,30}\d(?:\D?\d){10}(?!\d)/iu;
const PATIENT_NAME_PATTERN = /(?:^|[^\p{L}])(?:[Pp][Aa][Ss][Ii][Ee][Nn][Tt]|[Pp][Aa][Tt][Ii][Ee][Nn][Tt])(?![\p{L}])\s*[:#-]?\s+(?:\p{Lu}[\p{L}'-]{1,}\s+){1,3}\p{Lu}[\p{L}'-]{1,}/u;
const PATIENT_IDENTIFIER_PATTERN = /(?:^|[^\p{L}])(?:pasient|patient)(?![\p{L}])[^\p{L}\p{N}]{0,20}(?:(?:id|nr|nummer|#)\s*)?[A-ZÆØÅ]?\d{3,}(?!\d)/iu;
const SHIELDED_LOCATION_PATTERN = /(?:^|[^\p{L}])skjermet(?![\p{L}])(?:[^\p{L}\p{N}]+[\p{L}\p{N}]+){0,6}[^\p{L}\p{N}]+(?:adresse|tilfluktsrom|lokasjon|posisjon|privat)(?![\p{L}])/iu;
const PRIVATE_LOCATION_PATTERN = /(?:^|[^\p{L}])(?:privat\s+(?:adresse|lokasjon|posisjon|bosted|bolig)|(?:private\s+(?:address|location)|(?:adresse|lokasjon|posisjon)\s+(?:til\s+)?privat(?:person)?))(?![\p{L}])/iu;

function normalizeText(value: string): string {
  return value.normalize('NFKC');
}

export function detectSensitiveOperationalText(value: string): SensitiveTextMatch | null {
  const normalized = normalizeText(value);
  if (NATIONAL_ID_PATTERN.test(normalized)) return { kind: 'national-id' };
  if (PATIENT_NAME_PATTERN.test(normalized) || PATIENT_IDENTIFIER_PATTERN.test(normalized)) return { kind: 'patient-reference' };
  if (SHIELDED_LOCATION_PATTERN.test(normalized)) return { kind: 'shielded-location' };
  if (PRIVATE_LOCATION_PATTERN.test(normalized)) return { kind: 'private-location' };
  return null;
}

export function assertNoSensitiveOperationalText(value: string | undefined | null, context: string): void {
  if (value === undefined || value === null || value.trim() === '') return;
  const match = detectSensitiveOperationalText(value);
  if (!match) return;
  throw new Error(
    `Local operational text rejected at ${context}: possible persondata/pasientdata/skjermet/private-location risk (${match.kind}).`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertNoSensitiveOperationalTextInValue(value: unknown, context = 'value', seen = new WeakSet<object>()): void {
  if (typeof value === 'string') {
    assertNoSensitiveOperationalText(value, context);
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    value.forEach((item, index) => assertNoSensitiveOperationalTextInValue(item, `${context}[${index}]`, seen));
    return;
  }
  if (!isRecord(value)) return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    assertNoSensitiveOperationalTextInValue(nested, context ? `${context}.${key}` : key, seen);
  }
}
