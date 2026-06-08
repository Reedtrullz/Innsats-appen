'use client';

import { missionModeLabels, type MissionMode } from './hash-navigation';

export function MissionModeControl({ activeMode, onModeChange }: { activeMode: MissionMode; onModeChange: (mode: MissionMode) => void }) {
  const modes: MissionMode[] = ['now', 'work', 'export'];
  return (
    <div className="sticky top-[5.65rem] z-20 -mx-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85" role="tablist" aria-label="Oppdragsmodus">
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
                ? 'min-h-11 rounded-xl bg-[#082F49] px-3 text-sm font-black text-white shadow-sm'
                : 'min-h-11 rounded-xl px-3 text-sm font-black text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#082F49]'}
            >
              {missionModeLabels[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
