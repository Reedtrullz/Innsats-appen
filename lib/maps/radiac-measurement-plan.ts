import {
  createMissionMapDrawing,
  createMissionMapMarker,
  measureDrawingDistance,
  normalizeSchematicPoint,
  type MissionMapDrawing,
  type MissionMapMarker,
  type SchematicPoint,
} from '@/lib/maps/operations-map';

export type RadiacMeasurementPlanPointInput = {
  x: unknown;
  y: unknown;
};

export type RadiacMeasurementPlanInput = {
  missionId: string;
  label: unknown;
  points: RadiacMeasurementPlanPointInput[];
  note?: unknown;
};

export type RadiacMeasurementPlanObjects = {
  markers: MissionMapMarker[];
  routeLine: MissionMapDrawing;
  planningPrompts: string[];
  summary: {
    measurementPointCount: number;
    routeLengthSchematicUnits: number;
    drawingCount: number;
  };
};

export const RADIAC_MEASUREMENT_PLANNING_PROMPTS = [
  'Bekreft måleordre, rapporteringsformat og faglig kontakt før avmarsj.',
  'Bruk skjematiske målepunkter; appen beregner ikke dose, oppholdstid eller grenseverdier.',
  'Meld avvik, instrumentfeil eller uventet målebilde via avtalt sambandsvei.',
];

function plainPlanText(value: unknown, field: string) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  throw new Error(`RADIAC measurement plan ${field} must be plain text.`);
}

function planPoints(values: RadiacMeasurementPlanPointInput[]): SchematicPoint[] {
  const points = values
    .map((value) => normalizeSchematicPoint(value))
    .filter((point): point is SchematicPoint => Boolean(point))
    .slice(0, 12);
  if (points.length < 2) throw new Error('RADIAC measurement plan needs at least two schematic points.');
  return points;
}

function coordinateText(points: SchematicPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function createRadiacMeasurementPlanObjects(input: RadiacMeasurementPlanInput, now = new Date()): RadiacMeasurementPlanObjects {
  const label = plainPlanText(input.label, 'label') || 'RADIAC måleplan';
  const note = plainPlanText(input.note, 'note');
  const points = planPoints(input.points);
  const sharedNote = [
    'Skjematisk RADIAC måleplan.',
    ...RADIAC_MEASUREMENT_PLANNING_PROMPTS,
    note,
  ].filter(Boolean).join(' ');

  const markers = points.map((point, index) => createMissionMapMarker({
    kind: 'observation',
    missionId: input.missionId,
    label: `Målepunkt ${index + 1} ${label}`,
    x: point.x,
    y: point.y,
    note: sharedNote,
  }, now));

  const routeLine = createMissionMapDrawing({
    kind: 'line',
    missionId: input.missionId,
    label: `Målerute ${label}`,
    coordinates: coordinateText(points),
    note: sharedNote,
  }, now);

  return {
    markers,
    routeLine,
    planningPrompts: [...RADIAC_MEASUREMENT_PLANNING_PROMPTS],
    summary: {
      measurementPointCount: markers.length,
      routeLengthSchematicUnits: Number(measureDrawingDistance(routeLine.points).toFixed(1)),
      drawingCount: 1,
    },
  };
}
