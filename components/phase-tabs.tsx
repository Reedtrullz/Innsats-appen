'use client';

import type { Phase } from '@/lib/content/taxonomy';
import { phaseLabels, phases } from '@/lib/content/taxonomy';

/**
 * Fase-stepper: Før · Under · Etter shown as a pill-row.
 * Active phase glows with the cyan "nå" signal; done phases use the green tone;
 * upcoming are muted. Used both as a filter tab and as a runbook progress indicator.
 */
export function PhaseTabs({
  value,
  onChange,
  donePhasesSet,
}: {
  value?: Phase;
  onChange: (phase?: Phase) => void;
  /** Phases whose required steps are all done — rendered in the "done" colour. */
  donePhasesSet?: Set<Phase>;
}) {
  return (
    <div
      className="flex gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5"
      role="tablist"
      aria-label="Fase"
    >
      {/* "Alle" filter only shown when no donePhasesSet (i.e. used as filter, not stepper) */}
      {!donePhasesSet && (
        <button
          type="button"
          role="tab"
          aria-selected={!value}
          onClick={() => onChange(undefined)}
          className={`min-h-10 flex-1 rounded-xl px-3 text-sm font-semibold transition ${
            !value
              ? 'bg-[var(--command-bg)] text-[var(--command-fg)] shadow-sm'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Alle
        </button>
      )}

      {phases.map((phase) => {
        const isActive = value === phase;
        const isDone = donePhasesSet?.has(phase) ?? false;

        return (
          <button
            key={phase}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(phase)}
            className={`min-h-10 flex-1 rounded-xl px-3 text-sm font-semibold transition ${
              isActive
                ? 'bg-[#38bdf8] text-[#04141f] shadow-[0_0_0_1px_rgba(56,189,248,.5),0_4px_12px_rgba(56,189,248,.2)]'
                : isDone
                  ? 'text-[#34d399] hover:bg-[#34d399]/10'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {isDone && !isActive ? `✓ ${phaseLabels[phase]}` : phaseLabels[phase]}
          </button>
        );
      })}
    </div>
  );
}
