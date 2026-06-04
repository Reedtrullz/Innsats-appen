import type { OperationalChecklist } from '@/lib/content/schemas';
import { EXPORT_SENSITIVITY_WARNING } from './order-export';
import { FIELD_LOG_CATEGORY_LABELS, sortFieldLogEntries } from './field-log';
import { MAP_DRAWING_LABELS, MAP_MARKER_LABELS, normalizeMissionMapState, type MissionMapState } from '@/lib/maps/operations-map';
import type { ChecklistRun, MissionContext, MissionFeedback, MissionLessonsLearned, MissionResourceRequest } from './schemas';

export const AFTER_ACTION_LOCAL_WARNING = 'Lagres bare lokalt i denne nettleseren. Ikke offisiell innsending eller offisiell logg alene. Ikke legg inn eller del navn, ID, pasientdetaljer, helsejournal, skjermet operativ informasjon, sensitive private lokasjoner eller annet sensitivt innhold.';
export const AFTER_ACTION_SCHEMA_VERSION = 2;

const NOT_REGISTERED = 'Ikke registrert i lokal oppdragstavle';

const resourceKindLabels: Record<string, string> = {
  water: 'Vann',
  food: 'Mat',
  ppe: 'Verneutstyr',
  'medical-support': 'Medisinsk støtte',
  transport: 'Transport',
  fuel: 'Drivstoff',
  equipment: 'Utstyr',
};

const equipmentWords = ['materiell', 'utstyr', 'kjøretøy', 'kjoretoy', 'lys', 'samband', 'verneutstyr', 'belysning', 'pumpe', 'pumper', 'aggregat', 'radio', 'batteri', 'batterier'];
const equipmentCompoundWords = [
  'arbeidslys',
  'fellesutstyr',
  'kjoreboker',
  'kjorebok',
  'lagsutstyr',
  'lommelykt',
  'materiellberedskap',
  'materiellberedskapskontroll',
  'materielljournaler',
  'nodlys',
  'nødlys',
  'reservebatterier',
  'sambandskontroll',
  'sambandsplan',
  'utstyrskontroll',
];
const equipmentDamageLossWords = ['skade', 'skadet', 'tap', 'taps', 'tapt', 'mangel', 'mangler', 'manglende', 'defekt', 'ødelagt', 'odelagt'];
const nonEquipmentContextWords = [
  'defuse',
  'efok',
  'helse',
  'helsedata',
  'helsejournal',
  'helseopplysninger',
  'nestenulykke',
  'personell',
  'personellkontroll',
  'personellskade',
  'psykososial',
];
const equipmentRelatedResourceKinds: Array<MissionResourceRequest['kind']> = ['equipment', 'ppe', 'transport'];

type TextSection = {
  summary: string;
  registered: boolean;
};

export type AfterActionChecklistItem = {
  id: string;
  label: string;
  sourceIds: string[];
  note?: string;
};

export type AfterActionChecklistSummary = {
  checklistSlug: string;
  title: string;
  checkedCount: number;
  totalCount: number;
  requiredCount: number;
  incompleteRequiredItems: AfterActionChecklistItem[];
  sourceIds: string[];
  runUpdatedAt?: string;
};

export type AfterActionResourceEntry = {
  id: string;
  kind: MissionResourceRequest['kind'];
  kindLabel: string;
  status: MissionResourceRequest['status'];
  createdAt: string;
  quantity?: string;
  note?: string;
};

export type AfterActionMbkSummary = {
  status: 'ok' | 'needs-attention';
  checkedEquipmentItems: number;
  incompleteRequiredEquipmentItems: number;
  openEquipmentRequests: number;
  equipmentDamageLossCount: number;
  checklistSummaries: Array<{
    checklistSlug: string;
    title: string;
    checkedEquipmentItems: number;
    incompleteRequiredEquipmentItems: number;
  }>;
};

