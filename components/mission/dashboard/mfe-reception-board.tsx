'use client';

import {
  addMfeReceptionResourceRequest,
  buildMfeReceptionBoard,
  ensureMfeReceptionBoardTasks,
  setMfeReceptionStepStatus,
  shouldShowMfeReceptionBoard,
  type MfeReceptionStepId,
} from '@/lib/mission/mfe-reception-board';
import type { MissionContext, MissionTaskStatus } from '@/lib/mission/schemas';
import type { MissionUpdate } from './dashboard-types';

const statusLabels: Record<MissionTaskStatus, string> = {
  'not-started': 'Ikke startet',
  'in-progress': 'Pågår',
  done: 'Ferdig',
  blocked: 'Blokkert',
  'needs-assistance': 'Trenger assistanse',
};

export function MfeReceptionBoard({
  mission,
  onMissionChange,
}: {
  mission: MissionContext;
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
}) {
  if (!shouldShowMfeReceptionBoard(mission)) return null;

  const board = buildMfeReceptionBoard(mission);

  function updateBoard(update: (current: MissionContext) => MissionContext) {
    void onMissionChange(mission.id, update);
  }

  function seedBoard() {
    updateBoard((current) => ensureMfeReceptionBoardTasks(current));
  }

  function setStepStatus(stepId: MfeReceptionStepId, status: MissionTaskStatus) {
    updateBoard((current) => setMfeReceptionStepStatus(current, stepId, status));
  }

  function addResourceNeed(stepId: MfeReceptionStepId) {
    updateBoard((current) => addMfeReceptionResourceRequest(current, stepId));
  }

  return (
    <section id="ressursmottak" aria-label="MFE mottaksboard" className="scroll-mt-28 space-y-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Ressursmottak / MFE</p>
          <h3 className="text-xl font-black">MFE mottaksboard</h3>
          <p className="mt-1 text-sm font-semibold">
            Lokal oppfølging av mottak, oppgave, drift og demobilisering. Dette er ikke offisiell anmodning, utkalling eller rapportering.
          </p>
        </div>
        <button type="button" onClick={seedBoard} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">
          Legg inn MFE mottakssteg
        </button>
      </div>

      <ul className="space-y-1 text-sm font-semibold">
        {board.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}
      </ul>

      <div className="grid gap-3 lg:grid-cols-2">
        {board.steps.map((step) => (
          <article key={step.id} className="space-y-3 rounded-2xl border border-sky-200 bg-white p-3 text-slate-900">
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
                onClick={() => setStepStatus(step.id, 'in-progress')}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-950"
              >
                Marker {step.title} pågår
              </button>
              <button
                type="button"
                onClick={() => setStepStatus(step.id, 'done')}
                className="min-h-11 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-sm font-black text-emerald-950"
              >
                Marker {step.title} ferdig
              </button>
              <button
                type="button"
                onClick={() => setStepStatus(step.id, 'needs-assistance')}
                className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-3 text-sm font-black text-amber-950"
              >
                Marker {step.title} trenger assistanse
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <p className="font-black text-slate-950">{step.resourceLabel}</p>
              <p>{step.hasResourceRequest ? 'Lokalt ressursbehov er registrert.' : 'Ingen lokalt ressursbehov registrert for dette steget.'}</p>
              <button
                type="button"
                onClick={() => addResourceNeed(step.id)}
                className="mt-2 min-h-11 rounded-xl bg-slate-950 px-3 text-sm font-black text-white"
              >
                Registrer ressursbehov for {step.title}
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
