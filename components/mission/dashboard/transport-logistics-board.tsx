'use client';

import {
  addTransportLogisticsResourceRequest,
  buildTransportLogisticsBoard,
  ensureTransportLogisticsBoardTasks,
  setTransportLogisticsStepStatus,
  shouldShowTransportLogisticsBoard,
  type TransportLogisticsStepId,
} from '@/lib/mission/transport-logistics-board';
import type { MissionContext, MissionTaskStatus } from '@/lib/mission/schemas';
import type { MissionUpdate } from './dashboard-types';

const statusLabels: Record<MissionTaskStatus, string> = {
  'not-started': 'Ikke startet',
  'in-progress': 'Pågår',
  done: 'Ferdig',
  blocked: 'Blokkert',
  'needs-assistance': 'Trenger assistanse',
};

export function TransportLogisticsBoard({
  mission,
  onMissionChange,
}: {
  mission: MissionContext;
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
}) {
  if (!shouldShowTransportLogisticsBoard(mission)) return null;

  const board = buildTransportLogisticsBoard(mission);

  function updateBoard(update: (current: MissionContext) => MissionContext) {
    void onMissionChange(mission.id, update);
  }

  function seedBoard() {
    updateBoard((current) => ensureTransportLogisticsBoardTasks(current));
  }

  function setStepStatus(stepId: TransportLogisticsStepId, status: MissionTaskStatus) {
    updateBoard((current) => setTransportLogisticsStepStatus(current, stepId, status));
  }

  function addResourceNeed(stepId: TransportLogisticsStepId) {
    updateBoard((current) => addTransportLogisticsResourceRequest(current, stepId));
  }

  return (
    <section id="transportlogistikk" aria-label="Transportlogistikk board" className="scroll-mt-28 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">ATV / båt / kjøretøy</p>
          <h3 className="text-xl font-black">Transportlogistikk board</h3>
          <p className="mt-1 text-sm font-semibold">
            Lokal planlegging av oppdrag, førerkompetanse, framkommelighet, drift og retur. Dette er ikke offisiell ordre, utkalling eller rapportering.
          </p>
        </div>
        <button type="button" onClick={seedBoard} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">
          Legg inn transportsteg
        </button>
      </div>

      <ul className="space-y-1 text-sm font-semibold">
        {board.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}
      </ul>

      <div className="grid gap-3 lg:grid-cols-2">
        {board.steps.map((step) => (
          <article key={step.id} className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-3 text-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="font-black">{step.title}</h4>
                <p className="mt-1 text-sm font-semibold text-slate-700">{step.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{statusLabels[step.status]}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-label={`Marker ${step.title} pågår`}
                onClick={() => setStepStatus(step.id, 'in-progress')}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-950"
              >
                Pågår
              </button>
              <button
                type="button"
                aria-label={`Marker ${step.title} ferdig`}
                onClick={() => setStepStatus(step.id, 'done')}
                className="min-h-11 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-sm font-black text-emerald-950"
              >
                Ferdig
              </button>
              <button
                type="button"
                aria-label={`Marker ${step.title} trenger assistanse`}
                onClick={() => setStepStatus(step.id, 'needs-assistance')}
                className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-3 text-sm font-black text-amber-950"
              >
                Trenger assistanse
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <p className="font-black text-slate-950">{step.resourceLabel}</p>
              <p>{step.hasResourceRequest ? 'Lokalt ressursbehov er registrert.' : 'Ingen lokalt ressursbehov registrert for dette steget.'}</p>
              <button
                type="button"
                aria-label={`Registrer ressursbehov for ${step.title}`}
                onClick={() => addResourceNeed(step.id)}
                className="mt-2 min-h-11 rounded-xl bg-slate-950 px-3 text-sm font-black text-white"
              >
                Ressursbehov
              </button>
            </div>
          </article>
        ))}
      </div>

      <p className="rounded-xl bg-white p-3 text-sm font-black text-slate-800">
        Fremdrift: {board.summary.startedSteps}/{board.summary.totalSteps} startet · {board.summary.completedSteps} ferdig · {board.summary.resourceRequestCount} lokale ressursbehov.
      </p>
    </section>
  );
}
