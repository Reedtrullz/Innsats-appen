export type SensitiveTextMatch = {
  kind: 'national-id' | 'patient-reference' | 'shielded-location' | 'private-location' | 'contact-reference';
};

/**
 * Field-level UI copy per detection category, so a blocked input can say what
 * triggered and what to do instead of a generic persondata warning. Display
 * only — never stored, never echoes the matched input.
 */
export const SENSITIVE_TEXT_EXPLANATIONS: Record<SensitiveTextMatch['kind'], { label: string; remedy: string }> = {
  'national-id': {
    label: 'tallrekke som ligner fødselsnummer/personnummer',
    remedy: 'Fjern tallrekken. Persondata skal bare i ordinære systemer.',
  },
  'contact-reference': {
    label: 'telefonnummer eller e-postadresse',
    remedy: 'Fjern kontaktinformasjonen — persondata skal ikke lagres her. Bruk rolle eller kallesignal.',
  },
  'patient-reference': {
    label: 'tekst som ligner pasientnavn eller pasient-ID',
    remedy: 'Beskriv uten navn eller ID, f.eks. «én skadet person». Pasientdata skal bare i ordinært system.',
  },
  // NB: this copy is checked against the detector itself (see
  // free-text-privacy-guards tests) — phrasing must not trip the patterns.
  'shielded-location': {
    label: 'tekst som beskriver skjermet operativ informasjon',
    remedy: 'Ikke registrer dette lokalt; bruk ordinære systemer.',
  },
  'private-location': {
    label: 'tekst som peker på privatpersoners adresse eller bosted',
    remedy: 'Bruk offentlige stedsnavn eller skjematiske referanser — ikke persondata.',
  },
};

export function sensitiveTextFieldError(kind: SensitiveTextMatch['kind']): string {
  const explanation = SENSITIVE_TEXT_EXPLANATIONS[kind];
  return `Stoppet: ${explanation.label}. ${explanation.remedy}`;
}

/**
 * High-confidence structured identifiers (fødselsnummer, phone, e-mail) stay
 * hard-blocked. The fuzzy text heuristics can false-positive on legitimate
 * operational text (place names, "pasient"-phrasings), and a false positive
 * must never strand a user mid-incident — those kinds can be saved locally
 * after an explicit confirmation. Export-time guards are unaffected.
 */
const OVERRIDABLE_SENSITIVE_KINDS: ReadonlySet<SensitiveTextMatch['kind']> = new Set([
  'patient-reference',
  'shielded-location',
  'private-location',
]);

export function isOverridableSensitiveTextKind(kind: SensitiveTextMatch['kind']): boolean {
  return OVERRIDABLE_SENSITIVE_KINDS.has(kind);
}

export function sensitiveTextFieldWarning(kind: SensitiveTextMatch['kind']): string {
  const explanation = SENSITIVE_TEXT_EXPLANATIONS[kind];
  return `Advarsel: ${explanation.label}. ${explanation.remedy} Er dette en feiltolkning, kan du bekrefte og lagre likevel.`;
}

export class SensitiveTextError extends Error {
  readonly kind: SensitiveTextMatch['kind'];
  readonly context: string;

  constructor(kind: SensitiveTextMatch['kind'], context: string) {
    super(`Local operational text rejected at ${context}: possible persondata/pasientdata/skjermet/private-location risk (${kind}).`);
    this.name = 'SensitiveTextError';
    this.kind = kind;
    this.context = context;
  }
}

