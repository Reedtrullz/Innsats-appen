import {
  BLUE_FORCE_TRACKING_RESEARCH,
  KML_IMPORT_EVALUATION,
  LOCATION_EXPORT_PRIVACY_WARNING,
  MAP_MARKER_KINDS,
  MAX_POINTS_PER_DRAWING,
  OPERATIONS_MAP_STORAGE_KEY,
  SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
  QR_SECTOR_IMPORT_DESIGN,
  buildGeoJsonExport,
  buildMapImageSvg,
  createMissionMapDrawing,
  createMissionMapMarker,
  filterMissionMapStateByLayers,
  geoJsonExportText,
  importGeoJsonText,
  measureDrawingDistance,
  mapStateForMission,
  measurePolygonArea,
  mergeMissionMapState,
  normalizeMissionMapState,
  operationItemsForRender,
  readMissionMapState,
  resetMissionMapState,
  deleteMissionMapObject,
  updateMissionMapDrawing,
  updateMissionMapMarker,
  writeMissionMapState,
  type MissionMapState,
} from '@/lib/maps/operations-map';

const now = new Date('2026-06-04T12:00:00.000Z');

it('supports all operational marker kinds with sanitized local schematic coordinates', () => {
  expect(MAP_MARKER_KINDS).toEqual(['incident-site', 'hazard', 'resource', 'meeting-point', 'il-ko', 'pump-location', 'observation']);
  const marker = createMissionMapMarker({ kind: 'incident-site', label: '<Hendelse>  alfa', x: '45', y: 60, note: 'ingen\npersondata' }, now);
  expect(marker).toMatchObject({ itemType: 'marker', kind: 'incident-site', label: 'Hendelse alfa', point: { x: 45, y: 60 }, note: 'ingen persondata' });
  expect(() => createMissionMapMarker({ kind: 'hazard', label: 'Utenfor', x: 101, y: 20 }, now)).toThrow(/0 to 100/);
});

it('creates drawings and measures distance and sector area', () => {
  const line = createMissionMapDrawing({ kind: 'line', label: 'Linje', coordinates: '0,0 3,4' }, now);
  expect(measureDrawingDistance(line.points)).toBe(5);
  const sector = createMissionMapDrawing({ kind: 'sector', label: 'Teig A', coordinates: '0,0 10,0 10,10 0,10' }, now);
  expect(measurePolygonArea(sector.points)).toBe(100);
  expect(measureDrawingDistance(sector.points, true)).toBe(40);
  expect(() => createMissionMapDrawing({ kind: 'polygon', label: 'Feil', coordinates: '1,1 2,2' }, now)).toThrow(/at least 3/);
});

it('preserves legacy map objects without mission id but marks them unscoped', () => {
  const state = normalizeMissionMapState({
    markers: [{ id: 'old', itemType: 'marker', kind: 'hazard', label: 'Old', point: { x: 10, y: 10 }, createdAt: '2026-06-04T10:00:00.000Z' }],
    drawings: [{ id: 'old-sector', itemType: 'drawing', kind: 'sector', label: 'Old sector', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], createdAt: '2026-06-04T10:00:00.000Z' }],
  });

  expect(state.markers[0].missionId).toBeUndefined();
  expect(state.drawings[0].missionId).toBeUndefined();
  expect(mapStateForMission(state, 'mission-a').markers).toHaveLength(0);
  expect(mapStateForMission(state, 'mission-a').drawings).toHaveLength(0);
});

it('keeps mission ids on imported map state', () => {
  const state = normalizeMissionMapState({
    markers: [{ id: 'm1', missionId: 'mission-a', itemType: 'marker', kind: 'hazard', label: 'Fare', point: { x: 10, y: 10 }, createdAt: '2026-06-04T10:00:00.000Z' }],
    drawings: [{ id: 'd1', missionId: 'mission-a', itemType: 'drawing', kind: 'sector', label: 'Teig', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], createdAt: '2026-06-04T10:00:00.000Z' }],
  });

  expect(mapStateForMission(state, 'mission-a').markers).toHaveLength(1);
  expect(mapStateForMission(state, 'mission-a').drawings).toHaveLength(1);
});

