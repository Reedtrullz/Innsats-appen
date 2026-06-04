import { expect, it } from 'vitest';
import {
  FIELD_LOG_CATEGORIES,
  FIELD_LOG_CATEGORY_OPTIONS,
  FIELD_LOG_PATIENT_DATA_WARNING,
  exportFieldLogJson,
  exportFieldLogMarkdown,
  exportFieldLogPdfReadyHtml,
  filterFieldLogEntries,
  sortFieldLogEntries,
} from '@/lib/mission/field-log';
import { FieldLogEntrySchema, MissionContextSchema, type FieldLogEntry, type MissionContext } from '@/lib/mission/schemas';

const baseMission: MissionContext = MissionContextSchema.parse({
  id: 'field-log-mission',
  title: 'FIG lokal feltlogg',
  createdAt: '2026-06-04T08:00:00.000Z',
  updatedAt: '2026-06-04T09:00:00.000Z',
  phase: 'under',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Innsatsområde nord',
  externalSignals: [],
  activeChecklistIds: [],
  notes: '',
  tasks: [],
  statusLog: [],
  resourceRequests: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
});

const entries: FieldLogEntry[] = [
  {
    id: 'entry-late',
    timestamp: '2026-06-04T09:20:00.000Z',
    locationText: 'Depot nord',
    category: 'ressursbehov',
    text: 'Behov for ekstra lysmast',
    linkedMissionId: 'field-log-mission',
    criticalObservation: false,
    mustBeForwarded: true,
  },
  {
    id: 'entry-early',
    timestamp: '2026-06-04T09:05:00.000Z',
    locationText: 'Sperrepunkt A',
    category: 'observasjon',
    text: 'Vannstand stiger ved bekk',
    criticalObservation: true,
    mustBeForwarded: false,
  },
];

it('adds structured field log schemas with safe defaults for old mission objects', () => {
  const oldMission = MissionContextSchema.parse({
    ...baseMission,
    fieldLogEntries: undefined,
  });
  const parsedWithoutField = MissionContextSchema.parse({
    id: 'old-mission-no-log',
    title: 'Gammelt oppdrag',
    createdAt: '2026-06-04T08:00:00.000Z',
    updatedAt: '2026-06-04T08:05:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Lokalt område',
    externalSignals: [],
    activeChecklistIds: [],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  });
  const entry = FieldLogEntrySchema.parse({
    id: 'default-flags',
    timestamp: '2026-06-04T09:00:00.000Z',
    category: 'funn',
    text: 'Generelt funn uten persondata',
  });

  expect(oldMission.fieldLogEntries).toEqual([]);
  expect(parsedWithoutField.fieldLogEntries).toEqual([]);
  expect(entry.criticalObservation).toBe(false);
  expect(entry.mustBeForwarded).toBe(false);
  expect(FieldLogEntrySchema.safeParse({ ...entry, text: '' }).success).toBe(false);
  expect(FieldLogEntrySchema.safeParse({ ...entry, category: 'pasientjournal' }).success).toBe(false);
});

it('allows sanitized schematic map references on field log entries without true coordinates', () => {
  const parsed = FieldLogEntrySchema.parse({
    id: 'map-entry-1',
    timestamp: '2026-06-04T10:00:00.000Z',
    locationText: 'Skjematisk punkt 22,33',
    category: 'observasjon',
    text: 'Observasjon opprettet fra kartpunkt',
    mapReference: {
      source: 'map-marker',
      objectId: 'marker-1',
      label: 'KO lokal',
      point: { x: 22, y: 33 },
    },
  });

  expect(parsed.mapReference).toEqual({
    source: 'map-marker',
    objectId: 'marker-1',
    label: 'KO lokal',
    point: { x: 22, y: 33 },
  });
  expect(FieldLogEntrySchema.safeParse({
    ...parsed,
    mapReference: { source: 'map-marker', objectId: 'bad', label: 'Ekte', point: { x: 10, y: 101 } },
  }).success).toBe(false);
  expect(FieldLogEntrySchema.safeParse({
    ...parsed,
    mapReference: { source: 'gps', objectId: 'bad', label: 'Ekte', point: { lat: 63.4, lon: 10.4 } },
  }).success).toBe(false);
});

it('searches and exports field-log map references as schematic local context only', () => {
  const mapEntry: FieldLogEntry = {
    id: 'entry-map-ref',
    timestamp: '2026-06-04T09:30:00.000Z',
    locationText: 'Skjematisk 22,33',
    category: 'observasjon',
    text: 'Røyk ved KO',
    criticalObservation: true,
    mustBeForwarded: true,
    mapReference: {
      source: 'map-marker',
      objectId: 'marker-ko',
      label: 'KO lokal',
      point: { x: 22, y: 33 },
    },
  };

  expect(filterFieldLogEntries([mapEntry], { query: 'KO lokal' })).toHaveLength(1);
  expect(filterFieldLogEntries([mapEntry], { query: '22,33' })).toHaveLength(1);

  const markdown = exportFieldLogMarkdown({ mission: baseMission, entries: [mapEntry] });
  const json = JSON.parse(exportFieldLogJson({ mission: baseMission, entries: [mapEntry] }));

  expect(markdown).toContain('Kart: KO lokal (map-marker 22,33)');
  expect(json.entries[0].mapReference).toEqual({
    source: 'map-marker',
    objectId: 'marker-ko',
    label: 'KO lokal',
    point: { x: 22, y: 33 },
  });
  expect(JSON.stringify(json)).not.toMatch(/lat|lon|geometry|rawRef/i);
});

