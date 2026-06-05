export type MapMarkerKind = 'incident-site' | 'hazard' | 'resource' | 'meeting-point' | 'il-ko' | 'pump-location' | 'observation';
export type MapDrawingKind = 'point' | 'line' | 'polygon' | 'sector';
export type MapLayerKey = MapMarkerKind | MapDrawingKind;

export type SchematicPoint = { x: number; y: number };

export type MissionMapMarker = {
  id: string;
  missionId?: string;
  itemType: 'marker';
  kind: MapMarkerKind;
  label: string;
  point: SchematicPoint;
  note?: string;
  createdAt: string;
};

export type MissionMapDrawing = {
  id: string;
  missionId?: string;
  itemType: 'drawing';
  kind: MapDrawingKind;
  label: string;
  points: SchematicPoint[];
  note?: string;
  createdAt: string;
};

export type MissionMapState = {
  markers: MissionMapMarker[];
  drawings: MissionMapDrawing[];
};

export const OPERATIONS_MAP_STORAGE_KEY = 'beredskapsboka-operations-map-v1';
export const OPERATIONS_MAP_EVENT = 'beredskapsboka:operations-map';
export const MAX_RENDERED_OPERATION_ITEMS = 20;
export const MAX_STORED_MARKERS = 50;
export const MAX_STORED_DRAWINGS = 30;
export const MAX_POINTS_PER_DRAWING = 50;
export const MAX_IMPORTED_GEOJSON_FEATURES = 80;
export const SCHEMATIC_GEOJSON_COORDINATE_SYSTEM = 'schematic-0-100-local-only';

export const MAP_MARKER_LABELS: Record<MapMarkerKind, string> = {
  'incident-site': 'Hendelsessted',
  hazard: 'Fare',
  resource: 'Ressurs',
  'meeting-point': 'Møteplass',
  'il-ko': 'IL-KO',
  'pump-location': 'Pumpeplass',
  observation: 'Observasjon',
};

export const MAP_DRAWING_LABELS: Record<MapDrawingKind, string> = {
  point: 'Punkt',
  line: 'Linje',
  polygon: 'Polygon',
  sector: 'Sektor/teig',
};

export const MAP_MARKER_KINDS = Object.keys(MAP_MARKER_LABELS) as MapMarkerKind[];
export const MAP_DRAWING_KINDS = Object.keys(MAP_DRAWING_LABELS) as MapDrawingKind[];
export const DEFAULT_ENABLED_MAP_LAYERS = [...MAP_MARKER_KINDS, ...MAP_DRAWING_KINDS] as MapLayerKey[];

export const LOCATION_EXPORT_PRIVACY_WARNING = 'Lokale kartmarkører og sektorer kan røpe innsatssted, ressurser eller observasjoner. Eksporter bare sanitert øvingsdata, aldri persondata, pasientdata, private adresser eller skjermede operasjonelle posisjoner.';

export const KML_IMPORT_EVALUATION = {
  status: 'post-mvp-research-only',
  decision: 'KML-import er ikke implementert i MVP. GeoJSON med skjematiske 0-100 koordinater er eneste støttede import nå.',
  blockers: ['KML kan inneholde ekte koordinater og private stedsnavn.', 'KML-parser ville øke angrepsflate og pakkestørrelse.', 'KML må ha egen governance for sanitert øvingsbruk før aktivering.'],
} as const;

export const QR_SECTOR_IMPORT_DESIGN = {
  status: 'designed-not-synced',
  summary: 'Sektor/teig kan deles post-MVP som signert fil eller QR-tekst som brukeren importerer manuelt på enheten. Ingen backend sync eller automatisk ordreoverføring.',
  safeguards: ['Vis importforhåndsvisning før lagring.', 'Behold alt lokalt i nettleseren.', 'Forkast ukjente felter og ekte identifikatorer.', 'Merk importert innhold som uverifisert beslutningsstøtte.'],
} as const;

export const BLUE_FORCE_TRACKING_RESEARCH = {
  status: 'post-mvp-only',
  decision: 'Delt live posisjon/blue-force tracking skal ikke bygges i MVP.',
  reasons: ['Krever personvern-/sikkerhetsvurdering.', 'Kan røpe mannskaps- og ressursposisjoner.', 'Krever autorisasjon, nøkkelstyring og operativ governance som ikke finnes i lokal MVP.'],
} as const;

