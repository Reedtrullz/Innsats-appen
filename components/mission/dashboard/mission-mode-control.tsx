'use client';

import { missionModeLabels, type MissionMode } from './hash-navigation';

// Subtext clarifies the split: "Nå" is the single next grep, "Arbeid" is the
// full board. Kept aria-hidden so the accessible tab name stays the bare label.
const missionModeHints: Record<MissionMode, string> = {
  now: 'neste grep',
  work: 'full tavle',
  export: 'del/lever',
};

export function MissionModeControl({ activeMode, onModeChange }: { activeMode: MissionMode; onModeChange: (mode: MissionMode) => void }) {
  const modes: MissionMode[] = ['now', 'work', 'export'];
  return (
    <div className="sticky top-[5.65rem] z-20 -mx-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/85" role="tablist" aria-label="Oppdragsmodus">
      <div className="grid grid-cols-3 gap-1">
        {modes.map((mode) => {
          const selected = activeMode === mode;
          return (
            <button
              key={mode}
              id={`mission-${mode}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`mission-${mode}-panel`}
              onClick={() => onModeChange(mode)}
              className={selected
                ? 'flex min-h-11 flex-col items-center justify-center rounded-xl bg-[#082F49] px-2 py-1 text-sm font-black text-white shadow-sm'
                : 'flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1 text-sm font-black text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]'}
            >
              <span>{missionModeLabels[mode]}</span>
              <span aria-hidden="true" className={`text-[0.6rem] font-bold uppercase tracking-wide ${selected ? 'text-sky-200' : 'text-[var(--text-muted)]'}`}>{missionModeHints[mode]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
