import { createMreZonePlanObjects } from '@/lib/maps/mre-zone-plan';

const now = new Date('2026-06-18T22:50:00.000Z');

it('creates a mission-scoped MRE zone plan with clean and dirty zones, rinse line and checkpoints', () => {
  const plan = createMreZonePlanObjects({
    missionId: 'mission-mre-a',
    label: 'Rens nord',
    dirtyZonePoints: [
      { x: '10', y: '20' },
      { x: '38', y: '18' },
      { x: '36', y: '46' },
      { x: '12', y: '48' },
    ],
    cleanZonePoints: [
      { x: '48', y: '22' },
      { x: '76', y: '22' },
      { x: '74', y: '48' },
      { x: '50', y: '50' },
    ],
    rinseLinePoints: [
      { x: '40', y: '20' },
      { x: '44', y: '52' },
    ],
    entry: { x: '14', y: '24' },
    exit: { x: '54', y: '46' },
    waste: { x: '32', y: '54' },
    note: 'Samband og stoppkriterier avklart',
  }, now);

  expect(plan.markers.map((marker) => marker.kind)).toEqual(['meeting-point', 'meeting-point', 'resource']);
  expect(plan.markers.every((marker) => marker.missionId === 'mission-mre-a')).toBe(true);
  expect(plan.markers.map((marker) => marker.label)).toEqual([
    'Innpassering Rens nord',
    'Utpassering Rens nord',
    'Avfallspunkt Rens nord',
  ]);
  expect(plan.dirtyZone).toMatchObject({
    missionId: 'mission-mre-a',
    itemType: 'drawing',
    kind: 'polygon',
    label: 'Uren side Rens nord',
    points: [{ x: 10, y: 20 }, { x: 38, y: 18 }, { x: 36, y: 46 }, { x: 12, y: 48 }],
  });
  expect(plan.cleanZone).toMatchObject({
    missionId: 'mission-mre-a',
    itemType: 'drawing',
    kind: 'polygon',
    label: 'Ren side Rens nord',
  });
  expect(plan.rinseLine).toMatchObject({
    missionId: 'mission-mre-a',
    itemType: 'drawing',
    kind: 'line',
    label: 'Renselinje Rens nord',
    points: [{ x: 40, y: 20 }, { x: 44, y: 52 }],
  });
  expect(plan.summary.zoneCount).toBe(2);
  expect(plan.summary.markerCount).toBe(3);
  expect(plan.summary.rinseLineLengthSchematicUnits).toBeGreaterThan(30);
});

it('keeps MRE zone prompts local, conservative and free of CBRN tactical authority claims', () => {
  const plan = createMreZonePlanObjects({
    missionId: 'mission-mre-b',
    label: 'Rens sør',
    dirtyZonePoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }],
    cleanZonePoints: [{ x: 40, y: 10 }, { x: 60, y: 10 }, { x: 60, y: 30 }],
    rinseLinePoints: [{ x: 34, y: 10 }, { x: 36, y: 30 }],
    entry: { x: 12, y: 12 },
    exit: { x: 42, y: 28 },
    waste: { x: 28, y: 34 },
  }, now);

  const promptText = plan.planningPrompts.join('\n');
  expect(promptText).toMatch(/innsatsleder|fagmyndighet/i);
  expect(promptText).toMatch(/ren side|uren side|renselinje/i);
  expect(promptText).toMatch(/kapasitet|kø|forbruk|avfallspunkt|stopp/i);
  expect(promptText).toMatch(/fastsetter ikke stoff|fastsett ikkje stoff|vernenivå|sonegrense/i);
  expect(promptText).not.toMatch(/Level\s*A|nivå\s*A|sarin|klorgass|cyanid/i);
});

it('rejects invalid zones and sensitive operational text before creating MRE objects', () => {
  expect(() => createMreZonePlanObjects({
    missionId: 'mission-mre-c',
    label: 'Rens vest',
    dirtyZonePoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }],
    cleanZonePoints: [{ x: 40, y: 10 }, { x: 60, y: 10 }, { x: 60, y: 30 }],
    rinseLinePoints: [{ x: 34, y: 10 }, { x: 36, y: 30 }],
    entry: { x: 12, y: 12 },
    exit: { x: 42, y: 28 },
    waste: { x: 28, y: 34 },
  }, now)).toThrow(/at least three/i);

  expect(() => createMreZonePlanObjects({
    missionId: 'mission-mre-d',
    label: '01017000027',
    dirtyZonePoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }],
    cleanZonePoints: [{ x: 40, y: 10 }, { x: 60, y: 10 }, { x: 60, y: 30 }],
    rinseLinePoints: [{ x: 34, y: 10 }, { x: 36, y: 30 }],
    entry: { x: 12, y: 12 },
    exit: { x: 42, y: 28 },
    waste: { x: 28, y: 34 },
  }, now)).toThrow(/persondata|identifikator|private/i);
});
