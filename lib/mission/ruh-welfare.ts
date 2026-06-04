import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';
import type { MissionContext, RuhCategory, RuhReport, RuhRisk, WelfareCheck, WelfareLoad } from './schemas';

export const RUH_LOCAL_ONLY_WARNING = 'Lagres bare lokalt i denne nettleseren. Ikke offisiell HMS/RUH-innsending eller formell avviksbehandling. Følg gjeldende rapportlinjer og ordinære HMS/RUH-systemer ved behov.';
export const RUH_PATIENT_DATA_WARNING = 'Ikke legg inn navn, ID, pasientdata eller persondata. Ikke registrer helseopplysninger, diagnose, behandling eller journalinformasjon i lokal RUH.';
export const WELFARE_NON_MEDICAL_WARNING = 'Ikke medisinsk vurdering. Kun enkel egen-/lagsjekk av belastning og velferd; bruk leder, etablerte rutiner og ordinære systemer for helseopplysninger eller akutt hjelp.';

export const RUH_CATEGORY_LABELS: Record<RuhCategory, string> = {
  hms: 'HMS',
  materiell: 'Materiell',
  samband: 'Samband',
  nestenulykke: 'Nestenulykke',
  annet: 'Annet',
};

export const RUH_RISK_LABELS: Record<RuhRisk, string> = {
  lav: 'Lav',
  middels: 'Middels',
  hoy: 'Høy',
};

export const WELFARE_LOAD_LABELS: Record<WelfareLoad, string> = {
  lav: 'Lav',
  moderat: 'Moderat',
  hoy: 'Høy',
};

export const WELFARE_REMINDER_LABELS: Record<keyof WelfareCheck['reminders'], string> = {
  water: 'Vann',
  food: 'Mat',
  warmth: 'Varme',
  rest: 'Hvile',
  dryClothing: 'Tørt tøy',
};

export const RUH_CATEGORY_OPTIONS = Object.entries(RUH_CATEGORY_LABELS).map(([value, label]) => ({ value: value as RuhCategory, label }));
export const RUH_RISK_OPTIONS = Object.entries(RUH_RISK_LABELS).map(([value, label]) => ({ value: value as RuhRisk, label }));
export const WELFARE_LOAD_OPTIONS = Object.entries(WELFARE_LOAD_LABELS).map(([value, label]) => ({ value: value as WelfareLoad, label }));

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

function sortRuhReports(reports: RuhReport[]): RuhReport[] {
  return [...reports].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
}

function sortWelfareChecks(checks: WelfareCheck[]): WelfareCheck[] {
  return [...checks].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
}

export function welfareReminderLabels(check: WelfareCheck): string[] {
  return (Object.keys(WELFARE_REMINDER_LABELS) as Array<keyof WelfareCheck['reminders']>)
    .filter((key) => check.reminders[key])
    .map((key) => WELFARE_REMINDER_LABELS[key]);
}

export function summarizeWelfareCheck(check: WelfareCheck): string {
  const flags = [];
  if (check.needsRest) flags.push('Trenger hvile');
  if (check.needsRelief) flags.push('Trenger avløsning');
  const reminderLabels = welfareReminderLabels(check);
  const reminderText = reminderLabels.length > 0 ? reminderLabels.join(', ') : 'Ingen påminnelser krysset av';
  const flagText = flags.length > 0 ? flags.join(', ') : 'Ingen hvile-/avløsningsflagg';
  return `Fysisk: ${WELFARE_LOAD_LABELS[check.physicalLoad]} / Mental: ${WELFARE_LOAD_LABELS[check.mentalLoad]} — ${flagText} — Påminnelser: ${reminderText}`;
}

function exportedRuhReport(report: RuhReport) {
  return {
    timestamp: report.timestamp,
    category: report.category,
    categoryLabel: RUH_CATEGORY_LABELS[report.category],
    whatHappened: report.whatHappened,
    immediateMeasure: report.immediateMeasure,
    risk: report.risk,
    riskLabel: RUH_RISK_LABELS[report.risk],
    followUpNeeded: report.followUpNeeded,
  };
}

