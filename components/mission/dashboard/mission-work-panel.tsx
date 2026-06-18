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
import { MfeReceptionBoard } from './mfe-reception-board';
import { PanelHeading } from './panel-heading';
import { TransportLogisticsBoard } from './transport-logistics-board';

export function MissionWorkPanel({
  mission,
  checklist,
  checklists,
  checklistRuns,
  staleSignals,
  scopedMapState,
  orderSuggestions,
  sourceTitleById,
  onMissionChange,
  onChecklistRunSaved,
}: {
  mission: MissionContext;
  checklist?: OperationalChecklist;
  checklists: OperationalChecklist[];
  checklistRuns: Awaited<ReturnType<typeof listChecklistRuns>>;
  staleSignals: MissionContext['externalSignals'];
  scopedMapState: MissionMapState;
  orderSuggestions: string[];
  sourceTitleById?: Record<string, string>;
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
  onChecklistRunSaved: () => void;
}) {
  const secondaryChecklists = checklists
    .filter((candidate) => {
      if (candidate.slug === checklist?.slug) return false;
      const selectedForMission = mission.activeChecklistIds.includes(candidate.slug);
      const exactScenarioForPhase = candidate.phase === mission.phase && candidate.scenarios.includes(mission.scenario);
      const genericForPhase = candidate.phase === mission.phase && candidate.scenarios.includes('generelt');
      return selectedForMission || exactScenarioForPhase || genericForPhase;
    })
    .sort((a, b) => {
      const activeDelta = Number(mission.activeChecklistIds.includes(b.slug)) - Number(mission.activeChecklistIds.includes(a.slug));
      if (activeDelta !== 0) return activeDelta;
      const scenarioDelta = Number(b.scenarios.includes(mission.scenario)) - Number(a.scenarios.includes(mission.scenario));
      if (scenarioDelta !== 0) return scenarioDelta;
      return a.title.localeCompare(b.title, 'nb');
    })
    .slice(0, 4);

  return (
    <section id="mission-work-panel" role="tabpanel" aria-labelledby="mission-work-tab" className="space-y-4">
      <PanelHeading eyebrow="Arbeid" title="Sjekkliste, logg og kart" id="mission-work-heading" />
      <MissionQuickActionsGrid phase={mission.phase} />
      {checklist ? <div id="sjekkliste" className="scroll-mt-28"><ChecklistRunner checklist={checklist} missionId={mission.id} sourceTitleById={sourceTitleById} onRunSaved={onChecklistRunSaved} /></div> : (
        <p id="sjekkliste" className="scroll-mt-28 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">Ingen scenariospesifikk sjekkliste for dette oppdraget ennå. Bruk søk og tiltakskort, eller velg et scenario med egen sjekkliste.</p>
      )}
      {secondaryChecklists.length > 0 ? (
        <details id="relevante-kontroller" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">
            Relevante kontroller
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{secondaryChecklists.length} kontroller</span>
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              Supplerende sjekklister for samme fase/scenario. De lagres lokalt per oppdrag og erstatter ikke gjeldende ordre.
            </p>
            {secondaryChecklists.map((secondaryChecklist) => (
              <details key={secondaryChecklist.slug} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <summary className="min-h-11 cursor-pointer list-none text-sm font-black text-slate-950">
                  {secondaryChecklist.title}
                </summary>
                <div className="mt-3">
                  <ChecklistRunner checklist={secondaryChecklist} missionId={mission.id} sourceTitleById={sourceTitleById} onRunSaved={onChecklistRunSaved} />
                </div>
              </details>
            ))}
          </div>
        </details>
      ) : null}
      <TransportLogisticsBoard mission={mission} onMissionChange={onMissionChange} />
      <MfeReceptionBoard mission={mission} onMissionChange={onMissionChange} />
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
