import type { OperationalChecklist } from '@/lib/content/schemas';
import { phaseLabels, type Phase } from '@/lib/content/taxonomy';
import { buildChecklistRunbook, selectRunbookChecklist } from './runbook';
import type { ChecklistRun, FieldLogEntry, MissionContext } from './schemas';

/**
 * Whether a mission phase has all its required runbook steps resolved (done or
 * skipped). Re-uses {@link selectRunbookChecklist} + {@link buildChecklistRunbook}
 * with that phase's own ChecklistRun, so each phase is gated on its own progress.
 *
 * A phase with no checklist (or an item-less one) is never "complete" — it cannot
 * be gated on completion. The phase stepper lets the user advance from such a
 * phase manually instead.
 */
export function isPhaseComplete(
  checklists: OperationalChecklist[],
  mission: Pick<MissionContext, 'scenario'>,
  runsForMission: Pick<ChecklistRun, 'templateSlug' | 'checkedItemIds' | 'skippedItemIds'>[],
  phase: Phase,
): boolean {
  const checklist = selectRunbookChecklist(checklists, { scenario: mission.scenario, phase });
  if (!checklist) return false;
  const run = runsForMission.find((item) => item.templateSlug === checklist.slug);
  const runbook = buildChecklistRunbook(checklist, {
    checkedItemIds: run?.checkedItemIds,
    skippedItemIds: run?.skippedItemIds,
  });
  return runbook.allRequiredComplete;
}

/**
 * Produce the mission with its phase moved to `targetPhase` and an advisory
 * field-log entry recording the transition. Phase changes are never automatic —
 * this is only invoked from explicit user actions (stepper / "go to next phase"
 * CTA). The log entry holds no persondata (only phase labels) and gives the
 * after-action report a phase timeline. Progress per phase lives in its own
 * ChecklistRun and is untouched here.
 */
export function withPhaseChange(mission: MissionContext, targetPhase: Phase): MissionContext {
  if (mission.phase === targetPhase) return mission;
  const entry: FieldLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    category: 'beslutning',
    text: `Fase: ${phaseLabels[mission.phase]} → ${phaseLabels[targetPhase]}`,
    criticalObservation: false,
    mustBeForwarded: false,
  };
  return {
    ...mission,
    phase: targetPhase,
    fieldLogEntries: [...(mission.fieldLogEntries ?? []), entry],
    updatedAt: new Date().toISOString(),
  };
}
