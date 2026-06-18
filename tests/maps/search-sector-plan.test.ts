import { createSearchSectorPlanObjects } from '@/lib/maps/search-sector-plan';

const now = new Date('2026-06-18T21:00:00.000Z');

it('creates a mission-scoped search sector drawing with start and return markers', () => {
  const plan = createSearchSectorPlanObjects({
    missionId: 'mission-search-a',
    label: 'Teig alfa',
    sectorPoints: [
      { x: '10', y: '20' },
      { x: '42', y: '18' },
      { x: '48', y: '52' },
      { x: '14', y: '58' },
    ],
    start: { x: '12', y: '22' },
    exit: { x: '40', y: '55' },
    note: 'Rapporteringsintervall avklart',
  }, now);

  expect(plan.markers).toHaveLength(2);
  expect(plan.markers.map((marker) => marker.kind)).toEqual(['meeting-point', 'meeting-point']);
  expect(plan.markers.every((marker) => marker.missionId === 'mission-search-a')).toBe(true);
  expect(plan.markers.map((marker) => marker.label)).toEqual([
    'Startpunkt Teig alfa',
    'Returpunkt Teig alfa',
  ]);
  expect(plan.sector).toMatchObject({
    missionId: 'mission-search-a',
    itemType: 'drawing',
    kind: 'sector',
    label: 'Søketeig Teig alfa',
    points: [{ x: 10, y: 20 }, { x: 42, y: 18 }, { x: 48, y: 52 }, { x: 14, y: 58 }],
  });
  expect(plan.summary.boundaryPointCount).toBe(4);
  expect(plan.summary.markerCount).toBe(2);
});

it('keeps search-sector prompts local, conservative and free of live tracking advice', () => {
  const plan = createSearchSectorPlanObjects({
    missionId: 'mission-search-b',
    label: 'Teig bravo',
    sectorPoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }],
    start: { x: 12, y: 12 },
    exit: { x: 28, y: 28 },
  }, now);

  const promptText = plan.planningPrompts.join('\n');
  expect(promptText).toMatch(/KO\/leder|innsatsleder/i);
  expect(promptText).toMatch(/teiggrense|metode|rapporteringsintervall/i);
  expect(promptText).toMatch(/dekningsgrad|hindringer|avvik/i);
  expect(promptText).toMatch(/ikke.*live tracking|ingen.*live tracking/i);
  expect(promptText).not.toMatch(/GPS-sporing|blue-force|sanntidsposisjon/i);
});

it('rejects invalid sectors and sensitive operational text before creating search objects', () => {
  expect(() => createSearchSectorPlanObjects({
    missionId: 'mission-search-c',
    label: 'Teig charlie',
    sectorPoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }],
    start: { x: 12, y: 12 },
    exit: { x: 28, y: 28 },
  }, now)).toThrow(/at least three/i);

  expect(() => createSearchSectorPlanObjects({
    missionId: 'mission-search-d',
    label: '01017000027',
    sectorPoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }],
    start: { x: 12, y: 12 },
    exit: { x: 28, y: 28 },
  }, now)).toThrow(/persondata|identifikator|private/i);
});