it('updates only the matching marker inside the same mission', () => {
  const state = normalizeMissionMapState({
    markers: [
      { id: 'a', missionId: 'mission-a', itemType: 'marker', kind: 'hazard', label: 'Old', point: { x: 10, y: 20 }, createdAt: '2026-06-05T10:00:00.000Z' },
      { id: 'b', missionId: 'mission-b', itemType: 'marker', kind: 'resource', label: 'Other mission', point: { x: 80, y: 20 }, createdAt: '2026-06-05T10:00:00.000Z' },
    ],
    drawings: [],
  });

  const next = updateMissionMapMarker(state, 'mission-a', 'a', { label: 'Updated', point: { x: 12, y: 24 } });

  expect(next.markers.find((marker) => marker.id === 'a')).toMatchObject({ label: 'Updated', point: { x: 12, y: 24 } });
  expect(next.markers.find((marker) => marker.id === 'b')?.label).toBe('Other mission');
});

it('updates only the matching drawing inside the same mission and keeps invalid patches unchanged', () => {
  const state = normalizeMissionMapState({
    markers: [],
    drawings: [
      { id: 'shared', missionId: 'mission-a', itemType: 'drawing', kind: 'sector', label: 'A sector', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }], createdAt: '2026-06-05T10:00:00.000Z' },
      { id: 'shared', missionId: 'mission-b', itemType: 'drawing', kind: 'sector', label: 'B sector', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 10 }], createdAt: '2026-06-05T10:00:00.000Z' },
      { id: 'other', missionId: 'mission-b', itemType: 'drawing', kind: 'sector', label: 'Other B sector', points: [{ x: 11, y: 11 }, { x: 21, y: 21 }, { x: 31, y: 11 }], createdAt: '2026-06-05T10:00:00.000Z' },
    ],
  });

  const updated = updateMissionMapDrawing(state, 'mission-a', 'shared', { label: 'Updated sector', points: [{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 6, y: 4 }] });
  expect(updated.drawings.find((drawing) => drawing.id === 'shared' && drawing.missionId === 'mission-a')).toMatchObject({ label: 'Updated sector', points: [{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 6, y: 4 }] });
  expect(updated.drawings.find((drawing) => drawing.id === 'shared' && drawing.missionId === 'mission-b')?.label).toBe('B sector');
  expect(updated.drawings.find((drawing) => drawing.id === 'other')?.label).toBe('Other B sector');

  const invalid = updateMissionMapDrawing(updated, 'mission-a', 'shared', { kind: 'sector', points: [{ x: 4, y: 4 }, { x: 5, y: 5 }] });
  expect(invalid.drawings.find((drawing) => drawing.id === 'shared' && drawing.missionId === 'mission-a')).toMatchObject({ label: 'Updated sector', points: [{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 6, y: 4 }] });
});

it('deletes drawings only inside the active mission', () => {
  const state = normalizeMissionMapState({
    markers: [],
    drawings: [
      { id: 'a', missionId: 'mission-a', itemType: 'drawing', kind: 'sector', label: 'A sector', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }], createdAt: '2026-06-05T10:00:00.000Z' },
      { id: 'b', missionId: 'mission-b', itemType: 'drawing', kind: 'sector', label: 'B sector', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 10 }], createdAt: '2026-06-05T10:00:00.000Z' },
    ],
  });

  const next = deleteMissionMapObject(state, 'mission-a', 'a');

  expect(next.drawings.map((drawing) => drawing.id)).toEqual(['b']);
});

it('filters layers and caps rendered local operations', () => {
  const state: MissionMapState = {
    markers: [
      createMissionMapMarker({ kind: 'hazard', label: 'Fare', x: 10, y: 10 }, now),
      createMissionMapMarker({ kind: 'resource', label: 'Ressurs', x: 20, y: 20 }, now),
    ],
    drawings: [createMissionMapDrawing({ kind: 'sector', label: 'Teig', coordinates: '0,0 10,0 10,10' }, now)],
  };
  expect(filterMissionMapStateByLayers(state, ['hazard', 'sector']).markers.map((marker) => marker.kind)).toEqual(['hazard']);
  expect(filterMissionMapStateByLayers(state, ['hazard', 'sector']).drawings).toHaveLength(1);
  expect(operationItemsForRender({ markers: Array.from({ length: 30 }, (_, index) => createMissionMapMarker({ kind: 'observation', label: `O${index}`, x: index, y: index }, now)), drawings: [] })).toHaveLength(20);
});

