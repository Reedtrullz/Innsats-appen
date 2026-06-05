import type { OperationalChecklist } from '@/lib/content/schemas';
import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';
import { buildGeoJsonExport, buildMapImageSvg, geoJsonExportText, mapStateForMission, normalizeMissionMapState, type MissionMapState } from '@/lib/maps/operations-map';
import { buildAfterActionReport, exportAfterActionMarkdown, sanitizeLocalMapPackageSummary } from './after-action-report';
import { exportFieldLogMarkdown } from './field-log';
import type { ChecklistRun, MissionContext } from './schemas';

export const MISSION_FOLDER_WARNING = 'Oppdragsmappe er lokal eksport fra denne nettleseren. Ikke offisiell innsending, ikke arkiv, ikke pasientjournal og ikke sentral lagring. Ikke legg inn eller del persondata. Kontroller og saniter før deling.';
export const MISSION_FOLDER_SCHEMA_VERSION = 1;

function missionSummary(mission: MissionContext) {
  return {
    title: mission.title,
    phase: mission.phase,
    role: mission.role,
    scenario: mission.scenario,
    locationText: mission.locationText,
    municipality: mission.municipality,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
    contentVersion: mission.contentVersion,
  };
}


function missionFolderMapState(mapState: MissionMapState | undefined, missionId: string): MissionMapState {
  const normalized = normalizeMissionMapState(mapState ?? { markers: [], drawings: [] });
  const scoped = mapStateForMission(normalized, missionId);
  return {
    markers: scoped.markers.map(({ note: _note, ...marker }) => marker),
    drawings: scoped.drawings.map(({ note: _note, ...drawing }) => drawing),
  };
}

function missionFolderMapText(mapState: MissionMapState) {
  return {
    markers: mapState.markers.map((marker) => ({ label: marker.label })),
    drawings: mapState.drawings.map((drawing) => ({ label: drawing.label })),
  };
}

function belongsToMission(linkedMissionId: string | undefined, missionId: string) {
  return !linkedMissionId || linkedMissionId === missionId;
}

function missionFolderChecklists(checklists: OperationalChecklist[], mission: MissionContext) {
  const activeIds = new Set(mission.activeChecklistIds ?? []);
  if (activeIds.size === 0) return checklists;
  const scoped = checklists.filter((checklist) => activeIds.has(checklist.slug));
  return scoped.length > 0 ? scoped : checklists;
}

function missionFolderFieldLogEntries(mission: MissionContext) {
  return (mission.fieldLogEntries ?? [])
    .filter((entry) => belongsToMission(entry.linkedMissionId, mission.id))
    .map((entry) => ({
      ...entry,
      linkedMissionId: undefined,
    }));
}

function missionFolderRuhReports(mission: MissionContext) {
  return (mission.ruhReports ?? [])
    .filter((report) => belongsToMission(report.linkedMissionId, mission.id))
    .map((report) => ({
      ...report,
      linkedMissionId: undefined,
    }));
}

export function buildMissionFolderExport(input: {
  mission: MissionContext;
  checklists: OperationalChecklist[];
  checklistRuns: ChecklistRun[];
  mapState?: MissionMapState;
  mapPackage?: unknown;
  generatedAt?: string;
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const mapState = missionFolderMapState(input.mapState, input.mission.id);
  const fieldLogEntries = missionFolderFieldLogEntries(input.mission);
  const scopedMission = {
    ...input.mission,
    fieldLogEntries,
    ruhReports: missionFolderRuhReports(input.mission),
  };
  const checklists = missionFolderChecklists(input.checklists, input.mission);
  const reportMapPackage = sanitizeLocalMapPackageSummary(input.mapPackage);
  const mapPackage = reportMapPackage ? {
    packageId: reportMapPackage.id,
    title: reportMapPackage.title,
    attribution: reportMapPackage.attribution,
    version: reportMapPackage.version,
    provenance: reportMapPackage.provenance,
  } : undefined;
  assertNoSensitiveOperationalTextInValue({
    mission: {
      ...scopedMission,
      externalSignals: undefined,
      externalSignalHistory: undefined,
    },
    checklistRuns: input.checklistRuns.map((run) => ({ notesByItemId: run.notesByItemId })),
    mapState: missionFolderMapText(mapState),
    mapPackage: mapPackage ? {
      title: mapPackage.title,
      attribution: mapPackage.attribution,
      provenance: mapPackage.provenance,
    } : undefined,
  }, 'missionFolder');
  const afterActionReport = buildAfterActionReport({
    mission: scopedMission,
    checklists,
    checklistRuns: input.checklistRuns,
    mapState,
    mapPackage: reportMapPackage,
    generatedAt,
  });

  return {
    schemaVersion: MISSION_FOLDER_SCHEMA_VERSION,
    generatedAt,
    warnings: [MISSION_FOLDER_WARNING],
    mission: missionSummary(input.mission),
    artifacts: {
      afterActionMarkdown: exportAfterActionMarkdown(afterActionReport),
      fieldLogMarkdown: exportFieldLogMarkdown({ mission: scopedMission, entries: fieldLogEntries }),
      mapGeoJson: geoJsonExportText(mapState),
      mapSvg: buildMapImageSvg(mapState),
      mapFeatureCollection: buildGeoJsonExport(mapState),
      mapPackage,
    },
  };
}

export type MissionFolderExport = ReturnType<typeof buildMissionFolderExport>;

export function exportMissionFolderMarkdown(bundle: MissionFolderExport) {
  const mapPackageLines = bundle.artifacts.mapPackage ? [
    '## Kartpakke',
    `- Tittel: ${bundle.artifacts.mapPackage.title}`,
    `- Pakke-ID: ${bundle.artifacts.mapPackage.packageId}`,
    `- Versjon: ${bundle.artifacts.mapPackage.version}`,
    `- Attribusjon: ${bundle.artifacts.mapPackage.attribution}`,
    `- Opprinnelse/proveniens: ${bundle.artifacts.mapPackage.provenance}`,
    '',
  ] : [];
  return [
    '# Oppdragsmappe',
    '',
    ...bundle.warnings.map((warning) => `> ${warning}`),
    '',
    `- Oppdrag: ${bundle.mission.title}`,
    `- Fase/rolle/scenario: ${bundle.mission.phase} / ${bundle.mission.role} / ${bundle.mission.scenario}`,
    `- Sted: ${bundle.mission.locationText}`,
    `- Generert: ${bundle.generatedAt}`,
    '',
    '## Innhold',
    '- Etterrapport Markdown',
    '- Feltlogg Markdown',
    '- Sanitert GeoJSON',
    '- Sanitert SVG kartbilde',
    '',
    ...mapPackageLines,
    '## Etterrapport',
    bundle.artifacts.afterActionMarkdown.trim(),
    '',
    '## Feltlogg',
    bundle.artifacts.fieldLogMarkdown.trim(),
    '',
  ].join('\n') + '\n';
}
