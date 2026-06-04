import {
  MAP_DRAWING_LABELS,
  MAP_MARKER_LABELS,
  type MissionMapDrawing,
  type MissionMapMarker,
  type SchematicPoint,
} from '@/lib/maps/operations-map';
import { FieldLogEntrySchema, type FieldLogCategory, type FieldLogEntry } from './schemas';

function text(value: unknown, maxLength = 240) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function firstPoint(mapObject: MissionMapMarker | MissionMapDrawing): SchematicPoint {
  if (mapObject.itemType === 'marker') return mapObject.point;
  const point = mapObject.points[0];
  if (!point) throw new Error('Map drawing needs at least one schematic point');
  return point;
}

function defaultLabel(mapObject: MissionMapMarker | MissionMapDrawing) {
  return mapObject.itemType === 'marker' ? MAP_MARKER_LABELS[mapObject.kind] : MAP_DRAWING_LABELS[mapObject.kind];
}

export function buildFieldLogEntryFromMapObject(input: {
  missionId: string;
  mapObject: MissionMapMarker | MissionMapDrawing;
  category: FieldLogCategory;
  text: string;
  now?: Date;
  criticalObservation?: boolean;
  mustBeForwarded?: boolean;
}): FieldLogEntry {
  const cleanText = text(input.text, 700);
  if (!cleanText) throw new Error('Field log text is required when creating an entry from the map');
  const now = input.now ?? new Date();
  const point = firstPoint(input.mapObject);
  const label = text(input.mapObject.label || defaultLabel(input.mapObject), 120) || defaultLabel(input.mapObject);
  return FieldLogEntrySchema.parse({
    id: `field-log-map-${now.toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.toISOString(),
    locationText: `Skjematisk kartpunkt ${point.x},${point.y} — ${label}`,
    category: input.category,
    text: cleanText,
    linkedMissionId: input.missionId,
    criticalObservation: input.criticalObservation ?? false,
    mustBeForwarded: input.mustBeForwarded ?? false,
    mapReference: {
      source: input.mapObject.itemType === 'marker' ? 'map-marker' : 'map-drawing',
      objectId: input.mapObject.id,
      label,
      point,
    },
  });
}
