import type { OperationalChecklist } from '@/lib/content/schemas';
import { buildMissionFolderExport, exportMissionFolderMarkdown } from '@/lib/mission/mission-folder-export';
import type { ChecklistRun, MissionContext } from '@/lib/mission/schemas';

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

it('includes sanitized map package provenance in mission-folder exports', () => {
  const unsafeMapPackage = {
    id: 'trondheim-lokal',
    title: 'Trondheim lokalpakke',
    attribution: 'Demo attribution',
    version: '2026.06-a',
    provenance: 'Local training package bundled with app',
    runtimeFormat: 'pmtiles',
    approvedForOfflineUse: true,
    url: '/map-packages/trondheim-demo.pmtiles',
    styleUrl: '/map-packages/trondheim-demo-style.json',
    tileUrl: 'https://tiles.example.invalid/{z}/{x}/{y}.pbf',
    bounds: [10.2, 63.2, 10.6, 63.6],
    center: [10.4, 63.4],
  };

  const bundle = buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapPackage: unsafeMapPackage,
    generatedAt: '2026-06-04T11:00:00.000Z',
  });

  expect(bundle.artifacts.mapPackage).toEqual({
    packageId: 'trondheim-lokal',
    title: 'Trondheim lokalpakke',
    attribution: 'Demo attribution',
    version: '2026.06-a',
    provenance: 'Local training package bundled with app',
  });
  expect(JSON.stringify(bundle.artifacts.mapPackage)).not.toContain('"id"');

  const markdown = exportMissionFolderMarkdown(bundle);
  expect(markdown).toContain('## Kartpakke');
  expect(markdown).toContain('Pakke-ID: trondheim-lokal');
  expect(markdown).toContain('Trondheim lokalpakke');
  expect(markdown).toContain('Demo attribution');
  expect(markdown).toContain('Local training package bundled with app');

  for (const exported of [JSON.stringify(bundle), markdown]) {
    expect(exported).not.toContain('https://');
    expect(exported).not.toContain('/map-packages/trondheim-demo.pmtiles');
    expect(exported).not.toContain('/map-packages/trondheim-demo-style.json');
    expect(exported).not.toContain('styleUrl');
    expect(exported).not.toContain('tileUrl');
    expect(exported).not.toContain('bounds');
    expect(exported).not.toContain('center');
  }
});

it('omits unsafe map package ids while preserving useful provenance in mission-folder exports', () => {
  const bundle = buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapPackage: {
      id: 'https://tiles.example.invalid/foo.pmtiles',
      title: '  Sanitert lokal kartpakke  ',
      attribution: '  Demo attribution  ',
      version: '  2026.06-a  ',
      provenance: '  Kontrollert opprinnelse for øving  ',
      url: '/map-packages/foo.pmtiles',
      styleUrl: '/map-packages/foo-style.json',
      tileUrl: 'https://tiles.example.invalid/{z}/{x}/{y}.pbf',
      bounds: [10.2, 63.2, 10.6, 63.6],
      center: [10.4, 63.4],
      objectId: 'marker-secret-object',
    },
    generatedAt: '2026-06-04T11:00:00.000Z',
  });

  expect(bundle.artifacts.mapPackage).toEqual({
    packageId: '',
    title: 'Sanitert lokal kartpakke',
    attribution: 'Demo attribution',
    version: '2026.06-a',
    provenance: 'Kontrollert opprinnelse for øving',
  });

  const markdown = exportMissionFolderMarkdown(bundle);
  for (const exported of [JSON.stringify(bundle), markdown]) {
    expect(exported).toContain('Sanitert lokal kartpakke');
    expect(exported).toContain('Kontrollert opprinnelse for øving');
    expect(exported).not.toContain('https://tiles.example.invalid/foo.pmtiles');
    expect(exported).not.toContain('/map-packages/foo.pmtiles');
    expect(exported).not.toContain('/map-packages/foo-style.json');
    expect(exported).not.toContain('marker-secret-object');
    expect(exported).not.toContain('styleUrl');
    expect(exported).not.toContain('tileUrl');
    expect(exported).not.toContain('bounds');
    expect(exported).not.toContain('center');
    expect(exported).not.toContain('objectId');
  }
});

