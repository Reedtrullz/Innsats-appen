import type { OperationalChecklist } from '@/lib/content/schemas';
import { roleGroupMeetsMinimum, ROLE_GROUP_LABELS, type MinRoleGroup, type RoleGroup } from '@/lib/role/role-groups';
import type { MissionContext } from './schemas';

export type RunbookStepStatus = 'done' | 'now' | 'upcoming' | 'skipped' | 'locked';

export interface RunbookStep {
  /** Stable id across renders: `${checklistSlug}:${itemId}`. */
  id: string;
  itemId: string;
  title: string;
  required: boolean;
  sourceIds: string[];
  status: RunbookStepStatus;
  /** Locked by the role lens: visible but not actionable for the active role. */
  locked: boolean;
  /** Caption explaining the lock, e.g. "Vises for lagfører/leder". */
  lockReason: string | null;
}

/** Active role lens applied to the runbook (rollelinse). */
export interface RunbookLens {
  roleGroup: RoleGroup;
}

function lockReasonFor(minRoleGroup: MinRoleGroup, roleNote: string | undefined): string {
  if (roleNote) return roleNote;
  const label = ROLE_GROUP_LABELS[minRoleGroup];
  // "leder" steps are leader-only; "lagforer" steps belong to lagfører and up.
  return minRoleGroup === 'leder' ? `Vises for ${label.toLowerCase()}` : `Vises for ${label.toLowerCase()} og leder`;
}

export interface MissionRunbook {
  checklistSlug: string | null;
  title: string | null;
  steps: RunbookStep[];
  total: number;
  doneCount: number;
  skippedCount: number;
  /** Required steps that were resolved by skipping rather than doing. */
  requiredSkippedCount: number;
  /** Required steps that are neither done nor skipped. */
  requiredRemaining: number;
  /** First step that is neither done nor skipped, in authored order. */
  currentStepId: string | null;
  /** True when there are steps and every required one is done or skipped. */
  allRequiredComplete: boolean;
  /** True when no checklist matched the mission (distinct from "all done"). */
  isEmpty: boolean;
  /** True when the matched checklist is a generic fallback that does not cover the mission scenario. */
  isGenericFallback: boolean;
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
  requiredSkippedCount: 0,
  requiredRemaining: 0,
  currentStepId: null,
  allRequiredComplete: false,
  isEmpty: true,
  isGenericFallback: false,
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
  lens: RunbookLens | null = null,
): MissionRunbook {
  if (!checklist) return { ...EMPTY_RUNBOOK };

  const checked = new Set(progress?.checkedItemIds ?? []);
  const skipped = new Set(progress?.skippedItemIds ?? []);
  const activeRoleGroup = lens?.roleGroup ?? 'ikke-valgt';
  let assignedNow = false;

  const steps: RunbookStep[] = (checklist.items ?? []).map((item) => {
    const minRoleGroup = item.minRoleGroup;
    const locked = Boolean(minRoleGroup) && !roleGroupMeetsMinimum(activeRoleGroup, minRoleGroup!);

    let status: RunbookStepStatus;
    let lockReason: string | null = null;
    if (locked) {
      // Locked steps are visible but never the active step and never block progress.
      status = 'locked';
      lockReason = lockReasonFor(minRoleGroup!, item.roleNote);
    } else if (checked.has(item.id)) status = 'done';
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
      locked,
      lockReason,
    };
  });

  // Locked steps are excluded from the active-role denominator — same mission,
  // role-specific depth ("samme oppdrag, tre dybder").
  const actionable = steps.filter((step) => !step.locked);
  const doneCount = actionable.filter((step) => step.status === 'done').length;
  const skippedCount = actionable.filter((step) => step.status === 'skipped').length;
  const requiredSkippedCount = actionable.filter((step) => step.required && step.status === 'skipped').length;
  const requiredRemaining = actionable.filter(
    (step) => step.required && (step.status === 'now' || step.status === 'upcoming'),
  ).length;
  const current = steps.find((step) => step.status === 'now');

  return {
    checklistSlug: checklist.slug,
    title: checklist.title,
    steps,
    total: actionable.length,
    doneCount,
    skippedCount,
    requiredSkippedCount,
    requiredRemaining,
    currentStepId: current?.id ?? null,
    allRequiredComplete: actionable.length > 0 && requiredRemaining === 0,
    isEmpty: false,
    isGenericFallback: false,
  };
}

/** Select the mission's checklist and build its runbook in one call. */
export function buildMissionRunbook(
  checklists: OperationalChecklist[],
  mission: Pick<MissionContext, 'scenario' | 'phase'>,
  progress: RunbookProgressInput | null = null,
  lens: RunbookLens | null = null,
): MissionRunbook {
  const checklist = selectRunbookChecklist(checklists, mission);
  const runbook = buildChecklistRunbook(checklist, progress, lens);
  const isGenericFallback = Boolean(checklist) && !checklist!.scenarios.includes(mission.scenario);
  return { ...runbook, isGenericFallback };
}
