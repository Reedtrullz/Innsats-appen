import { buildMissionFolderExport, exportMissionFolderMarkdown } from '@/lib/mission/mission-folder-export';
import type { MissionContext } from '@/lib/mission/schemas';

const mission: MissionContext = {
  id: 'folder-mission',
  title: 'Oppdragsmappe test',
  createdAt: '2026-06-04T08:00:00.000Z',
  updatedAt: '2026-06-04T10:00:00.000Z',
  phase: 'etter',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Lokalt område',
  externalSignals: [],
  externalSignalHistory: [],
  activeChecklistIds: [],
  notes: 'Kort lokal oppsummering',
  tasks: [],
  statusLog: [],
  resourceRequests: [],
  fieldLogEntries: [
    { id: 'field-folder', timestamp: '2026-06-04T09:15:00.000Z', category: 'observasjon', text: 'Logg uten oppdrags-ID', criticalObservation: false, mustBeForwarded: false, linkedMissionId: 'folder-mission' },
  ],
  ruhReports: [],
  welfareChecks: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
};

it('builds a local mission folder bundle with map artifacts and privacy warnings', () => {
  const bundle = buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapState: {
      markers: [{ id: 'marker-1', missionId: mission.id, itemType: 'marker', kind: 'observation', label: 'Observasjon', point: { x: 10, y: 20 }, note: 'rawRef lat lon should not export', createdAt: '2026-06-04T09:00:00.000Z' }],
      drawings: [],
    },
    generatedAt: '2026-06-04T11:00:00.000Z',
  });

  expect(bundle.schemaVersion).toBe(1);
  expect(bundle.warnings.join(' ')).toMatch(/lokal/i);
  expect(bundle.warnings.join(' ')).toMatch(/ikke offisiell/i);
  expect(bundle.warnings.join(' ')).toMatch(/persondata/i);
  expect(bundle.mission.title).toBe('Oppdragsmappe test');
  expect(bundle.artifacts.mapGeoJson).toContain('schematic-0-100-local-only');
  expect(bundle.artifacts.mapFeatureCollection.coordinateSystem).toBe('schematic-0-100-local-only');
  expect(bundle.artifacts.mapFeatureCollection.features[0]?.geometry.type).toBe('Point');
  expect(bundle.artifacts.mapSvg).toContain('Sanitert lokalt kartbilde');
  // GeoJSON necessarily contains `geometry`; the privacy guard is that it is explicitly schematic 0-100 local-only and never lat/lon/raw external data.
  expect(bundle.artifacts.fieldLogMarkdown).toContain('Logg uten oppdrags-ID');
  expect(JSON.stringify(bundle)).not.toContain('folder-mission');
  expect(JSON.stringify(bundle)).not.toContain('rawRef lat lon should not export');
  expect(JSON.stringify(bundle)).not.toMatch(/indexedDB|objectStore|GPSLatitude|GPSLongitude|"lat"|"lon"|"rawRef"/i);

  const markdown = exportMissionFolderMarkdown(bundle);
  expect(markdown).toContain('# Oppdragsmappe');
  expect(markdown).toContain('Oppdragsmappe test');
  expect(markdown).toContain('Sanitert GeoJSON');
});

it('excludes unrelated other missions from the current mission folder map artifacts', () => {
  const bundle = buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapState: {
      markers: [
        { id: 'marker-current', missionId: mission.id, itemType: 'marker', kind: 'observation', label: 'Current', point: { x: 10, y: 20 }, note: 'current note should not export', createdAt: '2026-06-04T09:00:00.000Z' },
        { id: 'marker-wrong', missionId: 'other-mission', itemType: 'marker', kind: 'observation', label: 'Wrong', point: { x: 30, y: 40 }, note: 'wrong note should not export', createdAt: '2026-06-04T09:01:00.000Z' },
      ],
      drawings: [
        { id: 'drawing-current', missionId: mission.id, itemType: 'drawing', kind: 'sector', label: 'Current sector', points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 20, y: 30 }], note: 'current drawing note should not export', createdAt: '2026-06-04T09:10:00.000Z' },
        { id: 'drawing-wrong', missionId: 'other-mission', itemType: 'drawing', kind: 'sector', label: 'Wrong sector', points: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 50, y: 60 }], note: 'wrong drawing note should not export', createdAt: '2026-06-04T09:11:00.000Z' },
      ],
    },
    generatedAt: '2026-06-04T11:00:00.000Z',
  });

  expect(bundle.artifacts.mapGeoJson).toContain('Current');
  expect(bundle.artifacts.mapGeoJson).toContain('Current sector');
  expect(bundle.artifacts.mapGeoJson).not.toContain('Wrong');
  expect(bundle.artifacts.mapSvg).toContain('Current');
  expect(bundle.artifacts.mapSvg).toContain('Current sector');
  expect(bundle.artifacts.mapSvg).not.toContain('Wrong');
  expect(bundle.artifacts.afterActionMarkdown).toContain('Current');
  expect(bundle.artifacts.afterActionMarkdown).toContain('Current sector');
  expect(bundle.artifacts.afterActionMarkdown).not.toContain('Wrong');
  expect(bundle.artifacts.mapFeatureCollection.features.map((feature) => feature.properties.label)).toEqual(['Current', 'Current sector']);
  expect(JSON.stringify(bundle)).not.toMatch(/current note|wrong note|folder-mission|other-mission|missionId/i);
});
