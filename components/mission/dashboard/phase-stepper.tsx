'use client';

import type { OperationalChecklist } from '@/lib/content/schemas';
import { phaseLabels, phases, type Phase } from '@/lib/content/taxonomy';
import type { listChecklistRuns } from '@/lib/mission/local-store';
import { isPhaseComplete, withPhaseChange } from '@/lib/mission/phase-progress';
import type { MissionContext } from '@/lib/mission/schemas';
import type { MissionUpdate } from './dashboard-types';

/**
 * Always-visible Før · Under · Etter stepper. The active phase is highlighted;
 * any phase whose required steps are resolved gets a check. Every phase is a
 * button — the user may jump freely forward or back at any time, and each
 * phase's progress is preserved in its own ChecklistRun (nothing is reset).
 *
 * Theme-safe: only solid palette classes the `.dark` override flips (navy /
 * emerald-100 / slate-100), never a gradient or opacity-suffix background nor a
 * dark text colour on a saturated surface (see no-untheme-safe-backgrounds test).
 */
export function PhaseStepper({
  mission,
  checklists,
  checklistRuns,
  onMissionChange,
}: {
  mission: MissionContext;
  checklists: OperationalChecklist[];
  checklistRuns: Awaited<ReturnType<typeof listChecklistRuns>>;
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
}) {
  function goToPhase(phase: Phase) {
    if (phase === mission.phase) return;
    void onMissionChange(mission.id, (current) => withPhaseChange(current, phase));
  }

  return (
    <nav aria-label="Faser" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Fase — anbefalt rekkefølge, ikke en kommando</p>
      <ol className="mt-2 grid grid-cols-3 gap-2">
        {phases.map((phase) => {
          const isCurrent = phase === mission.phase;
          const complete = isPhaseComplete(checklists, mission, checklistRuns, phase);
          const tone = isCurrent
            ? 'bg-[#082F49] text-white ring-2 ring-[#082F49]/80 shadow-[0_0_0_1px_rgba(56,189,248,.3),0_4px_12px_rgba(56,189,248,.15)]'
            : complete
              ? 'bg-[var(--success-surface)] text-[var(--success-fg)] ring-1 ring-[#34d399]/30'
              : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border)]';
          return (
            <li key={phase}>
              <button
                type="button"
                onClick={() => goToPhase(phase)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-black ${tone}`}
              >
                {complete && !isCurrent ? <span aria-hidden="true">✓</span> : null}
                <span>{phaseLabels[phase]}</span>
                <span className="sr-only">
                  {isCurrent ? ' (nåværende fase)' : complete ? ' (påkrevde steg gjort)' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
