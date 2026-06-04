import { mapStateForMission, normalizeMissionMapState } from '@/lib/maps/operations-map';

const createdAt = '2026-06-04T12:00:00.000Z';

function marker(input: { id: string; missionId: string; label: string }) {
  return {
    id: input.id,
    itemType: 'marker',
    kind: 'observation',
    label: input.label,
    missionId: input.missionId,
    point: { x: 10, y: 20 },
    createdAt,
  } as const;
}

function drawing(input: { id: string; missionId: string; label: string }) {
  return {
    id: input.id,
    itemType: 'drawing',
    kind: 'sector',
    label: input.label,
    missionId: input.missionId,
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ],
    createdAt,
  } as const;
}

it('filters map objects by mission id', () => {
  const state = normalizeMissionMapState({
    markers: [
      marker({ id: 'a', missionId: 'mission-a', label: 'A' }),
      marker({ id: 'b', missionId: 'mission-b', label: 'B' }),
    ],
    drawings: [
      drawing({ id: 'sector-a', missionId: 'mission-a', label: 'Sector A' }),
      drawing({ id: 'sector-b', missionId: 'mission-b', label: 'Sector B' }),
    ],
  });

  const scoped = mapStateForMission(state, 'mission-a');

  expect(scoped.markers).toMatchObject([{ id: 'a' }]);
  expect(scoped.markers).toHaveLength(1);
  expect(scoped.drawings).toMatchObject([{ id: 'sector-a' }]);
  expect(scoped.drawings).toHaveLength(1);
});
