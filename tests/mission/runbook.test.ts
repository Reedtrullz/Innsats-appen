import { describe, expect, it } from 'vitest';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { buildChecklistRunbook, buildMissionRunbook, selectRunbookChecklist } from '@/lib/mission/runbook';

const checklists = [
  { slug: 'tilfluktsrom-teknisk-status', title: 'Tilfluktsrom teknisk status', phase: 'for', roles: ['beredskapsvakt'], scenarios: ['tilfluktsrom'], sourceIds: ['src-operativt-konsept-for-sivilforsvaret'], items: [] },
  { slug: 'skogbrann-under-innsats', title: 'Brann/skogbrann under innsats', phase: 'under', roles: ['leder'], scenarios: ['skogbrann', 'brann'], sourceIds: ['src-tiltakskort-under-innsats'], items: [
    { id: 'ordre', label: 'Bekreft ordre og sikkerhet', required: true, sourceIds: ['src-5-punktsordre'] },
    { id: 'vann', label: 'Etabler vannforsyning', required: true, sourceIds: ['src-eksempler-pa-utlegg-fra-pumpe'] },
    { id: 'logg', label: 'Loggfør observasjoner', required: false, sourceIds: [] },
  ] },
  { slug: 'fig-generelt-under', title: 'FIG under innsats', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], sourceIds: ['src-tiltakskort-under-innsats'], items: [] },
] as OperationalChecklist[];

const skogbrann = checklists[1];

describe('selectRunbookChecklist', () => {
  it('prefers an exact scenario and phase match', () => {
    expect(selectRunbookChecklist(checklists, { scenario: 'skogbrann', phase: 'under' })?.slug).toBe('skogbrann-under-innsats');
  });

  it('falls back to a scenario match in another phase before generelt', () => {
    expect(selectRunbookChecklist(checklists, { scenario: 'skogbrann', phase: 'for' })?.slug).toBe('skogbrann-under-innsats');
  });

  it('falls back to a generelt checklist for the phase when the scenario has none', () => {
    expect(selectRunbookChecklist(checklists, { scenario: 'flom', phase: 'under' })?.slug).toBe('fig-generelt-under');
  });

  it('returns undefined when nothing matches, never an unrelated checklist', () => {
    const noGenerelt = checklists.filter((checklist) => !checklist.scenarios.includes('generelt'));
    expect(selectRunbookChecklist(noGenerelt, { scenario: 'flom', phase: 'etter' })).toBeUndefined();
  });
});

describe('buildChecklistRunbook', () => {
  it('returns an empty runbook (isEmpty) when no checklist is selected', () => {
    const runbook = buildChecklistRunbook(undefined);
    expect(runbook.isEmpty).toBe(true);
    expect(runbook.total).toBe(0);
    expect(runbook.currentStepId).toBeNull();
    expect(runbook.allRequiredComplete).toBe(false);
  });

  it('marks the first incomplete step as now and the rest upcoming with no progress', () => {
    const runbook = buildChecklistRunbook(skogbrann);
    expect(runbook.isEmpty).toBe(false);
    expect(runbook.steps.map((step) => step.status)).toEqual(['now', 'upcoming', 'upcoming']);
    expect(runbook.currentStepId).toBe('skogbrann-under-innsats:ordre');
    expect(runbook.allRequiredComplete).toBe(false);
    expect(runbook.requiredRemaining).toBe(2);
  });

  it('uses a stable composite id and carries required flag and sourceIds', () => {
    const [first] = buildChecklistRunbook(skogbrann).steps;
    expect(first.id).toBe('skogbrann-under-innsats:ordre');
    expect(first.itemId).toBe('ordre');
    expect(first.required).toBe(true);
    expect(first.sourceIds).toEqual(['src-5-punktsordre']);
  });

  it('advances now to the first unchecked step and counts done', () => {
    const runbook = buildChecklistRunbook(skogbrann, { checkedItemIds: ['ordre'] });
    expect(runbook.steps.map((step) => step.status)).toEqual(['done', 'now', 'upcoming']);
    expect(runbook.currentStepId).toBe('skogbrann-under-innsats:vann');
    expect(runbook.doneCount).toBe(1);
    expect(runbook.requiredRemaining).toBe(1);
  });

  it('treats skipped steps as resolved: not now, not required-remaining', () => {
    const runbook = buildChecklistRunbook(skogbrann, { checkedItemIds: ['ordre'], skippedItemIds: ['vann'] });
    expect(runbook.steps.map((step) => step.status)).toEqual(['done', 'skipped', 'now']);
    expect(runbook.currentStepId).toBe('skogbrann-under-innsats:logg');
    expect(runbook.skippedCount).toBe(1);
    expect(runbook.requiredRemaining).toBe(0);
    expect(runbook.allRequiredComplete).toBe(true);
  });

  it('reports all required complete even while an optional step is still current', () => {
    const runbook = buildChecklistRunbook(skogbrann, { checkedItemIds: ['ordre', 'vann'] });
    expect(runbook.allRequiredComplete).toBe(true);
    expect(runbook.requiredRemaining).toBe(0);
    expect(runbook.currentStepId).toBe('skogbrann-under-innsats:logg');
  });

  it('has no current step and is complete when every step is resolved', () => {
    const runbook = buildChecklistRunbook(skogbrann, { checkedItemIds: ['ordre', 'vann', 'logg'] });
    expect(runbook.currentStepId).toBeNull();
    expect(runbook.allRequiredComplete).toBe(true);
    expect(runbook.doneCount).toBe(3);
  });

  it('handles a checklist with no items as not empty but with no current step', () => {
    const runbook = buildChecklistRunbook(checklists[0]);
    expect(runbook.isEmpty).toBe(false);
    expect(runbook.total).toBe(0);
    expect(runbook.currentStepId).toBeNull();
    expect(runbook.allRequiredComplete).toBe(false);
  });
});

