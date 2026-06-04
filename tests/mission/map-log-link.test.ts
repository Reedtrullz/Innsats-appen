import { buildFieldLogEntryFromMapObject } from '@/lib/mission/map-log-link';
import { createMissionMapDrawing, createMissionMapMarker } from '@/lib/maps/operations-map';

const now = new Date('2026-06-04T10:30:00.000Z');

it('builds a field-log entry from a local map marker with schematic position', () => {
  const marker = createMissionMapMarker({ kind: 'hazard', label: '<Fare> røyk', x: 22, y: 33, note: 'synlig' }, now);
  const entry = buildFieldLogEntryFromMapObject({
    missionId: 'mission-1',
    mapObject: marker,
    category: 'vaer-fare',
    text: 'Røyk observert ved punktet',
    now,
  });

  expect(entry).toMatchObject({
    timestamp: now.toISOString(),
    locationText: 'Skjematisk kartpunkt 22,33 — Fare røyk',
    category: 'vaer-fare',
    text: 'Røyk observert ved punktet',
    linkedMissionId: 'mission-1',
    mapReference: {
      source: 'map-marker',
      objectId: marker.id,
      label: 'Fare røyk',
      point: { x: 22, y: 33 },
    },
  });
});

it('uses the first drawing point and rejects empty text', () => {
  const sector = createMissionMapDrawing({ kind: 'sector', label: 'Teig A', coordinates: '10,10 30,10 20,30' }, now);
  expect(buildFieldLogEntryFromMapObject({ missionId: 'mission-1', mapObject: sector, category: 'observasjon', text: 'Start teig', now }).mapReference).toMatchObject({
    source: 'map-drawing',
    objectId: sector.id,
    label: 'Teig A',
    point: { x: 10, y: 10 },
  });
  expect(() => buildFieldLogEntryFromMapObject({ missionId: 'mission-1', mapObject: sector, category: 'observasjon', text: '   ', now })).toThrow(/text/i);
});