export type AfterActionReport = {
  schemaVersion: number;
  generatedAt: string;
  warnings: string[];
  mission: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    phase: MissionContext['phase'];
    role: MissionContext['role'];
    scenario: MissionContext['scenario'];
    locationText: string;
    municipality?: string;
    contentVersion: string;
    activeChecklistIds: string[];
    notes: string;
  };
  sections: {
    order: TextSection;
    samband: TextSection;
    localLog: { entries: string[]; registered: boolean };
    mapSummary: {
      markerCount: number;
      drawingCount: number;
      items: string[];
      warning: string;
    };
    contextSignals: Array<{
      source: MissionContext['externalSignals'][number]['source'];
      kind: string;
      severity: MissionContext['externalSignals'][number]['severity'];
      title: string;
      summary: string;
      staleness: MissionContext['externalSignals'][number]['staleness'];
      fetchedAt: string;
    }>;
    tasks: {
      total: number;
      completed: number;
      open: MissionContext['tasks'];
      all: MissionContext['tasks'];
    };
    statusLog: MissionContext['statusLog'];
    checklists: AfterActionChecklistSummary[];
    resourceConsumption: { entries: AfterActionResourceEntry[]; placeholder?: string };
    equipmentDamageLoss: { entries: AfterActionResourceEntry[]; placeholder?: string };
    lessonsLearned: MissionLessonsLearned;
    feedback: MissionFeedback;
    mbkSummary: AfterActionMbkSummary;
  };
};

export type BuildAfterActionReportInput = {
  mission: MissionContext;
  checklists: OperationalChecklist[];
  checklistRuns: ChecklistRun[];
  generatedAt?: string;
  localOrderText?: string;
  localSambandText?: string;
  localLogText?: string;
  mapState?: MissionMapState;
};

function trimToSection(value: string | undefined): TextSection {
  const trimmed = value?.trim();
  return trimmed ? { summary: trimmed, registered: true } : { summary: NOT_REGISTERED, registered: false };
}

function logEntries(value: string | undefined) {
  const entries = value?.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean) ?? [];
  return entries.length > 0 ? { entries, registered: true } : { entries: [NOT_REGISTERED], registered: false };
}


function structuredFieldLogEntries(mission: MissionContext) {
  const entries = sortFieldLogEntries(mission.fieldLogEntries ?? []);
  if (entries.length === 0) return undefined;
  return entries.map((entry) => {
    const location = entry.locationText ? ` — ${entry.locationText}` : '';
    const map = entry.mapReference ? ` — Kart: ${entry.mapReference.label} ${entry.mapReference.point.x},${entry.mapReference.point.y}` : '';
    const flags = [entry.criticalObservation ? 'Kritisk observasjon' : '', entry.mustBeForwarded ? 'Må videresendes' : ''].filter(Boolean);
    const flagText = flags.length ? ` — ${flags.join(', ')}` : '';
    return `${entry.timestamp} — ${FIELD_LOG_CATEGORY_LABELS[entry.category]}${location}${map}${flagText}: ${entry.text}`;
  }).join('\n');
}


function buildMapSummary(mapState: MissionMapState | undefined) {
  const state = normalizeMissionMapState(mapState ?? { markers: [], drawings: [] });
  return {
    markerCount: state.markers.length,
    drawingCount: state.drawings.length,
    items: [
      ...state.markers.slice(0, 10).map((marker) => `${MAP_MARKER_LABELS[marker.kind]}: ${marker.label} (${marker.point.x},${marker.point.y})`),
      ...state.drawings.slice(0, 10).map((drawing) => `${MAP_DRAWING_LABELS[drawing.kind]}: ${drawing.label} (${drawing.points.length} punkter)`),
    ],
    warning: 'Skjematiske 0-100 kartdata fra lokal nettleser. Ikke autoritativ navigasjon eller offisiell posisjon.',
  };
}

