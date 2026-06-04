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
  measurePolygonArea,
  operationItemsForRender,
  readMissionMapState,
  resetMissionMapState,
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

  const imported = importGeoJsonText(JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33, 999] }, properties: { itemType: 'marker', kind: 'il-ko', label: '<KO>', secret: 'drop-me' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [200, 33] }, properties: { itemType: 'marker', kind: 'hazard', label: 'bad' } },
    ],
  }), now);
  expect(imported.markers).toHaveLength(1);
  expect(imported.markers[0]).toMatchObject({ kind: 'il-ko', label: 'KO', point: { x: 22, y: 33 } });
  expect(JSON.stringify(imported)).not.toContain('drop-me');
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
