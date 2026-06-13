import type { ActionCardStep, NormalizedActionCardStep } from './schemas';

/**
 * Normalize a backward-compatible action-card step (string or object) to the
 * object shape, so UI and pipeline code never has to branch on the form (P2-2).
 * Legacy string steps become `{ action, imageIds: [], sourceIds: [] }`.
 */
export function normalizeStep(step: ActionCardStep): NormalizedActionCardStep {
  if (typeof step === 'string') {
    return { action: step, imageIds: [], sourceIds: [] };
  }
  return {
    action: step.action,
    how: step.how,
    imageIds: step.imageIds ?? [],
    sourceIds: step.sourceIds ?? [],
  };
}

/** The plain action text of a step, for search/filter/length surfaces. */
export function stepText(step: ActionCardStep): string {
  return typeof step === 'string' ? step : step.action;
}
