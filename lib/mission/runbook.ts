import type { OperationalChecklist } from '@/lib/content/schemas';
import type { MissionContext } from './schemas';

export type RunbookStepStatus = 'done' | 'now' | 'upcoming' | 'skipped';

export interface RunbookStep {
  /** Stable id across renders: `${checklistSlug}:${itemId}`. */
  id: string;
  itemId: string;
  title: string;
  required: boolean;
  sourceIds: string[];
  status: RunbookStepStatus;
}

export interface MissionRunbook {
  checklistSlug: string | null;
  title: string | null;
  steps: RunbookStep[];
  total: number;
  doneCount: number;
  skippedCount: number;
  /** Required steps that are neither done nor skipped. */
  requiredRemaining: number;
  /** First step that is neither done nor skipped, in authored order. */
  currentStepId: string | null;
  /** True when there are steps and every required one is done or skipped. */
  allRequiredComplete: boolean;
  /** True when no checklist matched the mission (distinct from "all done"). */
  isEmpty: boolean;
}

/**
 * Progress input — a structural subset of {@link ChecklistRun} so the builder
 * stays decoupled from the persisted (strict) schema. `skippedItemIds` is
 * forward-looking: it is added to ChecklistRun in a later phase and is optional
 * here, so passing today's runs (without it) simply yields no skipped steps.
 */
export interface RunbookProgressInput {
  checkedItemIds?: string[];
  skippedItemIds?: string[];
}

const EMPTY_RUNBOOK: MissionRunbook = {
  checklistSlug: null,
  title: null,
  steps: [],
  total: 0,
  doneCount: 0,
  skippedCount: 0,
  requiredRemaining: 0,
  currentStepId: null,
  allRequiredComplete: false,
  isEmpty: true,
};

/**
 * Pick the checklist that best fits a mission's scenario and phase. Single
 * source of truth for mission/runbook checklist selection (the mission panel
 * imports this). Prefers an exact scenario+phase match, then any phase for the
 * scenario, then a `generelt` checklist for the phase, then any `generelt`
 * checklist. Returns undefined rather than an unrelated fallback.
 */
export function selectRunbookChecklist(
  checklists: OperationalChecklist[],
  mission: Pick<MissionContext, 'scenario' | 'phase'>,
): OperationalChecklist | undefined {
  return (
    checklists.find((checklist) => checklist.scenarios.includes(mission.scenario) && checklist.phase === mission.phase)
    ?? checklists.find((checklist) => checklist.scenarios.includes(mission.scenario))
    ?? checklists.find((checklist) => checklist.scenarios.includes('generelt') && checklist.phase === mission.phase)
    ?? checklists.find((checklist) => checklist.scenarios.includes('generelt'))
  );
}

/**
 * Derive an ordered, advisory runbook from a checklist and local progress.
 * Steps follow the curated checklist order; the current step is the first one
 * not yet done or skipped. Completion is gated on required steps only, so
 * optional steps never block "all required done".
 */
export function buildChecklistRunbook(
  checklist: OperationalChecklist | undefined | null,
  progress: RunbookProgressInput | null = null,
): MissionRunbook {
  if (!checklist) return { ...EMPTY_RUNBOOK };

  const checked = new Set(progress?.checkedItemIds ?? []);
  const skipped = new Set(progress?.skippedItemIds ?? []);
  let assignedNow = false;

  const steps: RunbookStep[] = (checklist.items ?? []).map((item) => {
    let status: RunbookStepStatus;
    if (checked.has(item.id)) status = 'done';
    else if (skipped.has(item.id)) status = 'skipped';
    else if (!assignedNow) {
      status = 'now';
      assignedNow = true;
    } else {
      status = 'upcoming';
    }
    return {
      id: `${checklist.slug}:${item.id}`,
      itemId: item.id,
      title: item.label,
      required: item.required ?? false,
      sourceIds: item.sourceIds ?? [],
      status,
    };
  });

  const doneCount = steps.filter((step) => step.status === 'done').length;
  const skippedCount = steps.filter((step) => step.status === 'skipped').length;
  const requiredRemaining = steps.filter(
    (step) => step.required && (step.status === 'now' || step.status === 'upcoming'),
  ).length;
  const current = steps.find((step) => step.status === 'now');

  return {
    checklistSlug: checklist.slug,
    title: checklist.title,
    steps,
    total: steps.length,
    doneCount,
    skippedCount,
    requiredRemaining,
    currentStepId: current?.id ?? null,
    allRequiredComplete: steps.length > 0 && requiredRemaining === 0,
    isEmpty: false,
  };
}

/** Select the mission's checklist and build its runbook in one call. */
export function buildMissionRunbook(
  checklists: OperationalChecklist[],
  mission: Pick<MissionContext, 'scenario' | 'phase'>,
  progress: RunbookProgressInput | null = null,
): MissionRunbook {
  return buildChecklistRunbook(selectRunbookChecklist(checklists, mission), progress);
}
