'use client';

import type { OperationalChecklist } from '@/lib/content/schemas';
import type { listChecklistRuns } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';
import type { MissionMapState } from '@/lib/maps/operations-map';
import { ChecklistRunner } from '../../checklist-runner';
import { MissionQuickActionsGrid } from '../../mission-command-summary';
import { MissionMapSummary } from '../../mission-map-summary';
import { FieldLogControls } from '../field-log-controls';
import { LocalMissionControls } from '../local-mission-controls';
import { MissionLogOverview } from '../mission-log-overview';
import type { MissionUpdate } from './dashboard-types';
import { PanelHeading } from './panel-heading';

export function MissionWorkPanel({
  mission,
  checklist,
  checklistRuns,
  staleSignals,
  scopedMapState,
  orderSuggestions,
  onMissionChange,
  onChecklistRunSaved,
}: {
  mission: MissionContext;
  checklist?: OperationalChecklist;
  checklistRuns: Awaited<ReturnType<typeof listChecklistRuns>>;
  staleSignals: MissionContext['externalSignals'];
  scopedMapState: MissionMapState;
  orderSuggestions: string[];
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
  onChecklistRunSaved: () => void;
}) {
  return (
    <section id="mission-work-panel" role="tabpanel" aria-labelledby="mission-work-tab" className="space-y-4">
      <PanelHeading eyebrow="Arbeid" title="Sjekkliste, logg og kart" id="mission-work-heading" />
      <MissionQuickActionsGrid phase={mission.phase} />
      {checklist ? <div id="sjekkliste" className="scroll-mt-28"><ChecklistRunner checklist={checklist} missionId={mission.id} onRunSaved={onChecklistRunSaved} /></div> : (
        <p id="sjekkliste" className="scroll-mt-28 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">Ingen scenariospesifikk sjekkliste for dette oppdraget ennå. Bruk søk og tiltakskort, eller velg et scenario med egen sjekkliste.</p>
      )}
      <details id="loggoversikt" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">
          <span id="mission-local-work-heading">Loggoversikt og lokale oppgaver</span>
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{mission.tasks.length} oppgaver · {(mission.fieldLogEntries ?? []).length} logger</span>
        </summary>
        <div className="mt-3 space-y-3">
          <MissionLogOverview mission={mission} />
          <LocalMissionControls mission={mission} displaySignals={staleSignals} onMissionChange={onMissionChange} variant="work" />
        </div>
      </details>
      <MissionMapSummary mission={mission} mapState={scopedMapState} />
      <details id="feltlogg" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">Feltlogg</summary>
        <div className="mt-3">
          <FieldLogControls mission={mission} onMissionChange={onMissionChange} />
        </div>
      </details>
      {orderSuggestions.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-label="Forslag til manuell ordreoppdatering">
          <h3 className="text-lg font-black">Forslag til manuell ordreoppdatering</h3>
          <p className="mt-1 text-sm font-semibold">Automatisk forslag fra kritiske lokale logginnslag. Dette endrer ikke ordre og er ikke offisiell ordre.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
            {orderSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </section>
      ) : null}
      <p className="sr-only">Sjekklister lastet: {checklistRuns.length}</p>
    </section>
  );
}
