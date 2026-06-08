'use client';

import type { MissionContext } from '@/lib/mission/schemas';
import { QuickFieldLogComposer } from '../quick-field-log-composer';
import type { MissionUpdate } from './dashboard-types';

export function CompactQuickLog({ mission, onMissionChange }: { mission: MissionContext; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
  return (
    <details id="hurtiglogg" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="min-h-11 cursor-pointer list-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]">
        <span className="block text-xs font-black uppercase tracking-wide text-sky-700">Hurtiglogg</span>
        <span className="block text-lg font-black text-slate-950">Logg observasjon</span>
        <span className="block text-sm font-semibold text-slate-600">Åpne bare når du skal skrive. Full loggflate ligger i Arbeid.</span>
      </summary>
      <div className="mt-3">
        <QuickFieldLogComposer mission={mission} onMissionChange={onMissionChange} sourceLabel="Oppdragstavle" criticalObservationAriaLabel="Hurtiglogg kritisk flagg" mustBeForwardedAriaLabel="Hurtiglogg videresending flagg" />
      </div>
    </details>
  );
}
