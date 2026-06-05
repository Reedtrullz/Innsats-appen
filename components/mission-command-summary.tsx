import Link from 'next/link';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import type { MissionContext } from '@/lib/mission/schemas';
import { OperationalStatusPills } from './operational-status-pills';

const phaseLongLabels: Record<MissionContext['phase'], string> = {
  for: 'Før innsats',
  under: 'Under innsats',
  etter: 'Etter innsats',
};

function activeChecklistForMission(mission: MissionContext, checklists: OperationalChecklist[]) {
  return checklists.find((checklist) => mission.activeChecklistIds.includes(checklist.slug))
    ?? checklists.find((checklist) => checklist.phase === mission.phase && checklist.scenarios.includes(mission.scenario))
    ?? checklists.find((checklist) => checklist.phase === mission.phase)
    ?? checklists[0];
}

function commandCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function taskCompletionText(mission: MissionContext) {
  const totalTasks = mission.tasks.length;
  const completedTasks = mission.tasks.filter((task) => task.status === 'done').length;
  if (totalTasks === 0) return '0 aktive oppgaver registrert';
  return `${completedTasks}/${totalTasks} oppgaver fullført`;
}

export function MissionCommandHeader({ mission }: { mission: MissionContext }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-900 bg-slate-950 text-white shadow-sm">
      <div className="space-y-3 border-b border-white/10 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-200">Situasjon først</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Oppdrag</h2>
            <p className="mt-1 text-base font-semibold text-slate-100">{mission.title} · {mission.locationText}</p>
          </div>
          <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950">Lokal lagring · Ikke delt</p>
        </div>
        <OperationalStatusPills compact limit={2} className="text-slate-950" />
      </div>
      <dl className="grid grid-cols-1 gap-px bg-white/10 text-sm sm:grid-cols-3">
        <div className="bg-slate-950 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Fase</dt>
          <dd className="mt-1 font-black">{phaseLabels[mission.phase]}</dd>
        </div>
        <div className="bg-slate-950 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Rolle</dt>
          <dd className="mt-1 font-black">{roleLabels[mission.role]}</dd>
        </div>
        <div className="bg-slate-950 px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Scenario</dt>
          <dd className="mt-1 font-black">{scenarioLabels[mission.scenario]}</dd>
        </div>
      </dl>
    </section>
  );
}

export function MissionProgressSummary({ mission, checklists }: { mission: MissionContext; checklists: OperationalChecklist[] }) {
  const activeChecklist = activeChecklistForMission(mission, checklists);
  const activeChecklistCount = activeChecklist ? 1 : 0;
  const checklistItemCount = activeChecklist?.items.length ?? 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Aktiv situasjon</p>
          <h2 className="text-xl font-black text-slate-950">Fremdrift</h2>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-950">{phaseLongLabels[mission.phase]}</span>
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Sjekkliste</dt>
          <dd className="mt-1 font-black text-slate-950">{activeChecklist?.title ?? 'Ingen sjekkliste valgt'}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Aktiv/antall</dt>
          <dd className="mt-1 font-black text-slate-950">{activeChecklistCount}/{checklists.length} sjekklister · {checklistItemCount} punkter</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Oppgaver</dt>
          <dd className="mt-1 font-black text-slate-950">{taskCompletionText(mission)}</dd>
        </div>
      </dl>
    </section>
  );
}


export function MissionCommandSignals({ mission, mapSummary }: { mission: MissionContext; mapSummary: { markerCount: number; drawingCount: number } }) {
  const criticalCount = (mission.fieldLogEntries ?? []).filter((entry) => entry.criticalObservation || entry.mustBeForwarded).length;
  const markerText = commandCountLabel(mapSummary.markerCount, 'markør', 'markører');
  const drawingText = commandCountLabel(mapSummary.drawingCount, 'sektor', 'sektorer/tegninger');

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-label="Oppdragssignaler">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">Oppdragssignaler</p>
      <ul className="mt-2 space-y-2 text-sm font-bold text-slate-800">
        <li>{criticalCount} kritisk logg / videresending registrert lokalt</li>
        <li>{markerText} og {drawingText} på aktivt oppdrag</li>
      </ul>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Foreslå statusoppdatering manuelt. Ingenting sendes eller godkjennes automatisk.</p>
    </section>
  );
}

export function MissionExportShortcuts() {
  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Eksportsnarveier">
      <Link className="rounded-2xl bg-white p-4 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200" href="#5-punktsordre">
        5-punktsordre
      </Link>
      <Link className="rounded-2xl bg-white p-4 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200" href="#sambandsplan">
        Sambandsplan
      </Link>
    </section>
  );
}