function withNote(note: string | undefined) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizedLessonsLearned(lessons: MissionContext['lessonsLearned']): MissionLessonsLearned {
  return {
    summary: lessons?.summary?.trim() ?? '',
    whatWorked: lessons?.whatWorked?.trim() ?? '',
    improvements: lessons?.improvements?.trim() ?? '',
    followUp: lessons?.followUp?.trim() ?? '',
  };
}

function normalizedFeedback(feedback: MissionContext['feedback']): MissionFeedback {
  return {
    leadership: feedback?.leadership?.trim() ?? '',
    equipment: feedback?.equipment?.trim() ?? '',
    procedures: feedback?.procedures?.trim() ?? '',
    training: feedback?.training?.trim() ?? '',
    safety: feedback?.safety?.trim() ?? '',
    communications: feedback?.communications?.trim() ?? '',
  };
}

function sourceIds(sourceIds: string[] | undefined) {
  return sourceIds ?? [];
}

function checklistSummaries(checklists: OperationalChecklist[], runs: ChecklistRun[]): AfterActionChecklistSummary[] {
  return checklists.map((checklist) => {
    const run = runs.find((item) => item.templateSlug === checklist.slug);
    const checkedIds = new Set(run?.checkedItemIds ?? []);
    const requiredItems = checklist.items.filter((item) => item.required === true);
    return {
      checklistSlug: checklist.slug,
      title: checklist.title,
      checkedCount: checklist.items.filter((item) => checkedIds.has(item.id)).length,
      totalCount: checklist.items.length,
      requiredCount: requiredItems.length,
      incompleteRequiredItems: requiredItems.filter((item) => !checkedIds.has(item.id)).map((item) => ({
        id: item.id,
        label: item.label,
        sourceIds: sourceIds(item.sourceIds),
        note: withNote(run?.notesByItemId[item.id]),
      })),
      sourceIds: sourceIds(checklist.sourceIds),
      runUpdatedAt: run?.updatedAt,
    };
  });
}

function normalizeEquipmentText(value: string) {
  return value
    .toLowerCase()
    .replaceAll('æ', 'ae')
    .replaceAll('ø', 'o')
    .replaceAll('å', 'a');
}

function equipmentTokens(value: string) {
  return normalizeEquipmentText(value).match(/[a-z0-9]+/g) ?? [];
}

function containsTokenSequence(tokens: string[], phraseTokens: string[]) {
  if (phraseTokens.length === 0 || phraseTokens.length > tokens.length) return false;
  return tokens.some((_, index) => phraseTokens.every((phraseToken, phraseIndex) => tokens[index + phraseIndex] === phraseToken));
}

function containsAnyToken(tokens: string[], words: string[]) {
  const tokenSet = new Set(tokens);
  return words.map(normalizeEquipmentText).some((word) => tokenSet.has(word));
}

function containsAnyChecklistEquipmentPhrase(tokens: string[], equipmentRequired: string[] | undefined) {
  return (equipmentRequired ?? [])
    .map(equipmentTokens)
    .filter((phraseTokens) => phraseTokens.length > 0)
    .some((phraseTokens) => containsTokenSequence(tokens, phraseTokens));
}

function hasExplicitEquipmentContext(tokens: string[]) {
  return containsAnyToken(tokens, equipmentWords) || containsAnyToken(tokens, equipmentCompoundWords);
}

function hasDamageLossContext(tokens: string[]) {
  if (!containsAnyToken(tokens, equipmentDamageLossWords)) return false;
  if (hasExplicitEquipmentContext(tokens)) return true;
  const hasDamageLossNotice = containsTokenSequence(tokens, ['skade', 'og', 'tap'])
    || containsTokenSequence(tokens, ['tap', 'og', 'skade'])
    || containsTokenSequence(tokens, ['taps', 'og', 'skademelding'])
    || containsTokenSequence(tokens, ['skade', 'tap']);
  return hasDamageLossNotice && !containsAnyToken(tokens, nonEquipmentContextWords);
}

