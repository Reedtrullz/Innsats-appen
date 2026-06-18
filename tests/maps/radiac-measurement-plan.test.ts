import { createRadiacMeasurementPlanObjects } from '@/lib/maps/radiac-measurement-plan';

const now = new Date('2026-06-18T20:30:00.000Z');

it('creates mission-scoped RADIAC measurement markers and an ordered route line', () => {
  const plan = createRadiacMeasurementPlanObjects({
    missionId: 'mission-radiac-a',
    label: 'RAD nord',
    points: [
      { x: '15', y: '30' },
      { x: '35', y: '40' },
      { x: '55', y: '45' },
    ],
    note: 'Rapporteringsformat avklart',
  }, now);

  expect(plan.markers).toHaveLength(3);
  expect(plan.markers.every((marker) => marker.kind === 'observation')).toBe(true);
  expect(plan.markers.every((marker) => marker.missionId === 'mission-radiac-a')).toBe(true);
  expect(plan.markers.map((marker) => marker.label)).toEqual([
    'Målepunkt 1 RAD nord',
    'Målepunkt 2 RAD nord',
    'Målepunkt 3 RAD nord',
  ]);
  expect(plan.routeLine).toMatchObject({
    missionId: 'mission-radiac-a',
    itemType: 'drawing',
    kind: 'line',
    label: 'Målerute RAD nord',
    points: [{ x: 15, y: 30 }, { x: 35, y: 40 }, { x: 55, y: 45 }],
  });
  expect(plan.summary.measurementPointCount).toBe(3);
  expect(plan.summary.routeLengthSchematicUnits).toBeGreaterThan(40);
});

it('keeps RADIAC prompts conservative and free of dose formulas', () => {
  const plan = createRadiacMeasurementPlanObjects({
    missionId: 'mission-radiac-b',
    label: 'RAD sør',
    points: [
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ],
  }, now);

  const promptText = plan.planningPrompts.join('\n');
  expect(promptText).toMatch(/måleordre/i);
  expect(promptText).toMatch(/rapporteringsformat/i);
  expect(promptText).toMatch(/beregner ikke dose/i);
  expect(promptText).toMatch(/fagmyndighet|faglig kontakt/i);
  expect(promptText).not.toMatch(/\b\d+\s*(?:µ?Sv\/h|mSv|dos[e]?grense|oppholdstid)\b/i);
});

it('rejects invalid points and sensitive operational text before creating RADIAC objects', () => {
  expect(() => createRadiacMeasurementPlanObjects({
    missionId: 'mission-radiac-c',
    label: 'RAD vest',
    points: [{ x: 5, y: 5 }],
  }, now)).toThrow(/at least two/i);

  expect(() => createRadiacMeasurementPlanObjects({
    missionId: 'mission-radiac-d',
    label: '01017000027',
    points: [{ x: 5, y: 5 }, { x: 10, y: 10 }],
  }, now)).toThrow(/persondata|identifikator|private/i);
});