it('persists and resets local map state without backend sync', () => {
  const storage = new Map<string, string>();
  const localStorageLike = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };
  const state: MissionMapState = { markers: [createMissionMapMarker({ kind: 'meeting-point', label: 'MP', x: 30, y: 30 }, now)], drawings: [] };
  writeMissionMapState(state, localStorageLike);
  expect(storage.get(OPERATIONS_MAP_STORAGE_KEY)).toContain('meeting-point');
  expect(readMissionMapState(localStorageLike).markers[0]?.kind).toBe('meeting-point');
  resetMissionMapState(localStorageLike);
  expect(readMissionMapState(localStorageLike).markers).toHaveLength(0);
});

it('exports sanitized schematic GeoJSON and imports only supported local fields', () => {
  const state: MissionMapState = {
    markers: [createMissionMapMarker({ kind: 'pump-location', label: 'Pumpe <A>', x: 12, y: 18, note: 'lokal' }, now)],
    drawings: [createMissionMapDrawing({ kind: 'polygon', label: 'Polygon', coordinates: '0,0 4,0 4,4' }, now)],
  };
  const exported = buildGeoJsonExport(state);
  expect(exported.privacyWarning).toBe(LOCATION_EXPORT_PRIVACY_WARNING);
  expect(exported.coordinateSystem).toBe('schematic-0-100-local-only');
  expect(geoJsonExportText(state)).toContain('FeatureCollection');
  expect(JSON.stringify(exported)).not.toMatch(/\"note\"/);

  const geoJson = JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33, 999] }, properties: { itemType: 'marker', kind: 'il-ko', label: '<KO>', secret: 'drop-me' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [200, 33] }, properties: { itemType: 'marker', kind: 'hazard', label: 'bad' } },
    ],
  });
  expect(importGeoJsonText(geoJson, now)).toEqual({ markers: [], drawings: [] });

  const imported = importGeoJsonText(geoJson, now, 'mission-import-a');
  expect(imported.markers).toHaveLength(1);
  expect(imported.markers[0]).toMatchObject({ missionId: 'mission-import-a', kind: 'il-ko', label: 'KO', point: { x: 22, y: 33 } });
  expect(JSON.stringify(imported)).not.toContain('drop-me');
});

it('rejects sensitive text in local map markers and drawings before storage', () => {
  expect(() => createMissionMapMarker({ kind: 'observation', label: '01017000027', x: 10, y: 20 }, now)).toThrow(/persondata|identifikator|pasientdata|private/i);
  expect(() => createMissionMapMarker({ kind: 'observation', label: 'Obs', x: 10, y: 20, note: 'kontakt ola.nordmann@example.com' }, now)).toThrow(/persondata|kontakt|private/i);
  expect(() => createMissionMapDrawing({ kind: 'sector', label: 'pasient Ola Nordmann', coordinates: '0,0 10,0 10,10' }, now)).toThrow(/persondata|pasientdata/i);
});

it('checks sensitive map text before truncating long labels and notes', () => {
  const longLabelWithLateFnr = `${'A'.repeat(130)} 01017000027`;
  const longNoteWithLateContact = `${'N'.repeat(250)} kontakt ola.nordmann@example.com`;
  expect(() => createMissionMapMarker({ kind: 'observation', label: longLabelWithLateFnr, x: 10, y: 20 }, now)).toThrow(/persondata|identifikator|pasientdata|private/i);
  expect(() => createMissionMapMarker({ kind: 'observation', label: 'Obs', note: longNoteWithLateContact, x: 10, y: 20 }, now)).toThrow(/persondata|kontakt|private/i);
  expect(normalizeMissionMapState({ markers: [{ id: 'unsafe-long', itemType: 'marker', kind: 'observation', label: longLabelWithLateFnr, point: { x: 10, y: 20 }, createdAt: now.toISOString() }], drawings: [] })).toEqual({ markers: [], drawings: [] });
  expect(() => buildGeoJsonExport({ markers: [{ id: 'unsafe-export', itemType: 'marker', kind: 'observation', label: longLabelWithLateFnr, point: { x: 10, y: 20 }, createdAt: now.toISOString() }], drawings: [] })).toThrow(/persondata|identifikator|private/i);
});

