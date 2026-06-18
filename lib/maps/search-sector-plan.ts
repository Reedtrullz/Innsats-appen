import {
  createMissionMapDrawing,
  createMissionMapMarker,
  measureDrawingDistance,
  measurePolygonArea,
  normalizeSchematicPoint,
  type MissionMapDrawing,
  type MissionMapMarker,
  type SchematicPoint,
} from '@/lib/maps/operations-map';

export type SearchSectorPlanPointInput = {
  x: unknown;
  y: unknown;
};

export type SearchSectorPlanInput = {
  missionId: string;
  label: unknown;
  sectorPoints: SearchSectorPlanPointInput[];
  start: SearchSectorPlanPointInput;
  exit: SearchSectorPlanPointInput;
  note?: unknown;
};

export type SearchSectorPlanObjects = {
  markers: MissionMapMarker[];
  sector: MissionMapDrawing;
  planningPrompts: string[];
  summary: {
    boundaryPointCount: number;
    markerCount: number;
    perimeterSchematicUnits: number;
    areaSchematicUnits: number;
  };
};

export const SEARCH_SECTOR_PLANNING_PROMPTS = [
  'Bekreft teiggrense, metode, lagkontroll og rapporteringsintervall med KO/leder.',
  'Bruk bare skjematiske punkter; ikke registrer navn, identitet, ekte posisjoner eller live tracking.',
  'Meld dekningsgrad, hindringer, funn og avvik via avtalt sambandsvei.',
];

function plainPlanText(value: unknown, field: string) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  throw new Error(`Search sector plan ${field} must be plain text.`);
}

function planPoint(value: SearchSectorPlanPointInput, field: string): SchematicPoint {
  const point = normalizeSchematicPoint(value);
  if (!point) throw new Error(`${field} must use schematic coordinates from 0 to 100.`);
  return point;
}

function sectorBoundary(values: SearchSectorPlanPointInput[]): SchematicPoint[] {
  const points = values
    .map((value) => normalizeSchematicPoint(value))
    .filter((point): point is SchematicPoint => Boolean(point))
    .slice(0, 12);
  if (points.length < 3) throw new Error('Search sector plan needs at least three schematic boundary points.');
  return points;
}

function coordinateText(points: SchematicPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function createSearchSectorPlanObjects(input: SearchSectorPlanInput, now = new Date()): SearchSectorPlanObjects {
  const label = plainPlanText(input.label, 'label') || 'søketeig';
  const note = plainPlanText(input.note, 'note');
  const sectorPoints = sectorBoundary(input.sectorPoints);
  const start = planPoint(input.start, 'Start point');
  const exit = planPoint(input.exit, 'Return point');
  const sharedNote = [
    'Skjematisk søketeig plan.',
    ...SEARCH_SECTOR_PLANNING_PROMPTS,
    note,
  ].filter(Boolean).join(' ');

  const markers = [
    createMissionMapMarker({
      kind: 'meeting-point',
      missionId: input.missionId,
      label: `Startpunkt ${label}`,
      x: start.x,
      y: start.y,
      note: sharedNote,
    }, now),
    createMissionMapMarker({
      kind: 'meeting-point',
      missionId: input.missionId,
      label: `Returpunkt ${label}`,
      x: exit.x,
      y: exit.y,
      note: sharedNote,
    }, now),
  ];

  const sector = createMissionMapDrawing({
    kind: 'sector',
    missionId: input.missionId,
    label: `Søketeig ${label}`,
    coordinates: coordinateText(sectorPoints),
    note: sharedNote,
  }, now);

  return {
    markers,
    sector,
    planningPrompts: [...SEARCH_SECTOR_PLANNING_PROMPTS],
    summary: {
      boundaryPointCount: sector.points.length,
      markerCount: markers.length,
      perimeterSchematicUnits: Number(measureDrawingDistance(sector.points, true).toFixed(1)),
      areaSchematicUnits: Number(measurePolygonArea(sector.points).toFixed(1)),
    },
  };
}