it('exposes the required quick categories with privacy-preserving labels and help text', () => {
  expect(FIELD_LOG_CATEGORIES).toEqual([
    'funn',
    'skadet-person',
    'ressursbehov',
    'hms-avvik',
    'observasjon',
    'samband',
    'materiell',
    'vaer-fare',
    'beslutning',
  ]);
  expect(FIELD_LOG_CATEGORY_OPTIONS.map((option) => option.value)).toEqual(FIELD_LOG_CATEGORIES);
  expect(FIELD_LOG_CATEGORY_OPTIONS.map((option) => option.label)).toContain('Skadet person');
  expect(FIELD_LOG_CATEGORY_OPTIONS.find((option) => option.value === 'skadet-person')?.helpText).toMatch(/ikke registrer navn, ID, fødselsdato, fødselsnummer, diagnose, behandling, journal, helseopplysninger eller pasientdata/i);

  const labelsOnly = FIELD_LOG_CATEGORY_OPTIONS.map((option) => option.label).join(' ');
  expect(labelsOnly).not.toMatch(/pasientjournal|diagnose|fødselsnummer|fødselsdato|behandling|journal/i);
  expect(FIELD_LOG_PATIENT_DATA_WARNING).toMatch(/ikke registrer navn, ID, fødselsdato, fødselsnummer, diagnose, behandling, journal, helseopplysninger eller pasientdata/i);
});

it('sorts the timeline chronologically and filters by query and category', () => {
  expect(sortFieldLogEntries(entries).map((entry) => entry.id)).toEqual(['entry-early', 'entry-late']);
  expect(filterFieldLogEntries(entries, { query: 'lysmast' }).map((entry) => entry.id)).toEqual(['entry-late']);
  expect(filterFieldLogEntries(entries, { query: 'sperrepunkt' }).map((entry) => entry.id)).toEqual(['entry-early']);
  expect(filterFieldLogEntries(entries, { query: 'kritisk' }).map((entry) => entry.id)).toEqual(['entry-early']);
  expect(filterFieldLogEntries(entries, { category: 'ressursbehov' }).map((entry) => entry.id)).toEqual(['entry-late']);
  expect(filterFieldLogEntries(entries, { query: 'vannstand', category: 'observasjon' }).map((entry) => entry.id)).toEqual(['entry-early']);
});

it('exports field log Markdown, JSON and PDF-ready HTML without hidden browser metadata', () => {
  const mission = { ...baseMission, fieldLogEntries: entries };
  const markdown = exportFieldLogMarkdown({ mission, entries });
  const json = exportFieldLogJson({ mission, entries });
  const html = exportFieldLogPdfReadyHtml({ mission, entries });
  const parsedJson = JSON.parse(json);

  expect(markdown).toContain('# Lokal feltlogg');
  expect(markdown).toContain('Lagres bare lokalt i denne nettleseren');
  expect(markdown).toContain('Ikke offisiell logg');
  expect(markdown).toContain('ikke registrer navn, ID, fødselsdato, fødselsnummer, diagnose, behandling, journal, helseopplysninger eller pasientdata');
  expect(markdown.indexOf('Vannstand stiger')).toBeLessThan(markdown.indexOf('Behov for ekstra lysmast'));
  expect(markdown).toContain('Observasjon');
  expect(markdown).toContain('Kritisk observasjon');
  expect(markdown).toContain('Må videresendes');
  expect(markdown).not.toMatch(/indexedDB|objectStore|geometry|rawRef/i);

  const unsafeText = '<script>alert("x")</script> & \'quote\'';
  const htmlWithUnsafeEntry = exportFieldLogPdfReadyHtml({
    mission,
    entries: [{
      id: 'unsafe-entry',
      timestamp: '2026-06-04T09:30:00.000Z',
      category: 'observasjon',
      text: unsafeText,
      criticalObservation: false,
      mustBeForwarded: false,
    }],
  });

  expect(parsedJson).toMatchObject({ schemaVersion: 1, mission: { title: 'FIG lokal feltlogg' } });
  expect(parsedJson.mission.id).toBeUndefined();
  expect(parsedJson.entries).toHaveLength(2);
  expect(parsedJson.entries[0]).toMatchObject({ categoryLabel: 'Observasjon', flags: { criticalObservation: true, mustBeForwarded: false } });
  expect(parsedJson.entries[0].id).toBeUndefined();
  expect(json).not.toMatch(/indexedDB|objectStore|geometry|rawRef/i);

  expect(html).toContain('<!doctype html>');
  expect(html).toContain('PDF-klar feltlogg');
  expect(html).toContain('Skriv ut &gt; Lagre som PDF');
  expect(html).toContain('Vannstand stiger ved bekk');
  expect(html).not.toMatch(/indexedDB|objectStore|geometry|rawRef/i);
  expect(htmlWithUnsafeEntry).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;');
  expect(htmlWithUnsafeEntry).not.toContain(unsafeText);
});
