import { createWaterSupplyPlanObjects } from '@/lib/maps/water-supply-plan';
import { createSearchSectorPlanObjects } from '@/lib/maps/search-sector-plan';
import {
  deriveWaterSupplyAdvisory,
  deriveSearchSectorAdvisory,
  RELAY_HOSE_LENGTH_THRESHOLD,
} from '@/lib/maps/map-advisory';

const now = new Date('2026-06-20T11:00:00.000Z');

function waterPlan(source: { x: string; y: string }, pump: { x: string; y: string }, delivery: { x: string; y: string }) {
  return createWaterSupplyPlanObjects(
    { missionId: 'mission-a', label: 'test', waterSource: source, pump, delivery },
    now,
  );
}

it('recommends relay/series pumping for a long hose lay and stays at medium confidence', () => {
  const plan = waterPlan({ x: '12', y: '78' }, { x: '28', y: '62' }, { x: '58', y: '42' });
  expect(plan.summary.hoseLengthSchematicUnits).toBeGreaterThanOrEqual(RELAY_HOSE_LENGTH_THRESHOLD);

  const advisory = deriveWaterSupplyAdvisory(plan);
  expect(advisory.suggestion).toMatch(/relé|seriekjøring/i);
  expect(advisory.confidence).toBe('medium');
  expect(advisory.sourceBasis).toBe('assisted');
  expect(advisory.assumptions).toContain('høyde ukjent');
  expect(advisory.confidenceNote).toMatch(/bekreft på stedet/i);
});

it('does not push relay for a short hose lay', () => {
  const plan = waterPlan({ x: '40', y: '50' }, { x: '44', y: '52' }, { x: '48', y: '50' });
  expect(plan.summary.hoseLengthSchematicUnits).toBeLessThan(RELAY_HOSE_LENGTH_THRESHOLD);

  const advisory = deriveWaterSupplyAdvisory(plan);
  expect(advisory.suggestion).toMatch(/enkelt utlegg/i);
  expect(advisory.confidence).toBe('medium');
});

it('derives a low-confidence, source-backed search-sector advisory', () => {
  const plan = createSearchSectorPlanObjects(
    {
      missionId: 'mission-a',
      label: 'Teig alfa',
      sectorPoints: [
        { x: '10', y: '20' },
        { x: '42', y: '18' },
        { x: '48', y: '52' },
        { x: '14', y: '58' },
      ],
      start: { x: '12', y: '22' },
      exit: { x: '40', y: '55' },
    },
    now,
  );

  const advisory = deriveSearchSectorAdvisory(plan);
  expect(advisory.suggestion).toMatch(/prioriter/i);
  expect(advisory.confidence).toBe('low');
  expect(advisory.sourceBasis).toBe('sourced');
  expect(advisory.sourceNote).toMatch(/savnetatferd/i);
  expect(advisory.confidenceNote).toMatch(/Innsatsleder beslutter/i);
});
