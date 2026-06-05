export const FIELD_MODE_STORAGE_KEY = 'beredskapsboka:field-mode:v1';
export const FIELD_FEEDBACK_STORAGE_KEY = 'beredskapsboka:field-feedback:v1';
export const FIELD_MODE_STORAGE_EVENT = 'beredskapsboka:field-mode-changed';

export const MIN_TOUCH_TARGET_PX = 48;
export const GLOVE_TOUCH_TARGET_PX = 64;
export const FIELD_SCROLLING_RECOMMENDATIONS = [
  'Bruk tydelige kort med luft mellom handlinger for å redusere feiltrykk i regn og med hansker.',
  'Hold kritiske handlinger innen én vertikal scrollflate og unngå horisontal sveip som eneste navigasjon.',
  'Gi scrollbare områder ekstra padding nederst slik at bunnnavigasjon og våte hansker ikke skjuler siste valg.',
] as const;

export type FieldModeTheme = 'day' | 'night' | 'reduced-blue';

export interface FieldModeSettings {
  enabled: boolean;
  gloveMode: boolean;
  theme: FieldModeTheme;
  outdoorReadabilityReviewed: boolean;
}

export const DEFAULT_FIELD_MODE_SETTINGS: FieldModeSettings = {
  enabled: false,
  gloveMode: false,
  theme: 'day',
  outdoorReadabilityReviewed: false,
};

export const FIELD_MODE_THEMES: Array<{ value: FieldModeTheme; label: string; description: string }> = [
  { value: 'day', label: 'Dag / utendørs', description: 'Høy kontrast på lys bakgrunn for dagslys og refleks.' },
  { value: 'night', label: 'Natt', description: 'Mørk flate med dempet kontrast for nattbruk.' },
  { value: 'reduced-blue', label: 'Redusert blått lys', description: 'Varm, redusert blå variant for nattvakt der mørk modus ikke er nok.' },
];

export const QUICK_ACTIONS = [
  { id: 'map', label: 'Kart', href: '/kart', helpText: 'Åpner lokal skjematisk kartflate med markører, sektorer og kartlogg.' },
  { id: 'quick-log', label: 'Hurtiglogg', href: '/oppdrag#hurtiglogg', helpText: 'Åpner rask lokal loggføring på aktiv oppdragstavle.' },
  { id: 'active-mission', label: 'Aktivt oppdrag', href: '/oppdrag', helpText: 'Åpner mission dashboard med status, kart/logg og sjekkliste.' },
  { id: 'run-checklist', label: 'Kjør sjekkliste', href: '/oppdrag#sjekkliste', helpText: 'Åpner anbefalt lokal sjekkliste for aktivt oppdrag.' },
  { id: 'five-point-order', label: '5-punktsordre', href: '/oppdrag#5-punktsordre', helpText: 'Åpner lokal 5-punktsordre-mal.' },
  { id: 'comms-plan', label: 'Sambandsplan', href: '/oppdrag#sambandsplan', helpText: 'Åpner lokal sambandsplan-mal uten sensitive lister.' },
  { id: 'export-status', label: 'Eksporter status', href: '/oppdrag#statusrapport', helpText: 'Åpner lokal statusrapport/eksport. Ikke offisiell innsending.' },
  { id: 'search', label: 'Søk', href: '/sok#stress-search', helpText: 'Åpner lokalt søk i tiltak, kilder og moduler.' },
] as const;

export const VOICE_INPUT_EVALUATION = {
  decision: 'optional-deferred-fallback-only',
  supportedInterfaces: ['SpeechRecognition', 'webkitSpeechRecognition'],
  browserSupportSummary: 'Web Speech API er ikke likt støttet i alle nettlesere. Typisk støtte finnes i Chromium-baserte nettlesere, mens Firefox/Safari kan mangle eller avvike.',
  accuracyWarning: 'Diktering kan feiltolke fagord, stedsnavn, tall, kanaler og norske dialekter. Les alltid gjennom og rett før lagring eller eksport.',
  privacyWarning: 'Beredskapsboka tar ikke opp lyd og laster ikke opp opptak. Nettleserens egen Web Speech-funksjon kan likevel bruke leverandørtjenester avhengig av nettleser/OS; bruk bare etter lokal vurdering og ikke dikter persondata, pasientdata, private lokasjoner eller skjermet operativ informasjon.',
  fallback: 'Tastatur, systemdiktering på enheten eller manuell kortnotat er alltid fallback. Voice er valgfritt og skal ikke være eneste måte å registrere notat på.',
  noRecordingUploadByApp: true,
} as const;

export const FIELD_TESTING_PROCESS = {
  title: 'Feltprøving med mannskaper',
  localOnlyScope: 'Prosessen beskriver test og lokal tilbakemelding. Den etablerer ingen backend, synk, personregister eller offisiell innsending.',
  steps: [
    'Gjennomfør kort scenario med regn-/hanske-/nattforhold og offline nettleser.',
    'Observer om mannskap finner Oppdrag, Feltmodus, sjekkliste, 5-punktsordre, sambandsplan, eksport og søk uten forklaring.',
    'Kontroller at alle nye feltmodus-handlinger har minst 48x48 px berøringsmål og at hanskemodus gir ekstra store mål.',
    'Samle kun lokal, anonymisert UX-tilbakemelding uten navn, ID, pasientdata eller skjermet operativ informasjon.',
    'Triager funn lokalt i produktbacklogg før eventuell ny feltprøve.',
  ],
  feedbackFields: ['conditions', 'observations', 'blockers', 'suggestedChange'],
} as const;