function isEquipmentChecklistItem(checklist: OperationalChecklist, itemId: string, label: string) {
  const tokens = equipmentTokens(`${itemId} ${label}`);
  return hasExplicitEquipmentContext(tokens)
    || containsAnyChecklistEquipmentPhrase(tokens, checklist.equipmentRequired)
    || hasDamageLossContext(tokens);
}

function resourceEntry(request: MissionResourceRequest): AfterActionResourceEntry {
  return {
    id: request.id,
    kind: request.kind,
    kindLabel: resourceKindLabels[request.kind] ?? request.kind,
    status: request.status,
    createdAt: request.createdAt,
    quantity: withNote(request.quantity),
    note: withNote(request.note),
  };
}

function isEquipmentDamageOrLoss(entry: AfterActionResourceEntry) {
  if (entry.kind === 'equipment') return true;
  const detailText = `${entry.quantity ?? ''} ${entry.note ?? ''}`;
  const detailTokens = equipmentTokens(detailText);
  const allTokens = equipmentTokens(`${entry.kind} ${entry.kindLabel} ${detailText}`);
  if (!containsAnyToken(allTokens, equipmentDamageLossWords)) return false;
  const hasEquipmentContextInDetails = hasExplicitEquipmentContext(detailTokens);
  if (hasEquipmentContextInDetails) return true;
  if (!equipmentRelatedResourceKinds.includes(entry.kind)) return false;
  return !containsAnyToken(detailTokens, nonEquipmentContextWords);
}

function buildMbkSummary(checklists: OperationalChecklist[], runs: ChecklistRun[], equipmentDamageLoss: AfterActionResourceEntry[], resourceEntries: AfterActionResourceEntry[]): AfterActionMbkSummary {
  let checkedEquipmentItems = 0;
  let incompleteRequiredEquipmentItems = 0;
  const summaries = checklists.map((checklist) => {
    const run = runs.find((item) => item.templateSlug === checklist.slug);
    const checkedIds = new Set(run?.checkedItemIds ?? []);
    let checked = 0;
    let incompleteRequired = 0;
    for (const item of checklist.items) {
      if (!isEquipmentChecklistItem(checklist, item.id, item.label)) continue;
      if (checkedIds.has(item.id)) checked += 1;
      if (item.required === true && !checkedIds.has(item.id)) incompleteRequired += 1;
    }
    checkedEquipmentItems += checked;
    incompleteRequiredEquipmentItems += incompleteRequired;
    return {
      checklistSlug: checklist.slug,
      title: checklist.title,
      checkedEquipmentItems: checked,
      incompleteRequiredEquipmentItems: incompleteRequired,
    };
  });
  const openEquipmentRequests = resourceEntries.filter((entry) => entry.kind === 'equipment' && entry.status !== 'done').length;
  const status = incompleteRequiredEquipmentItems > 0 || openEquipmentRequests > 0 || equipmentDamageLoss.length > 0 ? 'needs-attention' : 'ok';
  return {
    status,
    checkedEquipmentItems,
    incompleteRequiredEquipmentItems,
    openEquipmentRequests,
    equipmentDamageLossCount: equipmentDamageLoss.length,
    checklistSummaries: summaries,
  };
}

