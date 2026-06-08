'use client';

import type { MissionContext } from '@/lib/mission/schemas';
import { ContextSignalPanel } from '../../context-signal-panel';
import type { MissionUpdate } from './dashboard-types';
import { StructuredLessonsFeedbackControls } from './structured-lessons-feedback-controls';

export function MissionAdvancedPanel({ mission, staleSignals, disabledSources, onMissionChange, onArchive }: { mission: MissionContext; staleSignals: MissionContext['externalSignals']; disabledSources: string[]; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="min-h-11 cursor-pointer list-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]">
        <span className="block text-xs font-black uppercase tracking-wide text-slate-500">Sekundært</span>
        <span className="block text-lg font-black text-slate-950">Avansert / dokumentasjon</span>
      </summary>
      <div className="mt-4 space-y-3">
        <StructuredLessonsFeedbackControls key={mission.id} mission={mission} onMissionChange={onMissionChange} onArchive={onArchive} />
        {staleSignals.length > 0 || disabledSources.length > 0 ? <ContextSignalPanel signals={staleSignals} unavailableSources={disabledSources} /> : null}
      </div>
    </details>
  );
}
