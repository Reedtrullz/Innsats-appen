import { describe, expect, it } from 'vitest';

import { ActionCardStepSchema } from '@/lib/content/schemas';
import { normalizeStep, stepSearchText, stepText } from '@/lib/content/steps';

describe('action-card step normalization (P2-2)', () => {
  it('normalizes a legacy string step to the object shape', () => {
    expect(normalizeStep('Avklar vannvei.')).toEqual({ action: 'Avklar vannvei.', imageIds: [], sourceIds: [] });
  });

  it('passes object-form fields through and defaults missing arrays', () => {
    expect(normalizeStep({ action: 'Etabler pumpested.', how: 'Slik gjør du det.', imageIds: ['img-1'], sourceIds: ['src-x'] }))
      .toEqual({ action: 'Etabler pumpested.', how: 'Slik gjør du det.', imageIds: ['img-1'], sourceIds: ['src-x'] });
    expect(normalizeStep({ action: 'Uten lister.' })).toEqual({ action: 'Uten lister.', how: undefined, imageIds: [], sourceIds: [] });
  });

  it('stepText returns the action text for both forms', () => {
    expect(stepText('Overvåk vannstand.')).toBe('Overvåk vannstand.');
    expect(stepText({ action: 'Etabler pumpested.', imageIds: [] })).toBe('Etabler pumpested.');
  });

  it('stepSearchText includes optional how detail for full-text lookup', () => {
    expect(stepSearchText('Overvåk vannstand.')).toBe('Overvåk vannstand.');
    expect(stepSearchText({ action: 'Etabler pumpested.', how: 'Hold sugesiden kort.', imageIds: [] }))
      .toBe('Etabler pumpested. Hold sugesiden kort.');
  });

  it('the schema accepts both string and object steps (backward compatible)', () => {
    expect(ActionCardStepSchema.parse('legacy string')).toBe('legacy string');
    const parsed = ActionCardStepSchema.parse({ action: 'obj', imageIds: ['a'] });
    expect(parsed).toMatchObject({ action: 'obj', imageIds: ['a'], sourceIds: [] });
  });
});