function exportedWelfareCheck(check: WelfareCheck) {
  return {
    timestamp: check.timestamp,
    physicalLoad: check.physicalLoad,
    physicalLoadLabel: WELFARE_LOAD_LABELS[check.physicalLoad],
    mentalLoad: check.mentalLoad,
    mentalLoadLabel: WELFARE_LOAD_LABELS[check.mentalLoad],
    needsRest: check.needsRest,
    needsRelief: check.needsRelief,
    reminders: check.reminders,
    reminderLabels: welfareReminderLabels(check),
    note: check.note,
  };
}

function assertRuhExportSafe(mission: MissionContext, reports: RuhReport[]) {
  assertNoSensitiveOperationalTextInValue({ mission: missionExportSummary(mission), reports: sortRuhReports(reports).map(exportedRuhReport) }, 'ruh');
}

function assertWelfareExportSafe(mission: MissionContext, checks: WelfareCheck[]) {
  assertNoSensitiveOperationalTextInValue({ mission: missionExportSummary(mission), checks: sortWelfareChecks(checks).map(exportedWelfareCheck) }, 'welfare');
}

export function exportRuhMarkdown({ mission, reports }: { mission: MissionContext; reports: RuhReport[] }) {
  assertRuhExportSafe(mission, reports);
  const lines: string[] = [];
  lines.push('# Lokal forenklet RUH');
  lines.push('');
  lines.push(`> ${RUH_LOCAL_ONLY_WARNING}`);
  lines.push(`> ${RUH_PATIENT_DATA_WARNING}`);
  lines.push('');
  lines.push('## Oppdrag');
  lines.push(`- Tittel: ${mission.title}`);
  lines.push(`- Sted: ${mission.locationText}`);
  lines.push(`- Oppdatert: ${mission.updatedAt}`);
  lines.push('');
  lines.push('## RUH-rapporter');
  const sorted = sortRuhReports(reports);
  if (sorted.length === 0) {
    lines.push('- Ingen lokale RUH-rapporter registrert.');
  } else {
    for (const report of sorted) {
      lines.push(`- ${report.timestamp} — ${RUH_CATEGORY_LABELS[report.category]} — Risiko: ${RUH_RISK_LABELS[report.risk]} — Oppfølging: ${report.followUpNeeded ? 'Ja' : 'Nei'}`);
      lines.push(`  - Hva skjedde: ${report.whatHappened}`);
      lines.push(`  - Umiddelbart tiltak: ${report.immediateMeasure}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function exportRuhJson({ mission, reports }: { mission: MissionContext; reports: RuhReport[] }) {
  assertRuhExportSafe(mission, reports);
  return `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    warnings: [RUH_LOCAL_ONLY_WARNING, RUH_PATIENT_DATA_WARNING],
    mission: missionExportSummary(mission),
    reports: sortRuhReports(reports).map(exportedRuhReport),
  }, null, 2)}\n`;
}

export function exportWelfareMarkdown({ mission, checks }: { mission: MissionContext; checks: WelfareCheck[] }) {
  assertWelfareExportSafe(mission, checks);
  const lines: string[] = [];
  lines.push('# Lokal velferds- og belastningssjekk');
  lines.push('');
  lines.push(`> ${WELFARE_NON_MEDICAL_WARNING}`);
  lines.push('');
  lines.push('## Oppdrag');
  lines.push(`- Tittel: ${mission.title}`);
  lines.push(`- Sted: ${mission.locationText}`);
  lines.push(`- Oppdatert: ${mission.updatedAt}`);
  lines.push('');
  lines.push('## Sjekker');
  const sorted = sortWelfareChecks(checks);
  if (sorted.length === 0) {
    lines.push('- Ingen lokale velferdssjekker registrert.');
  } else {
    for (const check of sorted) {
      lines.push(`- ${check.timestamp} — ${summarizeWelfareCheck(check)} — Hvile: ${check.needsRest ? 'Ja' : 'Nei'} — Avlastning: ${check.needsRelief ? 'Ja' : 'Nei'}`);
      if (check.note) lines.push(`  - Notat: ${check.note}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function exportWelfareJson({ mission, checks }: { mission: MissionContext; checks: WelfareCheck[] }) {
  assertWelfareExportSafe(mission, checks);
  return `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    warnings: [WELFARE_NON_MEDICAL_WARNING],
    mission: missionExportSummary(mission),
    checks: sortWelfareChecks(checks).map(exportedWelfareCheck),
  }, null, 2)}\n`;
}
