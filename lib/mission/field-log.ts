import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';
import type { FieldLogCategory, FieldLogEntry, MissionContext } from './schemas';

export const FIELD_LOG_CATEGORIES = [
  'funn',
  'skadet-person',
  'ressursbehov',
  'hms-avvik',
  'observasjon',
  'samband',
  'materiell',
  'vaer-fare',
  'beslutning',
] as const satisfies readonly FieldLogCategory[];

export const FIELD_LOG_PATIENT_DATA_WARNING = 'Pasientdata: ikke registrer navn, ID, fødselsdato, fødselsnummer, diagnose, behandling, journal, helseopplysninger eller pasientdata. Bruk ordinære helsefaglige systemer og rapportlinjer for person- og pasientopplysninger.';
export const FIELD_LOG_LOCAL_ONLY_WARNING = 'Lagres bare lokalt i denne nettleseren. Ikke offisiell logg. Kontroller mot gjeldende ordre, samband og ordinære rapporteringssystemer før deling.';

export type FieldLogCategoryOption = {
  value: FieldLogCategory;
  label: string;
  helpText: string;
};

export const FIELD_LOG_CATEGORY_OPTIONS: FieldLogCategoryOption[] = [
  { value: 'funn', label: 'Funn', helpText: 'Konkrete funn uten persondata eller skjermede detaljer.' },
  { value: 'skadet-person', label: 'Skadet person', helpText: `Kun anonym, generell observasjon av behov for hjelp; ${FIELD_LOG_PATIENT_DATA_WARNING}` },
  { value: 'ressursbehov', label: 'Ressursbehov', helpText: 'Behov for mannskap, utstyr, logistikk eller støtte uten personopplysninger.' },
  { value: 'hms-avvik', label: 'HMS-avvik', helpText: 'HMS-avvik eller nestenulykke uten navn, ID eller helsedetaljer.' },
  { value: 'observasjon', label: 'Observasjon', helpText: 'Nøytral observasjon fra felt.' },
  { value: 'samband', label: 'Samband', helpText: 'Sambandsstatus uten sensitive samband-lister, nøkler eller skjermet informasjon.' },
  { value: 'materiell', label: 'Materiell', helpText: 'Materiellstatus uten serienummer, privat inventar eller sensitive detaljer.' },
  { value: 'vaer-fare', label: 'Vær/fare', helpText: 'Vær, føre eller faretegn som påvirker innsatsen.' },
  { value: 'beslutning', label: 'Beslutning', helpText: 'Lokal beslutning eller føring som må sjekkes mot ordinær ordre.' },
];