it('rejects sensitive text in map object update patches', () => {
  const state: MissionMapState = {
    markers: [createMissionMapMarker({ kind: 'observation', missionId: 'mission-a', label: 'Obs', x: 10, y: 20 }, now)],
    drawings: [createMissionMapDrawing({ kind: 'sector', missionId: 'mission-a', label: 'Teig', coordinates: '0,0 10,0 10,10' }, now)],
  };
  expect(() => updateMissionMapMarker(state, 'mission-a', state.markers[0].id, { note: 'kontakt ola.nordmann@example.com' })).toThrow(/persondata|kontakt|private/i);
  expect(() => updateMissionMapDrawing(state, 'mission-a', state.drawings[0].id, { label: '01017000027' })).toThrow(/persondata|identifikator|private/i);
});

it('skips only unsafe GeoJSON features and continues importing safe local features', () => {
  const imported = importGeoJsonText(JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'il-ko', label: '01017000027' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [44, 55] }, properties: { itemType: 'marker', kind: 'observation', label: 'Trygg observasjon', note: 'kontakt ola.nordmann@example.com' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [66, 77] }, properties: { itemType: 'marker', kind: 'observation', label: 'Trygg observasjon' } },
    ],
  }), now, 'mission-a');

  expect(imported.markers).toHaveLength(1);
  expect(imported.markers[0]).toMatchObject({ missionId: 'mission-a', kind: 'observation', label: 'Trygg observasjon', point: { x: 66, y: 77 } });
});

it('drops unsafe legacy local map objects during normalization, storage and merge', () => {
  const safeMarker = createMissionMapMarker({ kind: 'observation', missionId: 'mission-a', label: 'Trygg observasjon', x: 10, y: 20 }, now);
  const unsafeMarker = { ...safeMarker, id: 'unsafe-marker', label: '01017000027' };
  const unsafeDrawing = { ...createMissionMapDrawing({ kind: 'sector', missionId: 'mission-a', label: 'Trygg teig', coordinates: '0,0 10,0 10,10' }, now), id: 'unsafe-drawing', note: 'kontakt ola.nordmann@example.com' };

  expect(normalizeMissionMapState({ markers: [safeMarker, unsafeMarker], drawings: [unsafeDrawing] })).toEqual({ markers: [safeMarker], drawings: [] });

  const storage = new Map<string, string>();
  const storageLike = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };
  storage.set(OPERATIONS_MAP_STORAGE_KEY, JSON.stringify({ markers: [unsafeMarker, safeMarker], drawings: [unsafeDrawing] }));
  expect(readMissionMapState(storageLike)).toEqual({ markers: [safeMarker], drawings: [] });

  writeMissionMapState({ markers: [unsafeMarker, safeMarker], drawings: [unsafeDrawing] }, storageLike);
  expect(JSON.parse(storage.get(OPERATIONS_MAP_STORAGE_KEY) ?? '{}')).toMatchObject({ markers: [expect.objectContaining({ id: safeMarker.id })], drawings: [] });

  expect(mergeMissionMapState({ markers: [unsafeMarker], drawings: [] }, { markers: [safeMarker], drawings: [unsafeDrawing] })).toEqual({ markers: [safeMarker], drawings: [] });
});

it('drops non-primitive legacy map labels and notes during normalization and import', () => {
  const safeMarker = createMissionMapMarker({ kind: 'observation', missionId: 'mission-a', label: 'Trygg observasjon', x: 10, y: 20 }, now);
  const objectLabelMarker = { ...safeMarker, id: 'object-label', label: { nested: '01017000027' } };
  const objectNoteDrawing = { ...createMissionMapDrawing({ kind: 'sector', missionId: 'mission-a', label: 'Trygg teig', coordinates: '0,0 10,0 10,10' }, now), id: 'object-note', note: { nested: 'kontakt ola.nordmann@example.com' } };

  expect(normalizeMissionMapState({ markers: [objectLabelMarker, safeMarker], drawings: [objectNoteDrawing] })).toEqual({ markers: [safeMarker], drawings: [] });

  const imported = importGeoJsonText(JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [10, 20] }, properties: { itemType: 'marker', kind: 'observation', label: { nested: 'object' } } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [30, 40] }, properties: { itemType: 'marker', kind: 'observation', label: 'Trygg import', note: { nested: 'object' } } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [50, 60] }, properties: { itemType: 'marker', kind: 'observation', label: 'Trygg import' } },
    ],
  }), now, 'mission-a');

  expect(imported.markers).toHaveLength(1);
  expect(imported.markers[0]).toMatchObject({ label: 'Trygg import', point: { x: 50, y: 60 } });
});