export function buildAfterActionReport({ mission, checklists, checklistRuns, generatedAt, localOrderText, localSambandText, localLogText, mapState }: BuildAfterActionReportInput): AfterActionReport {
  const reportChecklists = checklistSummaries(checklists, checklistRuns);
  const resourceEntries = mission.resourceRequests.map(resourceEntry);
  const equipmentDamageLoss = resourceEntries.filter(isEquipmentDamageOrLoss);
  const localLogSource = localLogText?.trim() ? localLogText : structuredFieldLogEntries(mission);
  return {
    schemaVersion: AFTER_ACTION_SCHEMA_VERSION,
    generatedAt: generatedAt ?? new Date().toISOString(),
    warnings: [EXPORT_SENSITIVITY_WARNING, AFTER_ACTION_LOCAL_WARNING],
    mission: {
      id: mission.id,
      title: mission.title,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
      phase: mission.phase,
      role: mission.role,
      scenario: mission.scenario,
      locationText: mission.locationText,
      municipality: mission.municipality,
      contentVersion: mission.contentVersion,
      activeChecklistIds: mission.activeChecklistIds,
      notes: mission.notes,
    },
    sections: {
      order: trimToSection(localOrderText),
      samband: trimToSection(localSambandText),
      localLog: logEntries(localLogSource),
      mapSummary: buildMapSummary(mapState),
      contextSignals: mission.externalSignals.map((signal) => ({
        source: signal.source,
        kind: signal.kind,
        severity: signal.severity,
        title: signal.title,
        summary: signal.summary,
        staleness: signal.staleness,
        fetchedAt: signal.fetchedAt,
      })),
      tasks: {
        total: mission.tasks.length,
        completed: mission.tasks.filter((task) => task.status === 'done').length,
        open: mission.tasks.filter((task) => task.status !== 'done'),
        all: mission.tasks,
      },
      statusLog: mission.statusLog,
      checklists: reportChecklists,
      resourceConsumption: {
        entries: resourceEntries,
        placeholder: resourceEntries.length === 0 ? 'Ingen lokal ressursbruk registrert ennå.' : undefined,
      },
      equipmentDamageLoss: {
        entries: equipmentDamageLoss,
        placeholder: equipmentDamageLoss.length === 0 ? 'Ingen skade eller tap på utstyr registrert lokalt ennå.' : undefined,
      },
      lessonsLearned: normalizedLessonsLearned(mission.lessonsLearned),
      feedback: normalizedFeedback(mission.feedback),
      mbkSummary: buildMbkSummary(checklists, checklistRuns, equipmentDamageLoss, resourceEntries),
    },
  };
}

function bulletOrPlaceholder(lines: string[], entries: string[], placeholder: string) {
  if (entries.length === 0) {
    lines.push(`- ${placeholder}`);
    return;
  }
  for (const entry of entries) lines.push(`- ${entry}`);
}

function resourceLine(entry: AfterActionResourceEntry) {
  const details = [entry.status, entry.quantity, entry.note].filter((part): part is string => Boolean(part));
  return `${entry.kindLabel}: ${details.join(' — ')}`;
}

function hasSectionValues(values: Record<string, string>) {
  return Object.values(values).some((value) => value.trim().length > 0);
}

export function exportMbkStatusSummaryMarkdown(report: AfterActionReport) {
  const mbk = report.sections.mbkSummary;
  const lines: string[] = [];
  lines.push('# MBK-status / materiellberedskap');
  lines.push('');
  lines.push(`> ${EXPORT_SENSITIVITY_WARNING}`);
  lines.push(`> ${AFTER_ACTION_LOCAL_WARNING}`);
  lines.push('');
  lines.push(`- Status: ${mbk.status}`);
  lines.push(`- Sjekkede materiellpunkter: ${mbk.checkedEquipmentItems}`);
  lines.push(`- Ufullstendige påkrevde materiellpunkter: ${mbk.incompleteRequiredEquipmentItems}`);
  lines.push(`- Åpne utstyrsressurser: ${mbk.openEquipmentRequests}`);
  lines.push(`- Skade/tap registrert: ${mbk.equipmentDamageLossCount}`);
  lines.push('');
  lines.push('## Sjekklister');
  for (const checklist of mbk.checklistSummaries) {
    lines.push(`- ${checklist.title} (${checklist.checklistSlug}): ${checklist.checkedEquipmentItems} sjekket, ${checklist.incompleteRequiredEquipmentItems} påkrevde åpne`);
  }
  return `${lines.join('\n')}\n`;
}

