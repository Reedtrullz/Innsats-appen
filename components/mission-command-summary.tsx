import Link from 'next/link';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import type { ChecklistRun, MissionContext } from '@/lib/mission/schemas';
import { OperationalStatusPills } from './operational-status-pills';
import { OperationalIcon } from './ui/operational-icons';
import { ProgressSummary, QuickActionButton, SectionCard } from './ui/operational-primitives';

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

export type MissionMapCommandSummary = { markerCount: number; drawingCount: number };

export function MissionCommandHeader({ mission }: { mission: MissionContext }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-sky-950 bg-[#082F49] text-white shadow-sm">
      <div className="space-y-3 border-b border-white/10 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-sky-200">Mission command</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Oppdrag</h2>
            <p className="mt-1 break-words text-base font-semibold text-slate-100">{mission.title} · {mission.locationText}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <p className="inline-flex min-h-8 items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950">
              <OperationalIcon name="shield" className="mr-1.5 h-4 w-4" />
              Lokal lagring · Ikke delt
            </p>
            <Link href="/oppdrag/ny" className="inline-flex min-h-8 items-center rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white ring-1 ring-white/20">Nytt oppdrag</Link>
          </div>
        </div>
        <OperationalStatusPills compact limit={2} className="text-slate-950" />
      </div>
      <dl className="grid grid-cols-3 gap-px bg-white/10 text-sm">
        <div className="min-w-0 bg-[#082F49] px-3 py-2 sm:px-4 sm:py-3">
          <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">Fase</dt>
          <dd className="mt-1 truncate font-black">{phaseLabels[mission.phase]}</dd>
        </div>
        <div className="min-w-0 bg-[#082F49] px-3 py-2 sm:px-4 sm:py-3">
          <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">Rolle</dt>
          <dd className="mt-1 truncate font-black">{roleLabels[mission.role]}</dd>
        </div>
        <div className="min-w-0 bg-[#082F49] px-3 py-2 sm:px-4 sm:py-3">
          <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">Scenario</dt>
          <dd className="mt-1 truncate font-black">{scenarioLabels[mission.scenario]}</dd>
        </div>
      </dl>
    </section>
  );
}

function checklistProgress(activeChecklist: OperationalChecklist | undefined, checklistRuns: ChecklistRun[]) {
  if (!activeChecklist || activeChecklist.items.length === 0) {
    return { checkedCount: 0, itemCount: activeChecklist?.items.length ?? 0, percent: 0 };
  }
  const run = checklistRuns.find((item) => item.templateSlug === activeChecklist.slug);
  const checkedIds = new Set(run?.checkedItemIds ?? []);
  const checkedCount = activeChecklist.items.filter((item) => checkedIds.has(item.id)).length;
  return {
    checkedCount,
    itemCount: activeChecklist.items.length,
    percent: Math.round((checkedCount / activeChecklist.items.length) * 100),
  };
}

