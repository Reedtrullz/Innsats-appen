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

export type MreZonePlanPointInput = {
  x: unknown;
  y: unknown;
};

export type MreZonePlanInput = {
  missionId: string;
  label: unknown;
  dirtyZonePoints: MreZonePlanPointInput[];
  cleanZonePoints: MreZonePlanPointInput[];
  rinseLinePoints: MreZonePlanPointInput[];
  entry: MreZonePlanPointInput;
  exit: MreZonePlanPointInput;
  waste: MreZonePlanPointInput;
  note?: unknown;
};

export type MreZonePlanObjects = {
  markers: MissionMapMarker[];
  dirtyZone: MissionMapDrawing;
  cleanZone: MissionMapDrawing;
  rinseLine: MissionMapDrawing;
  planningPrompts: string[];
  summary: {
    zoneCount: number;
    markerCount: number;
    dirtyZoneAreaSchematicUnits: number;
    cleanZoneAreaSchematicUnits: number;
    rinseLineLengthSchematicUnits: number;
  };
};

export const MRE_ZONE_PLANNING_PROMPTS = [
  'Avklar ren side, uren side, renselinje og stoppunkt med innsatsleder/fagmyndighet før etablering.',
  'Bruk skjematiske lokale punkter; ikke registrer persondata, pasientdata, stoffdetaljer eller ekte koordinater.',
  'Appen fastsetter ikke stoff, vernenivå, sonegrense eller rensetaktikk; gjeldende ordre styrer.',
  'Meld kapasitet, kø, forbruk, avfallspunkt, stopp og behov for forsterkning via avtalt sambandsvei.',
];

function plainPlanText(value: unknown, field: string) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  throw new Error(`MRE zone plan ${field} must be plain text.`);
}

function planPoint(value: MreZonePlanPointInput, field: string): SchematicPoint {
  const point = normalizeSchematicPoint(value);
  if (!point) throw new Error(`${field} must use schematic coordinates from 0 to 100.`);
  return point;
}

function polygonBoundary(values: MreZonePlanPointInput[], field: string): SchematicPoint[] {
  const points = values
    .map((value) => normalizeSchematicPoint(value))
    .filter((point): point is SchematicPoint => Boolean(point))
    .slice(0, 12);
  if (points.length < 3) throw new Error(`${field} needs at least three schematic boundary points.`);
  return points;
}

function routePoints(values: MreZonePlanPointInput[], field: string): SchematicPoint[] {
  const points = values
    .map((value) => normalizeSchematicPoint(value))
    .filter((point): point is SchematicPoint => Boolean(point))
    .slice(0, 12);
  if (points.length < 2) throw new Error(`${field} needs at least two schematic points.`);
  return points;
}

function coordinateText(points: SchematicPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function createMreZonePlanObjects(input: MreZonePlanInput, now = new Date()): MreZonePlanObjects {
  const label = plainPlanText(input.label, 'label') || 'MRE rens';
  const note = plainPlanText(input.note, 'note');
  const dirtyZonePoints = polygonBoundary(input.dirtyZonePoints, 'Dirty zone');
  const cleanZonePoints = polygonBoundary(input.cleanZonePoints, 'Clean zone');
  const rinseLinePoints = routePoints(input.rinseLinePoints, 'Rinse line');
  const entry = planPoint(input.entry, 'Entry point');
  const exit = planPoint(input.exit, 'Exit point');
  const waste = planPoint(input.waste, 'Waste point');
  const sharedNote = [
    'Skjematisk MRE ren/uren-side plan.',
    ...MRE_ZONE_PLANNING_PROMPTS,
    note,
  ].filter(Boolean).join(' ');

  const markers = [
    createMissionMapMarker({
      kind: 'meeting-point',
      missionId: input.missionId,
      label: `Innpassering ${label}`,
      x: entry.x,
      y: entry.y,
      note: sharedNote,
    }, now),
    createMissionMapMarker({
      kind: 'meeting-point',
      missionId: input.missionId,
      label: `Utpassering ${label}`,
      x: exit.x,
      y: exit.y,
      note: sharedNote,
    }, now),
    createMissionMapMarker({
      kind: 'resource',
      missionId: input.missionId,
      label: `Avfallspunkt ${label}`,
      x: waste.x,
      y: waste.y,
      note: sharedNote,
    }, now),
  ];

  const dirtyZone = createMissionMapDrawing({
    kind: 'polygon',
    missionId: input.missionId,
    label: `Uren side ${label}`,
    coordinates: coordinateText(dirtyZonePoints),
    note: sharedNote,
  }, now);

  const cleanZone = createMissionMapDrawing({
    kind: 'polygon',
    missionId: input.missionId,
    label: `Ren side ${label}`,
    coordinates: coordinateText(cleanZonePoints),
    note: sharedNote,
  }, now);

  const rinseLine = createMissionMapDrawing({
    kind: 'line',
    missionId: input.missionId,
    label: `Renselinje ${label}`,
    coordinates: coordinateText(rinseLinePoints),
    note: sharedNote,
  }, now);

  return {
    markers,
    dirtyZone,
    cleanZone,
    rinseLine,
    planningPrompts: [...MRE_ZONE_PLANNING_PROMPTS],
    summary: {
      zoneCount: 2,
      markerCount: markers.length,
      dirtyZoneAreaSchematicUnits: Number(measurePolygonArea(dirtyZone.points).toFixed(1)),
      cleanZoneAreaSchematicUnits: Number(measurePolygonArea(cleanZone.points).toFixed(1)),
      rinseLineLengthSchematicUnits: Number(measureDrawingDistance(rinseLine.points).toFixed(1)),
    },
  };
}