it('rejects non-primitive caller-provided map export text with contextual errors', () => {
  const objectLabelState = {
    markers: [{ id: 'object-label', itemType: 'marker' as const, kind: 'observation' as const, label: { nested: '01017000027' } as unknown as string, point: { x: 10, y: 20 }, createdAt: now.toISOString() }],
    drawings: [],
  } satisfies MissionMapState;

  expect(() => buildMapImageSvg(objectLabelState)).toThrow(/operationsMap\.svg\.markers\[0\]\.label|unsupported|rejected/i);
  expect(() => buildGeoJsonExport(objectLabelState)).toThrow(/operationsMap\.export\.markers\[0\]\.label|unsupported|rejected/i);
});

it('rejects sensitive notes in caller-provided map export state', () => {
  const unsafeNoteState: MissionMapState = {
    markers: [{ id: 'unsafe-note', itemType: 'marker', kind: 'observation', label: 'Obs', note: 'kontakt ola.nordmann@example.com', point: { x: 10, y: 20 }, createdAt: now.toISOString() }],
    drawings: [],
  };
  expect(() => buildMapImageSvg(unsafeNoteState)).toThrow(/persondata|kontakt|private/i);
  expect(() => buildGeoJsonExport(unsafeNoteState)).toThrow(/persondata|kontakt|private/i);
});

it('rejects sensitive text during GeoJSON import and export', () => {
  const imported = importGeoJsonText(JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'il-ko', label: '01017000027' } },
    ],
  }), now, 'mission-a');
  expect(imported.markers).toHaveLength(0);

  const unsafeState: MissionMapState = {
    markers: [{ id: 'unsafe', itemType: 'marker', kind: 'observation', label: '01017000027', point: { x: 10, y: 20 }, createdAt: now.toISOString() }],
    drawings: [],
  };
  expect(() => buildMapImageSvg(unsafeState)).toThrow(/persondata|identifikator|pasientdata|private/i);
  expect(() => buildGeoJsonExport(unsafeState)).toThrow(/persondata|identifikator|pasientdata|private/i);
});

it('rejects malformed GeoJSON coordinates, missing schematic marker, mismatched geometry and huge point lists', () => {
  expect(importGeoJsonText(JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'hazard', label: 'missing marker' } }],
  }), now).markers).toHaveLength(0);

  const malformed = importGeoJsonText(JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [null, null] }, properties: { itemType: 'marker', kind: 'hazard', label: 'bad' } },
      { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [10, 0], [10, 10]] }, properties: { itemType: 'drawing', kind: 'sector', label: 'wrong geometry' } },
    ],
  }), now);
  expect(malformed.markers).toHaveLength(0);
  expect(malformed.drawings).toHaveLength(0);

  const capped = createMissionMapDrawing({ kind: 'line', label: 'Lang', coordinates: Array.from({ length: 80 }, (_, index) => `${index % 100},${index % 90}`).join(' ') }, now);
  expect(capped.points).toHaveLength(MAX_POINTS_PER_DRAWING);
});

it('generates privacy-labeled SVG map export and keeps KML/live tracking post-MVP', () => {
  const state: MissionMapState = { markers: [createMissionMapMarker({ kind: 'observation', label: 'Obs', x: 5, y: 6 }, now)], drawings: [] };
  expect(buildMapImageSvg(state)).toContain('Sanitert lokalt kartbilde');
  expect(buildMapImageSvg(state)).toContain(LOCATION_EXPORT_PRIVACY_WARNING.slice(0, 40));
  expect(KML_IMPORT_EVALUATION.status).toBe('post-mvp-research-only');
  expect(QR_SECTOR_IMPORT_DESIGN.status).toBe('designed-not-synced');
  expect(BLUE_FORCE_TRACKING_RESEARCH.status).toBe('post-mvp-only');
});
