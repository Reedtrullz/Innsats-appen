import {
  createMissionMapDrawing,
  createMissionMapMarker,
  measureDrawingDistance,
  normalizeSchematicPoint,
  type MissionMapDrawing,
  type MissionMapMarker,
  type SchematicPoint,
} from '@/lib/maps/operations-map';

export type WaterSupplyPlanPointInput = {
  x: unknown;
  y: unknown;
};

export type WaterSupplyPlanInput = {
  missionId: string;
  label: unknown;
  waterSource: WaterSupplyPlanPointInput;
  pump: WaterSupplyPlanPointInput;
  delivery: WaterSupplyPlanPointInput;
  note?: unknown;
};

export type WaterSupplyPlanObjects = {
  markers: MissionMapMarker[];
  hoseLine: MissionMapDrawing;
  planningPrompts: string[];
  summary: {
    hoseLengthSchematicUnits: number;
    markerCount: number;
    drawingCount: number;
  };
};

export const WATER_SUPPLY_PLANNING_PROMPTS = [
  'Avklar vannføring og trykktap med leder/fagressurs.',
  'Vurder trykkforsterkning, seriekjøring eller parallelle utlegg før langt slangeutlegg.',
  'Kontroller vannkilde, pumpeplass, slangevei og retrett ved endret vind eller brannbilde.',
];

function plainPlanText(value: unknown, field: string) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  throw new Error(`Water supply plan ${field} must be plain text.`);
}

function planPoint(value: WaterSupplyPlanPointInput, field: string): SchematicPoint {
  const point = normalizeSchematicPoint(value);
  if (!point) throw new Error(`${field} must use schematic coordinates from 0 to 100.`);
  return point;
}

function coordinateText(points: SchematicPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function createWaterSupplyPlanObjects(input: WaterSupplyPlanInput, now = new Date()): WaterSupplyPlanObjects {
  const label = plainPlanText(input.label, 'label') || 'vannforsyning';
  const note = plainPlanText(input.note, 'note');
  const waterSource = planPoint(input.waterSource, 'Water source');
  const pump = planPoint(input.pump, 'Pump location');
  const delivery = planPoint(input.delivery, 'Delivery point');
  const sharedNote = [
    'Skjematisk pumpe-/slangeplan.',
    ...WATER_SUPPLY_PLANNING_PROMPTS,
    note,
  ].filter(Boolean).join(' ');

  const markers = [
    createMissionMapMarker({
      kind: 'resource',
      missionId: input.missionId,
      label: `Vannkilde ${label}`,
      x: waterSource.x,
      y: waterSource.y,
      note: sharedNote,
    }, now),
    createMissionMapMarker({
      kind: 'pump-location',
      missionId: input.missionId,
      label: `Pumpeplass ${label}`,
      x: pump.x,
      y: pump.y,
      note: sharedNote,
    }, now),
    createMissionMapMarker({
      kind: 'resource',
      missionId: input.missionId,
      label: `Leveringspunkt ${label}`,
      x: delivery.x,
      y: delivery.y,
      note: sharedNote,
    }, now),
  ];

  const hoseLine = createMissionMapDrawing({
    kind: 'line',
    missionId: input.missionId,
    label: `Slangevei ${label}`,
    coordinates: coordinateText([waterSource, pump, delivery]),
    note: sharedNote,
  }, now);

  return {
    markers,
    hoseLine,
    planningPrompts: [...WATER_SUPPLY_PLANNING_PROMPTS],
    summary: {
      hoseLengthSchematicUnits: Number(measureDrawingDistance(hoseLine.points).toFixed(1)),
      markerCount: markers.length,
      drawingCount: 1,
    },
  };
}