it('strips URL and path-like content from mission-folder map package text fields', () => {
  const bundle = buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapPackage: {
      id: 'trondheim-lokal',
      title: 'https://tiles.example.invalid/foo',
      attribution: '/map-packages/foo-style.json',
      version: 'https://tiles.example.invalid/pkg.pmtiles',
      provenance: 'Kontrollert lokal øvingsproveniens',
      runtimeFormat: 'pmtiles',
      approvedForOfflineUse: true,
    },
    generatedAt: '2026-06-04T11:00:00.000Z',
  });

  expect(bundle.artifacts.mapPackage).toEqual({
    packageId: 'trondheim-lokal',
    title: '',
    attribution: '',
    version: '',
    provenance: 'Kontrollert lokal øvingsproveniens',
  });
  for (const exported of [JSON.stringify(bundle), exportMissionFolderMarkdown(bundle)]) {
    expect(exported).not.toContain('https://');
    expect(exported).not.toContain('/map-packages/foo-style.json');
    expect(exported).not.toContain('pkg.pmtiles');
    expect(exported).toContain('Kontrollert lokal øvingsproveniens');
  }
});

it('does not create mission-folder map package artifacts from id-only input', () => {
  const bundle = buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapPackage: { id: 'trondheim-lokal' },
    generatedAt: '2026-06-04T11:00:00.000Z',
  });

  expect(bundle.artifacts.mapPackage).toBeUndefined();
  expect(JSON.stringify(bundle)).not.toContain('mapPackage');
  expect(exportMissionFolderMarkdown(bundle)).not.toContain('## Kartpakke');
});

it('does not create mission-folder map package artifacts from attribution-version-only input', () => {
  const bundle = buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapPackage: { attribution: 'Demo attribution', version: '2026.06-a' },
    generatedAt: '2026-06-04T11:00:00.000Z',
  });

  expect(bundle.artifacts.mapPackage).toBeUndefined();
  expect(exportMissionFolderMarkdown(bundle)).not.toContain('## Kartpakke');
});

it('filters mission-folder checklists to active mission IDs and hides internal checklist identifiers', () => {
  const scopedChecklists: OperationalChecklist[] = [
    {
      slug: 'active-checklist',
      title: 'Aktiv sjekkliste',
      phase: 'etter',
      roles: ['lagforer'],
      scenarios: ['generelt'],
      sourceIds: ['src-active-checklist'],
      items: [{ id: 'active-required-item', label: 'Aktivt påkrevd punkt', required: true, sourceIds: ['src-active-checklist'] }],
    },
    {
      slug: 'unrelated-checklist',
      title: 'Urelatert sjekkliste',
      phase: 'etter',
      roles: ['lagforer'],
      scenarios: ['generelt'],
      sourceIds: ['src-unrelated-checklist'],
      items: [{ id: 'unrelated-required-item', label: 'Urelatert påkrevd punkt', required: true, sourceIds: ['src-unrelated-checklist'] }],
    },
  ];
  const scopedRuns: ChecklistRun[] = [
    { id: 'run-active', missionId: mission.id, templateSlug: 'active-checklist', checkedItemIds: [], notesByItemId: {}, equipmentStatusByItemId: {}, updatedAt: '2026-06-04T10:00:00.000Z', schemaVersion: 1 },
    { id: 'run-unrelated', missionId: mission.id, templateSlug: 'unrelated-checklist', checkedItemIds: [], notesByItemId: {}, equipmentStatusByItemId: {}, updatedAt: '2026-06-04T10:00:00.000Z', schemaVersion: 1 },
  ];

  const bundle = buildMissionFolderExport({
    mission: { ...mission, activeChecklistIds: ['active-checklist'] },
    checklists: scopedChecklists,
    checklistRuns: scopedRuns,
    generatedAt: '2026-06-04T11:00:00.000Z',
  });
  const exported = `${JSON.stringify(bundle)}\n${exportMissionFolderMarkdown(bundle)}`;

  expect(exported).toContain('Aktiv sjekkliste');
  expect(exported).toContain('Aktivt påkrevd punkt');
  expect(exported).not.toContain('Urelatert sjekkliste');
  expect(exported).not.toContain('Urelatert påkrevd punkt');
  expect(exported).not.toContain('active-checklist');
  expect(exported).not.toContain('unrelated-checklist');
  expect(exported).not.toContain('src-active-checklist');
  expect(exported).not.toContain('sourceIds');
});