export function exportAfterActionMarkdown(report: AfterActionReport) {
  const lines: string[] = [];
  lines.push('# Etteraksjonsrapport');
  lines.push('');
  for (const warning of report.warnings) lines.push(`> ${warning}`);
  lines.push('> PDF-klar utskrift: bruk egen PDF-klar HTML-eksport og nettleserens Skriv ut > Lagre som PDF. Ikke offisiell innsending.');
  lines.push('');
  lines.push('## Oppdrag');
  lines.push(`- Tittel: ${report.mission.title}`);
  lines.push(`- Fase/rolle/scenario: ${report.mission.phase} / ${report.mission.role} / ${report.mission.scenario}`);
  lines.push(`- Sted: ${report.mission.locationText}`);
  if (report.mission.municipality) lines.push(`- Kommune: ${report.mission.municipality}`);
  lines.push(`- Opprettet/oppdatert: ${report.mission.createdAt} / ${report.mission.updatedAt}`);
  lines.push(`- Generert: ${report.generatedAt}`);
  lines.push(`- Innholdsversjon: ${report.mission.contentVersion}`);
  if (report.mission.notes) lines.push(`- Lokale notater: ${report.mission.notes}`);
  lines.push('');
  lines.push('## Ordre');
  lines.push(report.sections.order.summary);
  lines.push('');
  lines.push('## Samband');
  lines.push(report.sections.samband.summary);
  lines.push('');
  lines.push('## Lokal logg');
  bulletOrPlaceholder(lines, report.sections.localLog.entries, NOT_REGISTERED);
  lines.push('');
  const reportMapSummary = report.sections.mapSummary ?? buildMapSummary(undefined);
  lines.push('## Kart (skjematisk lokal oppsummering)');
  lines.push(`- Markører: ${reportMapSummary.markerCount}`);
  lines.push(`- Tegninger/sektorer: ${reportMapSummary.drawingCount}`);
  lines.push(`- Advarsel: ${reportMapSummary.warning}`);
  bulletOrPlaceholder(lines, reportMapSummary.items, 'Ingen lokale kartmarkører eller sektorer registrert');
  lines.push('');
  lines.push('## Vær/farer (saniterte lokale sammendrag)');
  bulletOrPlaceholder(lines, report.sections.contextSignals.map((signal) => `${signal.title}: ${signal.summary} (${signal.source}, ${signal.severity}, ${signal.staleness})`), 'Ingen lokale sammendrag lagret');
  lines.push('');
  lines.push('## Oppgaver');
  lines.push(`- Totalt: ${report.sections.tasks.total}`);
  lines.push(`- Fullført: ${report.sections.tasks.completed}`);
  bulletOrPlaceholder(lines, report.sections.tasks.all.map((task) => `[${task.status}] ${task.title}${task.notes ? ` — ${task.notes}` : ''}`), 'Ingen lokale oppgaver registrert');
  lines.push('');
  lines.push('## Hurtigstatus');
  bulletOrPlaceholder(lines, report.sections.statusLog.map((status) => `${status.message} (${status.createdAt})${status.note ? ` — ${status.note}` : ''}`), 'Ingen hurtigstatus registrert');
  lines.push('');
  lines.push('## Sjekklister');
  for (const checklist of report.sections.checklists) {
    lines.push(`### ${checklist.title}`);
    lines.push(`- Status: ${checklist.checkedCount}/${checklist.totalCount} sjekket`);
    lines.push(`- Kilder: ${checklist.sourceIds.join(', ') || 'Ingen kilder registrert'}`);
    if (checklist.incompleteRequiredItems.length === 0) {
      lines.push('- Ingen ufullstendige påkrevde punkter registrert');
    } else {
      lines.push('- Ufullstendige påkrevde punkter:');
      for (const item of checklist.incompleteRequiredItems) {
        const sourceSuffix = item.sourceIds.length > 0 ? ` (${item.sourceIds.join(', ')})` : '';
        lines.push(`  - ${item.label}${item.note ? ` — ${item.note}` : ''}${sourceSuffix}`);
      }
    }
  }
  lines.push('');
  lines.push('## Ressursbruk');
  bulletOrPlaceholder(lines, report.sections.resourceConsumption.entries.map(resourceLine), report.sections.resourceConsumption.placeholder ?? 'Ingen lokal ressursbruk registrert');
  lines.push('');
  lines.push('## Skade/tap på utstyr');
  bulletOrPlaceholder(lines, report.sections.equipmentDamageLoss.entries.map(resourceLine), report.sections.equipmentDamageLoss.placeholder ?? 'Ingen skade eller tap på utstyr registrert');
  lines.push('');
  lines.push('## Erfaringer og læring');
  if (hasSectionValues(report.sections.lessonsLearned)) {
    if (report.sections.lessonsLearned.summary) lines.push(`- Oppsummering: ${report.sections.lessonsLearned.summary}`);
    if (report.sections.lessonsLearned.whatWorked) lines.push(`- Hva fungerte: ${report.sections.lessonsLearned.whatWorked}`);
    if (report.sections.lessonsLearned.improvements) lines.push(`- Forbedringer: ${report.sections.lessonsLearned.improvements}`);
    if (report.sections.lessonsLearned.followUp) lines.push(`- Oppfølging: ${report.sections.lessonsLearned.followUp}`);
  } else {
    lines.push('- Ingen strukturerte lokale erfaringer registrert.');
  }
  lines.push('');
  lines.push('## Strukturert tilbakemelding');
  if (hasSectionValues(report.sections.feedback)) {
    if (report.sections.feedback.leadership) lines.push(`- Ledelse: ${report.sections.feedback.leadership}`);
    if (report.sections.feedback.equipment) lines.push(`- Utstyr: ${report.sections.feedback.equipment}`);
    if (report.sections.feedback.procedures) lines.push(`- Prosedyrer: ${report.sections.feedback.procedures}`);
    if (report.sections.feedback.training) lines.push(`- Trening: ${report.sections.feedback.training}`);
    if (report.sections.feedback.safety) lines.push(`- Sikkerhet: ${report.sections.feedback.safety}`);
    if (report.sections.feedback.communications) lines.push(`- Samband/kommunikasjon: ${report.sections.feedback.communications}`);
  } else {
    lines.push('- Ingen strukturert lokal tilbakemelding registrert.');
  }
  lines.push('');
  lines.push(exportMbkStatusSummaryMarkdown(report).trim().replace(/^# /, '## '));
  return `${lines.join('\n')}\n`;
}

export function exportAfterActionJson(report: AfterActionReport) {
  return `${JSON.stringify(report, null, 2)}\n`;
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
    if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`;
    if (line.startsWith('> ')) return `<blockquote>${escapeHtml(line.slice(2))}</blockquote>`;
    if (line.startsWith('- ')) return `<p>${escapeHtml(line)}</p>`;
    if (line.trim() === '') return '';
    return `<p>${escapeHtml(line)}</p>`;
  }).join('\n');
}

export function exportAfterActionPdfReadyHtml(report: AfterActionReport) {
  const markdown = exportAfterActionMarkdown(report);
  return `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(`Etteraksjonsrapport - ${report.mission.title}`)}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; margin: 2rem; color: #0f172a; }
    h1, h2, h3 { page-break-after: avoid; }
    blockquote { border-left: 4px solid #f59e0b; margin: 1rem 0; padding: 0.5rem 1rem; background: #fffbeb; }
    p { margin: 0.35rem 0; }
  </style>
</head>
<body>
  <p><strong>PDF-klar utskrift / bruk nettleserens Skriv ut &gt; Lagre som PDF</strong></p>
  ${markdownToSafeHtml(markdown)}
</body>
</html>
`;
}