describe('buildMissionRunbook', () => {
  it('selects the mission checklist and derives its runbook', () => {
    const runbook = buildMissionRunbook(checklists, { scenario: 'skogbrann', phase: 'under' }, { checkedItemIds: ['ordre'] });
    expect(runbook.checklistSlug).toBe('skogbrann-under-innsats');
    expect(runbook.currentStepId).toBe('skogbrann-under-innsats:vann');
  });

  it('yields an empty runbook when the mission scenario has no checklist', () => {
    const noGenerelt = checklists.filter((checklist) => !checklist.scenarios.includes('generelt'));
    expect(buildMissionRunbook(noGenerelt, { scenario: 'flom', phase: 'etter' }).isEmpty).toBe(true);
  });

  it('flags a generic fallback when the scenario has no dedicated checklist', () => {
    const runbook = buildMissionRunbook(checklists, { scenario: 'flom', phase: 'under' });
    expect(runbook.checklistSlug).toBe('fig-generelt-under');
    expect(runbook.isGenericFallback).toBe(true);
  });

  it('is not a generic fallback when the checklist covers the scenario', () => {
    expect(buildMissionRunbook(checklists, { scenario: 'skogbrann', phase: 'under' }).isGenericFallback).toBe(false);
  });
});

describe('role lens (rollelinse)', () => {
  const lensChecklist = {
    slug: 'lens-test', title: 'Lens test', phase: 'under', roles: ['leder'], scenarios: ['skogbrann'],
    sourceIds: ['src-tiltakskort-under-innsats'], items: [
      { id: 'sikkerhet', label: 'Sikkerhet', required: true, sourceIds: [] },
      { id: 'planlegg-vann', label: 'Planlegg vannforsyning', required: true, sourceIds: [], minRoleGroup: 'lagforer', roleNote: 'Planlegging — vises for lagfører og leder' },
      { id: 'beslutt', label: 'Beslutt tiltak', required: false, sourceIds: [], minRoleGroup: 'leder' },
    ],
  } as unknown as OperationalChecklist;

  it('does not lock anything when no role is chosen', () => {
    const runbook = buildChecklistRunbook(lensChecklist, null, { roleGroup: 'ikke-valgt' });
    expect(runbook.steps.every((step) => !step.locked)).toBe(true);
    expect(runbook.total).toBe(3);
  });

  it('locks higher-role steps for mannskap and excludes them from the denominator', () => {
    const runbook = buildChecklistRunbook(lensChecklist, null, { roleGroup: 'mannskap' });
    const byId = Object.fromEntries(runbook.steps.map((step) => [step.itemId, step]));
    expect(byId['planlegg-vann'].status).toBe('locked');
    expect(byId['planlegg-vann'].lockReason).toBe('Planlegging — vises for lagfører og leder');
    expect(byId['beslutt'].status).toBe('locked');
    // Active step is the first non-locked unresolved step.
    expect(byId['sikkerhet'].status).toBe('now');
    expect(runbook.total).toBe(1);
  });

  it('unlocks planning for lagfører but keeps leder-only steps locked', () => {
    const runbook = buildChecklistRunbook(lensChecklist, null, { roleGroup: 'lagforer' });
    const byId = Object.fromEntries(runbook.steps.map((step) => [step.itemId, step]));
    expect(byId['planlegg-vann'].locked).toBe(false);
    expect(byId['beslutt'].status).toBe('locked');
    expect(runbook.total).toBe(2);
  });

  it('unlocks every step for leder', () => {
    const runbook = buildChecklistRunbook(lensChecklist, null, { roleGroup: 'leder' });
    expect(runbook.steps.every((step) => !step.locked)).toBe(true);
    expect(runbook.total).toBe(3);
  });

  it('supplies a default lock reason when roleNote is absent', () => {
    const runbook = buildChecklistRunbook(lensChecklist, null, { roleGroup: 'mannskap' });
    const beslutt = runbook.steps.find((step) => step.itemId === 'beslutt');
    expect(beslutt?.lockReason).toBe('Vises for leder');
  });
});