const NATIONAL_ID_PATTERN = /(?:^|[^\p{L}\p{N}])(?:fødselsnummer|fodselsnummer|personnummer|fnr)(?![\p{L}\p{N}])[^\d]{0,30}\d(?:\D?\d){10}(?!\d)/iu;
const BARE_DIGIT_SEQUENCE_PATTERN = /(?<!\d)(\d(?:[\s.-]?\d){10})(?!\d)/gu;
const EMAIL_PATTERN = /(?:^|[^\p{L}\p{N}_-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![\p{L}\p{N}_-])/iu;
const PHONE_PATTERN = /(?:^|[^\d])\+47\s*(?:\d[\s.-]?){8}(?!\d)/u;
const PATIENT_NAME_PATTERN = /(?:^|[^\p{L}])(?:[Pp][Aa][Ss][Ii][Ee][Nn][Tt]|[Pp][Aa][Tt][Ii][Ee][Nn][Tt])(?![\p{L}])\s*[:#-]?\s+(?:\p{Lu}[\p{L}'-]{1,}\s+){1,3}\p{Lu}[\p{L}'-]{1,}/u;
const PATIENT_IDENTIFIER_PATTERN = /(?:^|[^\p{L}])(?:pasient|patient)(?![\p{L}])[^\p{L}\p{N}]{0,20}(?:(?:id|nr|nummer|#)\s*)?[A-ZÆØÅ]?\d{3,}(?!\d)/iu;
const SHIELDED_LOCATION_PATTERN = /(?:^|[^\p{L}])skjermet(?![\p{L}])(?:[^\p{L}\p{N}]+[\p{L}\p{N}]+){0,6}[^\p{L}\p{N}]+(?:adresse|tilfluktsrom|lokasjon|posisjon|privat)(?![\p{L}])/iu;
const PRIVATE_LOCATION_PATTERN = /(?:^|[^\p{L}])(?:privat\s+(?:adresse|lokasjon|posisjon|bosted|bolig)|(?:private\s+(?:address|location)|(?:adresse|lokasjon|posisjon)\s+(?:til\s+)?privat(?:person)?))(?![\p{L}])/iu;

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function mod11ControlDigit(digits: string, weights: number[]) {
  const remainder = digits
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (weights[index] ?? 0), 0) % 11;
  const control = 11 - remainder;
  if (control === 11) return 0;
  return control === 10 ? null : control;
}

function isValidNorwegianNationalId(rawDigits: string) {
  const digits = digitsOnly(rawDigits);
  if (!/^\d{11}$/.test(digits)) return false;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const normalizedDay = day > 40 ? day - 40 : day;
  if (normalizedDay < 1 || normalizedDay > 31 || month < 1 || month > 12) return false;

  const first = mod11ControlDigit(digits.slice(0, 9), [3, 7, 6, 1, 8, 9, 4, 5, 2]);
  if (first === null || first !== Number(digits[9])) return false;
  const second = mod11ControlDigit(digits.slice(0, 10), [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]);
  return second !== null && second === Number(digits[10]);
}

function containsValidNorwegianNationalId(value: string) {
  BARE_DIGIT_SEQUENCE_PATTERN.lastIndex = 0;
  for (const match of value.matchAll(BARE_DIGIT_SEQUENCE_PATTERN)) {
    if (match[1] && isValidNorwegianNationalId(match[1])) return true;
  }
  return false;
}

function normalizeText(value: string): string {
  return value.normalize('NFKC');
}

export function detectSensitiveOperationalText(value: string): SensitiveTextMatch | null {
  const normalized = normalizeText(value);
  if (NATIONAL_ID_PATTERN.test(normalized) || containsValidNorwegianNationalId(normalized)) return { kind: 'national-id' };
  if (EMAIL_PATTERN.test(normalized) || PHONE_PATTERN.test(normalized)) return { kind: 'contact-reference' };
  if (PATIENT_NAME_PATTERN.test(normalized) || PATIENT_IDENTIFIER_PATTERN.test(normalized)) return { kind: 'patient-reference' };
  if (SHIELDED_LOCATION_PATTERN.test(normalized)) return { kind: 'shielded-location' };
  if (PRIVATE_LOCATION_PATTERN.test(normalized)) return { kind: 'private-location' };
  return null;
}

export function assertNoSensitiveOperationalText(value: string | undefined | null, context: string): void {
  if (value === undefined || value === null || value.trim() === '') return;
  const match = detectSensitiveOperationalText(value);
  if (!match) return;
  throw new SensitiveTextError(match.kind, context);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Non-throwing recursive scan. Returns the first finding with its context
 * path so the UI can anchor the error to the offending field.
 */
export function findSensitiveOperationalTextInValue(
  value: unknown,
  context = 'value',
  seen = new WeakSet<object>(),
): { context: string; kind: SensitiveTextMatch['kind'] } | null {
  if (typeof value === 'string') {
    if (value.trim() === '') return null;
    const match = detectSensitiveOperationalText(value);
    return match ? { context, kind: match.kind } : null;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return null;
    seen.add(value);
    for (const [index, item] of value.entries()) {
      const found = findSensitiveOperationalTextInValue(item, `${context}[${index}]`, seen);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  if (seen.has(value)) return null;
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    const found = findSensitiveOperationalTextInValue(nested, context ? `${context}.${key}` : key, seen);
    if (found) return found;
  }
  return null;
}

export function assertNoSensitiveOperationalTextInValue(value: unknown, context = 'value', seen = new WeakSet<object>()): void {
  const found = findSensitiveOperationalTextInValue(value, context, seen);
  if (found) throw new SensitiveTextError(found.kind, found.context);
}