export interface FieldFeedbackEntry {
  id: string;
  createdAt: string;
  conditions: string;
  observations: string;
  blockers: string;
  suggestedChange: string;
}

export interface FieldFeedbackDraft {
  conditions?: unknown;
  observations?: unknown;
  blockers?: unknown;
  suggestedChange?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function asTheme(value: unknown, fallback: FieldModeTheme): FieldModeTheme {
  return value === 'day' || value === 'night' || value === 'reduced-blue' ? value : fallback;
}

export function normalizeFieldModeSettings(input: unknown): FieldModeSettings {
  if (!isRecord(input)) return { ...DEFAULT_FIELD_MODE_SETTINGS };
  return {
    enabled: asBoolean(input.enabled, DEFAULT_FIELD_MODE_SETTINGS.enabled),
    gloveMode: asBoolean(input.gloveMode, DEFAULT_FIELD_MODE_SETTINGS.gloveMode),
    theme: asTheme(input.theme, DEFAULT_FIELD_MODE_SETTINGS.theme),
    outdoorReadabilityReviewed: asBoolean(input.outdoorReadabilityReviewed, DEFAULT_FIELD_MODE_SETTINGS.outdoorReadabilityReviewed),
  };
}

export function parseFieldModeSettings(serialized: string | null | undefined): FieldModeSettings {
  if (!serialized) return { ...DEFAULT_FIELD_MODE_SETTINGS };
  try {
    return normalizeFieldModeSettings(JSON.parse(serialized));
  } catch {
    return { ...DEFAULT_FIELD_MODE_SETTINGS };
  }
}

export function serializeFieldModeSettings(settings: FieldModeSettings): string {
  return JSON.stringify(normalizeFieldModeSettings(settings));
}

function getBrowserLocalStorage(): Storage | undefined {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return undefined;
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readFieldModeSettings(storage?: Pick<Storage, 'getItem'>): FieldModeSettings {
  try {
    return parseFieldModeSettings((storage ?? getBrowserLocalStorage())?.getItem(FIELD_MODE_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_FIELD_MODE_SETTINGS };
  }
}

export function writeFieldModeSettings(settings: FieldModeSettings, storage?: Pick<Storage, 'setItem'>): FieldModeSettings {
  const normalized = normalizeFieldModeSettings(settings);
  try {
    (storage ?? getBrowserLocalStorage())?.setItem(FIELD_MODE_STORAGE_KEY, serializeFieldModeSettings(normalized));
  } catch {
    // Field mode is an offline convenience. Locked-down/private browsers must not crash the UI.
  }
  return normalized;
}

type SpeechWindow = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

export function hasWebSpeechRecognitionSupport(scope?: SpeechWindow): boolean {
  const target = scope ?? (typeof window === 'undefined' ? undefined : (window as unknown as SpeechWindow));
  return Boolean(target?.SpeechRecognition || target?.webkitSpeechRecognition);
}

export function sanitizeFieldFeedbackText(value: unknown, maxLength = 700): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[fjernet e-post]')
    .replace(/(?:\+?\d[\s.-]?){7,}\d/g, '[fjernet telefon]')
    .replace(/\b(?:fnr|fødselsnummer|personnummer|pasient|journal)\b/gi, '[fjernet sensitivt ord]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function createFieldFeedbackEntry(draft: Partial<FieldFeedbackDraft>, now = new Date(), id = `field-feedback-${now.getTime()}`): FieldFeedbackEntry {
  return {
    id: sanitizeFieldFeedbackText(id, 120) || `field-feedback-${now.getTime()}`,
    createdAt: now.toISOString(),
    conditions: sanitizeFieldFeedbackText(draft.conditions),
    observations: sanitizeFieldFeedbackText(draft.observations),
    blockers: sanitizeFieldFeedbackText(draft.blockers),
    suggestedChange: sanitizeFieldFeedbackText(draft.suggestedChange),
  };
}

export function parseFieldFeedbackEntries(serialized: string | null | undefined): FieldFeedbackEntry[] {
  if (!serialized) return [];
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecord)
      .flatMap((entry) => {
        const createdAt = new Date(typeof entry.createdAt === 'string' ? entry.createdAt : Date.now());
        if (!Number.isFinite(createdAt.getTime())) return [];
        return [createFieldFeedbackEntry({
          conditions: entry.conditions,
          observations: entry.observations,
          blockers: entry.blockers,
          suggestedChange: entry.suggestedChange,
        }, createdAt, typeof entry.id === 'string' ? entry.id : undefined)];
      })
      .slice(-25);
  } catch {
    return [];
  }
}

export function readFieldFeedbackEntries(storage?: Pick<Storage, 'getItem'>): FieldFeedbackEntry[] {
  try {
    return parseFieldFeedbackEntries((storage ?? getBrowserLocalStorage())?.getItem(FIELD_FEEDBACK_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function appendFieldFeedbackEntry(entry: FieldFeedbackEntry, storage?: Pick<Storage, 'getItem' | 'setItem'>): FieldFeedbackEntry[] {
  const next = [...readFieldFeedbackEntries(storage), entry].slice(-25);
  try {
    (storage ?? getBrowserLocalStorage())?.setItem(FIELD_FEEDBACK_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory result for this render; do not crash if local storage is unavailable/full.
  }
  return next;
}
