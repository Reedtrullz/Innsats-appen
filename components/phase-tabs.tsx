import type { Phase } from '@/lib/content/taxonomy';
import { phaseLabels, phases } from '@/lib/content/taxonomy';

export function PhaseTabs({ value, onChange }: { value?: Phase; onChange: (phase?: Phase) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto" aria-label="Fasefilter">
      <button type="button" onClick={() => onChange(undefined)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${!value ? 'bg-sky-900 text-white' : 'bg-white text-slate-700'}`}>Alle</button>
      {phases.map((phase) => (
        <button key={phase} type="button" onClick={() => onChange(phase)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${value === phase ? 'bg-sky-900 text-white' : 'bg-white text-slate-700'}`}>{phaseLabels[phase]}</button>
      ))}
    </div>
  );
}
