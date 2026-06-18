import { createWaterSupplyPlanObjects } from '@/lib/maps/water-supply-plan';

const now = new Date('2026-06-18T19:30:00.000Z');

it('creates mission-scoped water source, pump, delivery and hose-line objects', () => {
  const plan = createWaterSupplyPlanObjects({
    missionId: 'mission-skogbrann-a',
    label: 'Skogbrann vest',
    waterSource: { x: '10', y: '20' },
    pump: { x: '25', y: '35' },
    delivery: { x: '60', y: '50' },
    note: 'Avklart med leder',
  }, now);

  expect(plan.markers).toHaveLength(3);
  expect(plan.markers.map((marker) => marker.kind)).toEqual(['resource', 'pump-location', 'resource']);
  expect(plan.markers.map((marker) => marker.label)).toEqual([
    'Vannkilde Skogbrann vest',
    'Pumpeplass Skogbrann vest',
    'Leveringspunkt Skogbrann vest',
  ]);
  expect(plan.markers.every((marker) => marker.missionId === 'mission-skogbrann-a')).toBe(true);
  expect(plan.hoseLine).toMatchObject({
    missionId: 'mission-skogbrann-a',
    itemType: 'drawing',
    kind: 'line',
    label: 'Slangevei Skogbrann vest',
    points: [{ x: 10, y: 20 }, { x: 25, y: 35 }, { x: 60, y: 50 }],
  });
  expect(plan.summary.hoseLengthSchematicUnits).toBeCloseTo(59.3, 1);
});

it('keeps water-supply prompts source-conservative and free of capacity formulas', () => {
  const plan = createWaterSupplyPlanObjects({
    missionId: 'mission-skogbrann-b',
    label: 'Langt utlegg',
    waterSource: { x: 5, y: 10 },
    pump: { x: 50, y: 50 },
    delivery: { x: 95, y: 85 },
  }, now);

  const promptText = plan.planningPrompts.join('\n');
  expect(promptText).toMatch(/vannføring/i);
  expect(promptText).toMatch(/trykktap/i);
  expect(promptText).toMatch(/trykkforsterkning|seriekjøring/i);
  expect(promptText).toMatch(/leder\/fagressurs/i);
  expect(promptText).not.toMatch(/\b\d+\s*(?:l\/min|liter\/min|bar|m3\/t)\b/i);
});

it('rejects sensitive operational text before creating map plan objects', () => {
  expect(() => createWaterSupplyPlanObjects({
    missionId: 'mission-skogbrann-c',
    label: '01017000027',
    waterSource: { x: 5, y: 10 },
    pump: { x: 50, y: 50 },
    delivery: { x: 95, y: 85 },
  }, now)).toThrow(/persondata|identifikator|private/i);
});