function emptyMissionMapState(): MissionMapState {
  return { markers: [], drawings: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getBrowserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function sanitizeMapText(value: unknown, maxLength = 120) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function strictCoordinate(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSchematicPoint(value: unknown): SchematicPoint | null {
  if (!isRecord(value)) return null;
  const x = strictCoordinate(value.x);
  const y = strictCoordinate(value.y);
  if (x === null || y === null) return null;
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;
  return { x, y };
}

export function parseCoordinateText(text: string): SchematicPoint[] {
  return text
    .split(/\s+/)
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [xRaw, yRaw] = pair.split(',');
      return normalizeSchematicPoint({ x: xRaw, y: yRaw });
    })
    .filter((point): point is SchematicPoint => Boolean(point));
}

function stableId(prefix: string, now: Date) {
  return `${prefix}-${now.toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMissionMapMarker(input: { kind: MapMarkerKind; missionId?: unknown; label: unknown; x: unknown; y: unknown; note?: unknown }, now = new Date()): MissionMapMarker {
  if (!MAP_MARKER_KINDS.includes(input.kind)) throw new Error('Unsupported marker kind');
  const point = normalizeSchematicPoint({ x: input.x, y: input.y });
  if (!point) throw new Error('Marker coordinates must be schematic values from 0 to 100');
  const label = sanitizeMapText(input.label) || MAP_MARKER_LABELS[input.kind];
  const missionId = sanitizeMapText(input.missionId, 80);
  const note = sanitizeMapText(input.note, 240);
  return {
    id: stableId(input.kind, now),
    ...(missionId ? { missionId } : {}),
    itemType: 'marker',
    kind: input.kind,
    label,
    point,
    ...(note ? { note } : {}),
    createdAt: now.toISOString(),
  };
}

export function createMissionMapDrawing(input: { kind: MapDrawingKind; missionId?: unknown; label: unknown; coordinates: string; note?: unknown }, now = new Date()): MissionMapDrawing {
  if (!MAP_DRAWING_KINDS.includes(input.kind)) throw new Error('Unsupported drawing kind');
  const points = parseCoordinateText(input.coordinates).slice(0, MAX_POINTS_PER_DRAWING);
  const minimumPoints = input.kind === 'point' ? 1 : input.kind === 'line' ? 2 : 3;
  if (points.length < minimumPoints) throw new Error(`${MAP_DRAWING_LABELS[input.kind]} needs at least ${minimumPoints} schematic point(s)`);
  const label = sanitizeMapText(input.label) || MAP_DRAWING_LABELS[input.kind];
  const missionId = sanitizeMapText(input.missionId, 80);
  const note = sanitizeMapText(input.note, 240);
  return {
    id: stableId(input.kind, now),
    ...(missionId ? { missionId } : {}),
    itemType: 'drawing',
    kind: input.kind,
    label,
    points,
    ...(note ? { note } : {}),
    createdAt: now.toISOString(),
  };
}

function normalizeMarker(value: unknown): MissionMapMarker | null {
  if (!isRecord(value) || value.itemType !== 'marker' || !MAP_MARKER_KINDS.includes(value.kind as MapMarkerKind)) return null;
  const point = normalizeSchematicPoint(value.point);
  if (!point) return null;
  const label = sanitizeMapText(value.label) || MAP_MARKER_LABELS[value.kind as MapMarkerKind];
  const missionId = sanitizeMapText(value.missionId, 80);
  const note = sanitizeMapText(value.note, 240);
  return {
    id: sanitizeMapText(value.id, 80) || stableId('marker', new Date(0)),
    ...(missionId ? { missionId } : {}),
    itemType: 'marker',
    kind: value.kind as MapMarkerKind,
    label,
    point,
    ...(note ? { note } : {}),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date(0).toISOString(),
  };
}

function normalizeDrawing(value: unknown): MissionMapDrawing | null {
  if (!isRecord(value) || value.itemType !== 'drawing' || !MAP_DRAWING_KINDS.includes(value.kind as MapDrawingKind)) return null;
  const points = (Array.isArray(value.points) ? value.points.map(normalizeSchematicPoint).filter((point): point is SchematicPoint => Boolean(point)) : []).slice(0, MAX_POINTS_PER_DRAWING);
  const minimumPoints = value.kind === 'point' ? 1 : value.kind === 'line' ? 2 : 3;
  if (points.length < minimumPoints) return null;
  const label = sanitizeMapText(value.label) || MAP_DRAWING_LABELS[value.kind as MapDrawingKind];
  const missionId = sanitizeMapText(value.missionId, 80);
  const note = sanitizeMapText(value.note, 240);
  return {
    id: sanitizeMapText(value.id, 80) || stableId('drawing', new Date(0)),
    ...(missionId ? { missionId } : {}),
    itemType: 'drawing',
    kind: value.kind as MapDrawingKind,
    label,
    points,
    ...(note ? { note } : {}),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date(0).toISOString(),
  };
}

export function normalizeMissionMapState(value: unknown): MissionMapState {
  if (!isRecord(value)) return emptyMissionMapState();
  return {
    markers: (Array.isArray(value.markers) ? value.markers.map(normalizeMarker).filter((marker): marker is MissionMapMarker => Boolean(marker)) : []).slice(0, MAX_STORED_MARKERS),
    drawings: (Array.isArray(value.drawings) ? value.drawings.map(normalizeDrawing).filter((drawing): drawing is MissionMapDrawing => Boolean(drawing)) : []).slice(0, MAX_STORED_DRAWINGS),
  };
}

export function mapStateForMission(state: MissionMapState, missionId: string): MissionMapState {
  return {
    markers: state.markers.filter((marker) => marker.missionId === missionId),
    drawings: state.drawings.filter((drawing) => drawing.missionId === missionId),
  };
}

export function updateMissionMapMarker(state: MissionMapState, missionId: string, markerId: string, patch: Partial<Pick<MissionMapMarker, 'kind' | 'label' | 'point' | 'note'>>): MissionMapState {
  return normalizeMissionMapState({
    ...state,
    markers: state.markers.map((marker) => {
      if (marker.id !== markerId || marker.missionId !== missionId) return marker;
      return normalizeMarker({ ...marker, ...patch }) ?? marker;
    }),
  });
}

export function updateMissionMapDrawing(state: MissionMapState, missionId: string, drawingId: string, patch: Partial<Pick<MissionMapDrawing, 'kind' | 'label' | 'points' | 'note'>>): MissionMapState {
  return normalizeMissionMapState({
    ...state,
    drawings: state.drawings.map((drawing) => {
      if (drawing.id !== drawingId || drawing.missionId !== missionId) return drawing;
      return normalizeDrawing({ ...drawing, ...patch }) ?? drawing;
    }),
  });
}

export function deleteMissionMapObject(state: MissionMapState, missionId: string, objectId: string): MissionMapState {
  return normalizeMissionMapState({
    markers: state.markers.filter((marker) => marker.id !== objectId || marker.missionId !== missionId),
    drawings: state.drawings.filter((drawing) => drawing.id !== objectId || drawing.missionId !== missionId),
  });
}

export function readMissionMapState(storage?: Pick<Storage, 'getItem'>): MissionMapState {
  try {
    const resolvedStorage = storage ?? getBrowserLocalStorage();
    const raw = resolvedStorage?.getItem(OPERATIONS_MAP_STORAGE_KEY);
    return raw ? normalizeMissionMapState(JSON.parse(raw)) : emptyMissionMapState();
  } catch {
    return emptyMissionMapState();
  }
}

export function writeMissionMapState(state: MissionMapState, storage?: Pick<Storage, 'setItem'>): MissionMapState {
  const normalized = normalizeMissionMapState(state);
  try {
    const resolvedStorage = storage ?? getBrowserLocalStorage();
    resolvedStorage?.setItem(OPERATIONS_MAP_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Keep the in-memory state usable if localStorage is full or blocked.
  }
  if (!storage && typeof window !== 'undefined') window.dispatchEvent(new Event(OPERATIONS_MAP_EVENT));
  return normalized;
}

export function resetMissionMapState(storage?: Pick<Storage, 'removeItem'>) {
  try {
    const resolvedStorage = storage ?? getBrowserLocalStorage();
    resolvedStorage?.removeItem(OPERATIONS_MAP_STORAGE_KEY);
  } catch {
    // Idempotent reset for restricted browser storage.
  }
  if (!storage && typeof window !== 'undefined') window.dispatchEvent(new Event(OPERATIONS_MAP_EVENT));
}

export function missionMapStateSnapshot() {
  return JSON.stringify(readMissionMapState());
}

export function subscribeMissionMapState(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === OPERATIONS_MAP_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(OPERATIONS_MAP_EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(OPERATIONS_MAP_EVENT, callback);
  };
}

export function filterMissionMapStateByLayers(state: MissionMapState, enabledLayers: Iterable<MapLayerKey>): MissionMapState {
  const enabled = new Set(enabledLayers);
  return {
    markers: state.markers.filter((marker) => enabled.has(marker.kind)),
    drawings: state.drawings.filter((drawing) => enabled.has(drawing.kind)),
  };
}

export function operationItemsForRender(state: MissionMapState, limit = MAX_RENDERED_OPERATION_ITEMS) {
  return [...state.drawings, ...state.markers].slice(0, Math.max(0, limit));
}

function distanceBetween(a: SchematicPoint, b: SchematicPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function measureDrawingDistance(points: SchematicPoint[], closeShape = false) {
  const openDistance = points.slice(1).reduce((total, point, index) => total + distanceBetween(points[index], point), 0);
  if (!closeShape || points.length < 3) return openDistance;
  return openDistance + distanceBetween(points[points.length - 1], points[0]);
}

export function measurePolygonArea(points: SchematicPoint[]) {
  if (points.length < 3) return 0;
  const sum = points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(sum) / 2;
}

function polygonCoordinates(points: SchematicPoint[]) {
  const coords = points.map((point) => [point.x, point.y]);
  const first = coords[0];
  const last = coords.at(-1);
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) coords.push(first);
  return [coords];
}

export function buildGeoJsonExport(state: MissionMapState) {
  const normalized = normalizeMissionMapState(state);
  return {
    type: 'FeatureCollection' as const,
    privacyWarning: LOCATION_EXPORT_PRIVACY_WARNING,
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      ...normalized.markers.map((marker) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [marker.point.x, marker.point.y] },
        properties: { itemType: 'marker', kind: marker.kind, label: marker.label, localOnly: true },
      })),
      ...normalized.drawings.map((drawing) => ({
        type: 'Feature' as const,
        geometry: drawing.kind === 'point'
          ? { type: 'Point' as const, coordinates: [drawing.points[0].x, drawing.points[0].y] }
          : drawing.kind === 'line'
            ? { type: 'LineString' as const, coordinates: drawing.points.map((point) => [point.x, point.y]) }
            : { type: 'Polygon' as const, coordinates: polygonCoordinates(drawing.points) },
        properties: { itemType: 'drawing', kind: drawing.kind, label: drawing.label, localOnly: true },
      })),
    ],
  };
}

export function geoJsonExportText(state: MissionMapState) {
  return JSON.stringify(buildGeoJsonExport(state), null, 2);
}

function drawingPointsFromGeometry(kind: MapDrawingKind, geometry: Record<string, unknown>) {
  if (kind === 'point') {
    if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return [];
    return [normalizeSchematicPoint({ x: geometry.coordinates[0], y: geometry.coordinates[1] })];
  }
  if (kind === 'line') {
    if (geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return [];
    return geometry.coordinates.slice(0, MAX_POINTS_PER_DRAWING).map((coords) => Array.isArray(coords) ? normalizeSchematicPoint({ x: coords[0], y: coords[1] }) : null);
  }
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || !Array.isArray(geometry.coordinates[0])) return [];
  return geometry.coordinates[0].slice(0, MAX_POINTS_PER_DRAWING + 1).map((coords) => Array.isArray(coords) ? normalizeSchematicPoint({ x: coords[0], y: coords[1] }) : null);
}

export function importGeoJsonText(text: string, now = new Date(), missionId?: string): MissionMapState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return emptyMissionMapState();
  }
  if (!isRecord(parsed) || parsed.type !== 'FeatureCollection' || parsed.coordinateSystem !== SCHEMATIC_GEOJSON_COORDINATE_SYSTEM || !Array.isArray(parsed.features)) return emptyMissionMapState();
  const scopedMissionId = sanitizeMapText(missionId, 80);
  if (!scopedMissionId) return emptyMissionMapState();
  const markers: MissionMapMarker[] = [];
  const drawings: MissionMapDrawing[] = [];
  for (const feature of parsed.features.slice(0, MAX_IMPORTED_GEOJSON_FEATURES)) {
    if (!isRecord(feature) || feature.type !== 'Feature' || !isRecord(feature.geometry) || !isRecord(feature.properties)) continue;
    const properties = feature.properties;
    const label = sanitizeMapText(properties.label) || 'Importert kartobjekt';
    const note = sanitizeMapText(properties.note, 240);
    if (properties.itemType === 'marker' && MAP_MARKER_KINDS.includes(properties.kind as MapMarkerKind) && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
      const point = normalizeSchematicPoint({ x: feature.geometry.coordinates[0], y: feature.geometry.coordinates[1] });
      if (point) markers.push({ id: stableId('import-marker', now), ...(scopedMissionId ? { missionId: scopedMissionId } : {}), itemType: 'marker', kind: properties.kind as MapMarkerKind, label, point, ...(note ? { note } : {}), createdAt: now.toISOString() });
      continue;
    }
    if (properties.itemType === 'drawing' && MAP_DRAWING_KINDS.includes(properties.kind as MapDrawingKind)) {
      const kind = properties.kind as MapDrawingKind;
      const cleanPoints = drawingPointsFromGeometry(kind, feature.geometry).filter((point): point is SchematicPoint => Boolean(point));
      const withoutClosingDuplicate = cleanPoints.length > 1 && cleanPoints[0].x === cleanPoints.at(-1)?.x && cleanPoints[0].y === cleanPoints.at(-1)?.y ? cleanPoints.slice(0, -1) : cleanPoints;
      const minimumPoints = kind === 'point' ? 1 : kind === 'line' ? 2 : 3;
      if (withoutClosingDuplicate.length >= minimumPoints) drawings.push({ id: stableId('import-drawing', now), ...(scopedMissionId ? { missionId: scopedMissionId } : {}), itemType: 'drawing', kind, label, points: withoutClosingDuplicate.slice(0, MAX_POINTS_PER_DRAWING), ...(note ? { note } : {}), createdAt: now.toISOString() });
    }
  }
  return normalizeMissionMapState({ markers, drawings });
}

function svgEscape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] ?? char));
}

export function buildMapImageSvg(state: MissionMapState) {
  const normalized = normalizeMissionMapState(state);
  const markerSvg = normalized.markers.map((marker) => `<circle cx="${marker.point.x}" cy="${marker.point.y}" r="2.8" fill="#0f172a"><title>${svgEscape(MAP_MARKER_LABELS[marker.kind])}: ${svgEscape(marker.label)}</title></circle>`).join('');
  const drawingSvg = normalized.drawings.map((drawing) => {
    const points = drawing.points.map((point) => `${point.x},${point.y}`).join(' ');
    if (drawing.kind === 'polygon' || drawing.kind === 'sector') return `<polygon points="${points}" fill="rgba(14,165,233,0.18)" stroke="#0369a1" stroke-width="1"><title>${svgEscape(drawing.label)}</title></polygon>`;
    if (drawing.kind === 'line') return `<polyline points="${points}" fill="none" stroke="#16a34a" stroke-width="1.2"><title>${svgEscape(drawing.label)}</title></polyline>`;
    const point = drawing.points[0];
    return `<rect x="${point.x - 2}" y="${point.y - 2}" width="4" height="4" fill="#7c3aed"><title>${svgEscape(drawing.label)}</title></rect>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112" role="img" aria-label="Sanitert lokalt kartbilde"><rect width="100" height="100" fill="#f8fafc"/><path d="M0 20 H100 M0 40 H100 M0 60 H100 M0 80 H100 M20 0 V100 M40 0 V100 M60 0 V100 M80 0 V100" stroke="#cbd5e1" stroke-width="0.35"/>${drawingSvg}${markerSvg}<text x="2" y="108" font-size="3" fill="#7c2d12">${svgEscape(LOCATION_EXPORT_PRIVACY_WARNING.slice(0, 140))}</text></svg>`;
}

export function mergeMissionMapState(a: MissionMapState, b: MissionMapState): MissionMapState {
  return normalizeMissionMapState({ markers: [...a.markers, ...b.markers], drawings: [...a.drawings, ...b.drawings] });
}