export const FIELD_LOG_CATEGORY_LABELS: Record<FieldLogCategory, string> = Object.fromEntries(
  FIELD_LOG_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<FieldLogCategory, string>;

export function sortFieldLogEntries(entries: FieldLogEntry[]): FieldLogEntry[] {
  return [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
}

export function filterFieldLogEntries(entries: FieldLogEntry[], filters: { query?: string; category?: FieldLogCategory | '' } = {}): FieldLogEntry[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  return sortFieldLogEntries(entries).filter((entry) => {
    if (filters.category && entry.category !== filters.category) return false;
    if (!query) return true;
    const flags = [entry.criticalObservation ? 'kritisk kritisk observasjon' : '', entry.mustBeForwarded ? 'må videresendes ma videresendes' : ''].join(' ');
    const searchText = [
      entry.timestamp,
      entry.locationText,
      FIELD_LOG_CATEGORY_LABELS[entry.category],
      entry.category,
      entry.text,
      entry.mapReference?.label,
      entry.mapReference ? `${entry.mapReference.point.x},${entry.mapReference.point.y}` : undefined,
      entry.mapReference?.source,
      entry.linkedMissionId,
      flags,
    ].filter(Boolean).join(' ').toLowerCase();
    return searchText.includes(query);
  });
}

function missionExportSummary(mission: MissionContext) {
  return {
    title: mission.title,
    phase: mission.phase,
    role: mission.role,
    scenario: mission.scenario,
    locationText: mission.locationText,
    municipality: mission.municipality,
    updatedAt: mission.updatedAt,
    contentVersion: mission.contentVersion,
  };
}

function exportedEntry(entry: FieldLogEntry) {
  const mapReference = entry.mapReference
    ? {
        source: entry.mapReference.source,
        label: entry.mapReference.label,
        point: {
          x: entry.mapReference.point.x,
          y: entry.mapReference.point.y,
        },
      }
    : undefined;

  return {
    timestamp: entry.timestamp,
    locationText: entry.locationText,
    category: entry.category,
    categoryLabel: FIELD_LOG_CATEGORY_LABELS[entry.category],
    text: entry.text,
    mapReference,
    flags: {
      criticalObservation: entry.criticalObservation,
      mustBeForwarded: entry.mustBeForwarded,
    },
  };
}

function entryFlags(entry: FieldLogEntry) {
  const flags = [];
  if (entry.criticalObservation) flags.push('Kritisk observasjon');
  if (entry.mustBeForwarded) flags.push('Må videresendes');
  return flags;
}

function mapReferenceText(entry: FieldLogEntry) {
  if (!entry.mapReference) return '';
  const { source, label, point } = entry.mapReference;
  return ` — Kart: ${label} (${source} ${point.x},${point.y})`;
}

function fieldLogEntriesForMission(mission: MissionContext, entries: FieldLogEntry[]) {
  return entries.filter((entry) => !entry.linkedMissionId || entry.linkedMissionId === mission.id);
}

function assertFieldLogExportSafe(mission: MissionContext, entries: FieldLogEntry[]) {
  assertNoSensitiveOperationalTextInValue({ mission: missionExportSummary(mission), entries: sortFieldLogEntries(entries).map(exportedEntry) }, 'fieldLog');
}

export function exportFieldLogMarkdown({ mission, entries }: { mission: MissionContext; entries: FieldLogEntry[] }) {
  const scopedEntries = fieldLogEntriesForMission(mission, entries);
  assertFieldLogExportSafe(mission, scopedEntries);
  const lines: string[] = [];
  lines.push('# Lokal feltlogg');
  lines.push('');
  lines.push(`> ${FIELD_LOG_LOCAL_ONLY_WARNING}`);
  lines.push(`> ${FIELD_LOG_PATIENT_DATA_WARNING}`);
  lines.push('');
  lines.push('## Oppdrag');
  lines.push(`- Tittel: ${mission.title}`);
  lines.push(`- Fase/rolle/scenario: ${mission.phase} / ${mission.role} / ${mission.scenario}`);
  lines.push(`- Sted: ${mission.locationText}`);
  if (mission.municipality) lines.push(`- Kommune: ${mission.municipality}`);
  lines.push(`- Oppdatert: ${mission.updatedAt}`);
  lines.push(`- Innholdsversjon: ${mission.contentVersion}`);
  lines.push('');
  lines.push('## Tidslinje');

  const sorted = sortFieldLogEntries(scopedEntries);
  if (sorted.length === 0) {
    lines.push('- Ingen feltlogg registrert lokalt.');
  } else {
    for (const entry of sorted) {
      const location = entry.locationText ? ` — ${entry.locationText}` : '';
      const mapReference = mapReferenceText(entry);
      const flags = entryFlags(entry);
      const flagSuffix = flags.length > 0 ? ` — ${flags.join(', ')}` : '';
      lines.push(`- ${entry.timestamp} — ${FIELD_LOG_CATEGORY_LABELS[entry.category]}${location}${mapReference}${flagSuffix}: ${entry.text}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function exportFieldLogJson({ mission, entries }: { mission: MissionContext; entries: FieldLogEntry[] }) {
  const scopedEntries = fieldLogEntriesForMission(mission, entries);
  assertFieldLogExportSafe(mission, scopedEntries);
  return `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    warnings: [FIELD_LOG_LOCAL_ONLY_WARNING, FIELD_LOG_PATIENT_DATA_WARNING],
    mission: missionExportSummary(mission),
    entries: sortFieldLogEntries(scopedEntries).map(exportedEntry),
  }, null, 2)}\n`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function markdownToSafeHtml(markdown: string) {
  return markdown.trim().split('\n').map((line) => {
    if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
    if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
    if (line.startsWith('> ')) return `<blockquote>${escapeHtml(line.slice(2))}</blockquote>`;
    if (line.startsWith('- ')) return `<p>${escapeHtml(line)}</p>`;
    if (line.trim() === '') return '';
    return `<p>${escapeHtml(line)}</p>`;
  }).join('\n');
}

export function exportFieldLogPdfReadyHtml({ mission, entries }: { mission: MissionContext; entries: FieldLogEntry[] }) {
  const markdown = exportFieldLogMarkdown({ mission, entries });
  return `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(`PDF-klar feltlogg - ${mission.title}`)}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; margin: 2rem; color: #0f172a; }
    h1, h2 { page-break-after: avoid; }
    blockquote { border-left: 4px solid #f59e0b; margin: 1rem 0; padding: 0.5rem 1rem; background: #fffbeb; }
    p { margin: 0.35rem 0; }
  </style>
</head>
<body>
  <p><strong>PDF-klar feltlogg / bruk nettleserens Skriv ut &gt; Lagre som PDF</strong></p>
  ${markdownToSafeHtml(markdown)}
</body>
</html>
`;
}