it('excludes field logs linked to another mission from mission-folder exports', () => {
  const bundle = buildMissionFolderExport({
    mission: {
      ...mission,
      fieldLogEntries: [
        { id: 'field-current-folder-scope', timestamp: '2026-06-04T09:15:00.000Z', category: 'observasjon', text: 'Current folder log retained', criticalObservation: false, mustBeForwarded: false, linkedMissionId: mission.id },
        { id: 'field-other-folder-scope', timestamp: '2026-06-04T09:20:00.000Z', category: 'hms-avvik', text: 'Other folder log must not export', criticalObservation: true, mustBeForwarded: true, linkedMissionId: 'other-mission' },
      ],
    },
    checklists: [],
    checklistRuns: [],
    generatedAt: '2026-06-04T11:00:00.000Z',
  });
  const exported = `${JSON.stringify(bundle)}\n${exportMissionFolderMarkdown(bundle)}`;

  expect(exported).toContain('Current folder log retained');
  expect(exported).not.toContain('Other folder log must not export');
  expect(exported).not.toContain('other-mission');
  expect(exported).not.toContain('field-other-folder-scope');
});

it('blocks inline Markdown and HTML injection from mission-folder map package text fields', () => {
  const bundle = buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapPackage: {
      id: 'trondheim-lokal',
      title: '[Kart](javascript:alert(1))',
      attribution: '<svg onload=alert(1)>',
      version: '<v1>',
      provenance: '<img src=x onerror=alert(1)>',
    },
    generatedAt: '2026-06-04T11:00:00.000Z',
  });

  for (const exported of [JSON.stringify(bundle), exportMissionFolderMarkdown(bundle)]) {
    expect(exported).not.toContain('javascript:');
    expect(exported).not.toContain('[Kart](');
    expect(exported).not.toContain('<img');
    expect(exported).not.toContain('<svg onload');
    expect(exported).not.toContain('onerror=');
    expect(exported).not.toContain('onload=');
  }
});

it('rejects mission folder export when included field log contains high-confidence sensitive free text', () => {
  expect(() => buildMissionFolderExport({
    mission: {
      ...mission,
      fieldLogEntries: [
        { id: 'field-sensitive-folder', timestamp: '2026-06-04T09:15:00.000Z', category: 'observasjon', text: 'pasient Ola Nordmann', criticalObservation: false, mustBeForwarded: false },
      ],
    },
    checklists: [],
    checklistRuns: [],
    generatedAt: '2026-06-04T11:00:00.000Z',
  })).toThrow(/missionFolder\.mission\.fieldLogEntries\[0\]\.text|fieldLog\.entries\[0\]\.text/i);
});

it('rejects sensitive map labels in mission-folder artifacts even beyond after-action summary limits', () => {
  const markers = Array.from({ length: 11 }, (_, index) => ({
    id: `marker-${index}`,
    missionId: mission.id,
    itemType: 'marker' as const,
    kind: 'observation' as const,
    label: index === 10 ? 'pasient Ola Nordmann' : `Trygg markør ${index}`,
    point: { x: 10 + index, y: 20 },
    createdAt: '2026-06-04T09:00:00.000Z',
  }));

  expect(() => buildMissionFolderExport({
    mission,
    checklists: [],
    checklistRuns: [],
    mapState: { markers, drawings: [] },
    generatedAt: '2026-06-04T11:00:00.000Z',
  })).toThrow(/missionFolder\.mapState\.markers\[10\]\.label/i);
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
  const featureLabels = (bundle.artifacts.mapFeatureCollection.features as Array<{ properties: { label: string } }>).map((feature) => feature.properties.label);
  expect(featureLabels).toEqual(['Current', 'Current sector']);
  expect(JSON.stringify(bundle)).not.toMatch(/current note|wrong note|folder-mission|other-mission|missionId/i);
});
