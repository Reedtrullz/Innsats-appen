import type { Scenario } from '@/lib/content/taxonomy';
import { scenarioLabels, scenarios } from '@/lib/content/taxonomy';

export function ScenarioFilter({ value, onChange }: { value?: Scenario; onChange: (scenario?: Scenario) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto" aria-label="Scenariofilter">
      <button type="button" onClick={() => onChange(undefined)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${!value ? 'bg-emerald-900 text-white' : 'bg-white text-slate-700'}`}>Alle scenario</button>
      {scenarios.map((scenario) => (
        <button key={scenario} type="button" onClick={() => onChange(scenario)} className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${value === scenario ? 'bg-emerald-900 text-white' : 'bg-white text-slate-700'}`}>{scenarioLabels[scenario]}</button>
      ))}
    </div>
  );
}