export function MissionProgressSummary({ mission, checklists, checklistRuns = [], mapSummary = { markerCount: 0, drawingCount: 0 } }: { mission: MissionContext; checklists: OperationalChecklist[]; checklistRuns?: ChecklistRun[]; mapSummary?: MissionMapCommandSummary }) {
  const activeChecklist = activeChecklistForMission(mission, checklists);
  const activeChecklistCount = activeChecklist ? 1 : 0;
  const checklistItemCount = activeChecklist?.items.length ?? 0;
  const activeChecklistProgress = checklistProgress(activeChecklist, checklistRuns);
  const totalTasks = mission.tasks.length;
  const completedTasks = mission.tasks.filter((task) => task.status === 'done').length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const criticalCount = (mission.fieldLogEntries ?? []).filter((entry) => entry.criticalObservation || entry.mustBeForwarded).length;
  const mapCount = mapSummary.markerCount + mapSummary.drawingCount;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Aktiv situasjon</p>
          <h2 className="text-xl font-black text-slate-950">Fremdrift</h2>
        </div>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-950">{phaseLongLabels[mission.phase]}</span>
      </div>
      <div className="mt-3">
        <ProgressSummary items={[
          { label: 'Sjekkliste', value: activeChecklist?.title ?? 'Ingen valgt', detail: `${activeChecklistProgress.checkedCount}/${activeChecklistProgress.itemCount || checklistItemCount} punkter fullført · ${activeChecklistCount}/${checklists.length} aktiv`, progress: activeChecklistProgress.percent, tone: activeChecklistProgress.percent === 100 ? 'success' : 'warning' },
          { label: 'Oppgaver', value: taskCompletionText(mission), detail: totalTasks === 0 ? 'Ingen aktive oppgaver ennå' : `${completedTasks}/${totalTasks} ferdig`, progress: taskProgress, tone: totalTasks > 0 && completedTasks < totalTasks ? 'warning' : 'success' },
          { label: 'Kritisk logg', value: `${criticalCount}`, detail: criticalCount === 1 ? 'kritisk/videresendes' : 'kritiske/videresendes', progress: criticalCount > 0 ? 100 : 0, tone: criticalCount > 0 ? 'critical' : 'success' },
          { label: 'Kart', value: `${mapCount}`, detail: `${commandCountLabel(mapSummary.markerCount, 'markør', 'markører')} · ${commandCountLabel(mapSummary.drawingCount, 'tegning/sektor', 'tegninger/sektorer')}`, progress: mapCount > 0 ? 100 : 0, tone: mapCount > 0 ? 'sky' : 'success' },
        ]} />
      </div>
    </section>
  );
}


export function MissionCommandSignals({ mission, mapSummary }: { mission: MissionContext; mapSummary: MissionMapCommandSummary }) {
  const criticalCount = (mission.fieldLogEntries ?? []).filter((entry) => entry.criticalObservation || entry.mustBeForwarded).length;
  const criticalText = commandCountLabel(criticalCount, 'kritisk logg / videresending', 'kritiske logger / videresendinger');
  const markerText = commandCountLabel(mapSummary.markerCount, 'markør', 'markører');
  const drawingText = commandCountLabel(mapSummary.drawingCount, 'sektor/tegning', 'sektorer/tegninger');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Oppdragssignaler">
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">Oppdragssignaler</p>
      <h2 className="text-xl font-black text-slate-950">Kart og kritisk status</h2>
      <ul className="mt-2 space-y-2 text-sm font-bold text-slate-800">
        <li>{criticalText} registrert lokalt</li>
        <li>{markerText} og {drawingText} på aktivt oppdrag</li>
      </ul>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Foreslå statusoppdatering manuelt. Ingenting sendes eller godkjennes automatisk.</p>
    </section>
  );
}

export function MissionQuickActionsGrid() {
  return (
    <SectionCard labelledBy="mission-quick-actions-heading" className="bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Én trykkflate</p>
          <h3 id="mission-quick-actions-heading" className="text-xl font-black text-slate-950">Hurtighandlinger</h3>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <QuickActionButton href="#hurtiglogg" label="Hurtiglogg" description="Logg kritisk observasjon" icon="clipboard" tone="sky" />
        <QuickActionButton href="#sjekkliste" label="Sjekkliste" description="Fortsett aktiv sjekkliste" icon="checklist" tone="success" />
        <QuickActionButton href="#5-punktsordre" label="5-punktsordre" description="Strukturer ordre lokalt" icon="document" tone="slate" />
        <QuickActionButton href="#sambandsplan" label="Sambandsplan" description="Kanaler og roller" icon="radio" tone="warning" />
        <QuickActionButton href="#kart" label="Kart" description="Lokale markører" icon="map" tone="sky" />
        <QuickActionButton href="#ruh-velferd" label="RUH/velferd" description="Lokal oppfølging" icon="shield" tone="warning" />
        <QuickActionButton href="#etterrapport" label="Etterrapport" description="Bygg rapport" icon="archive" tone="slate" />
        <QuickActionButton href="#oppdragsmappe" label="Oppdragsmappe" description="Samlet eksport" icon="download" tone="success" />
      </div>
    </SectionCard>
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
