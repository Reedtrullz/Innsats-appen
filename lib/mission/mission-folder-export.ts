import type { OperationalChecklist } from '@/lib/content/schemas';
import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';
import { buildGeoJsonExport, buildMapImageSvg, geoJsonExportText, mapStateForMission, normalizeMissionMapState, type MissionMapState } from '@/lib/maps/operations-map';
import { buildAfterActionReport, exportAfterActionMarkdown } from './after-action-report';
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

function missionFolderFieldLogEntries(mission: MissionContext) {
  return (mission.fieldLogEntries ?? []).map((entry) => ({
    ...entry,
    linkedMissionId: undefined,
  }));
}

export function buildMissionFolderExport(input: {
  mission: MissionContext;
  checklists: OperationalChecklist[];
  checklistRuns: ChecklistRun[];
  mapState?: MissionMapState;
  generatedAt?: string;
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const mapState = missionFolderMapState(input.mapState, input.mission.id);
  assertNoSensitiveOperationalTextInValue({
    mission: {
      ...input.mission,
      externalSignals: undefined,
      externalSignalHistory: undefined,
    },
    checklistRuns: input.checklistRuns.map((run) => ({ notesByItemId: run.notesByItemId })),
    mapState: missionFolderMapText(mapState),
  }, 'missionFolder');
  const afterActionReport = buildAfterActionReport({
    mission: input.mission,
    checklists: input.checklists,
    checklistRuns: input.checklistRuns,
    mapState,
    generatedAt,
  });

  return {
    schemaVersion: MISSION_FOLDER_SCHEMA_VERSION,
    generatedAt,
    warnings: [MISSION_FOLDER_WARNING],
    mission: missionSummary(input.mission),
    artifacts: {
      afterActionMarkdown: exportAfterActionMarkdown(afterActionReport),
      fieldLogMarkdown: exportFieldLogMarkdown({ mission: input.mission, entries: missionFolderFieldLogEntries(input.mission) }),
      mapGeoJson: geoJsonExportText(mapState),
      mapSvg: buildMapImageSvg(mapState),
      mapFeatureCollection: buildGeoJsonExport(mapState),
    },
  };
}

export type MissionFolderExport = ReturnType<typeof buildMissionFolderExport>;

export function exportMissionFolderMarkdown(bundle: MissionFolderExport) {
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
    '## Etterrapport',
    bundle.artifacts.afterActionMarkdown.trim(),
    '',
    '## Feltlogg',
    bundle.artifacts.fieldLogMarkdown.trim(),
    '',
  ].join('\n') + '\n';
}
