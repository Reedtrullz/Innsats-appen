import { describe, expect, it } from 'vitest';
import { stackSchematicLabelYs } from '@/lib/maps/schematic-labels';

describe('schematic label stacking', () => {
  it('keeps far-apart labels at their default offset', () => {
    expect(stackSchematicLabelYs([
      { x: 10, y: 20 },
      { x: 80, y: 70 },
    ])).toEqual([17, 67]);
  });

  it('clamps labels near the top edge into the viewBox', () => {
    expect(stackSchematicLabelYs([{ x: 50, y: 4 }])).toEqual([7]);
  });

  it('stacks three nearby markers instead of overprinting', () => {
    const ys = stackSchematicLabelYs([
      { x: 40, y: 40 },
      { x: 42, y: 41 },
      { x: 44, y: 39 },
    ]);
    expect(new Set(ys).size).toBe(3);
    const sorted = [...ys].sort((a, b) => a - b);
    expect(sorted[1] - sorted[0]).toBeGreaterThanOrEqual(4);
    expect(sorted[2] - sorted[1]).toBeGreaterThanOrEqual(4);
  });

  it('does not stack labels that are horizontally far apart', () => {
    expect(stackSchematicLabelYs([
      { x: 10, y: 40 },
      { x: 60, y: 40 },
    ])).toEqual([37, 37]);
  });
});
