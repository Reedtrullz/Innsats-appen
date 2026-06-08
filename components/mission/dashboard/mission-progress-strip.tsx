'use client';

import type { OperationalChecklist } from '@/lib/content/schemas';
import type { listChecklistRuns } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';

function activeChecklistForDashboard(mission: MissionContext, checklists: OperationalChecklist[]) {
  return checklists.find((item) => mission.activeChecklistIds.includes(item.slug))
    ?? checklists.find((item) => item.phase === mission.phase && item.scenarios.includes(mission.scenario))
    ?? checklists.find((item) => item.phase === mission.phase)
    ?? checklists[0];
}

export function MissionProgressStrip({ mission, checklists, checklistRuns, mapSummary }: { mission: MissionContext; checklists: OperationalChecklist[]; checklistRuns: Awaited<ReturnType<typeof listChecklistRuns>>; mapSummary: { markerCount: number; drawingCount: number } }) {
  const activeChecklist = activeChecklistForDashboard(mission, checklists);
  const run = activeChecklist ? checklistRuns.find((item) => item.templateSlug === activeChecklist.slug) : undefined;
  const checkedIds = new Set(run?.checkedItemIds ?? []);
  const checkedCount = activeChecklist ? activeChecklist.items.filter((item) => checkedIds.has(item.id)).length : 0;
  const totalChecklistItems = activeChecklist?.items.length ?? 0;
  const doneTasks = mission.tasks.filter((task) => task.status === 'done').length;
  const criticalLogCount = (mission.fieldLogEntries ?? []).filter((entry) => entry.criticalObservation || entry.mustBeForwarded).length;
  const mapCount = mapSummary.markerCount + mapSummary.drawingCount;

  return (
    <section aria-label="Kompakt fremdrift" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="sr-only">Fremdrift</h2>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Sjekkliste</p>
          <p className="mt-1 font-black text-slate-950">{checkedCount}/{totalChecklistItems}</p>
          <p className="sr-only">{checkedCount}/{totalChecklistItems} punkter fullført</p>
          <p className="truncate text-xs font-semibold text-slate-600">{activeChecklist?.title ?? 'Ingen valgt'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Oppgaver</p>
          <p className="mt-1 font-black text-slate-950">{doneTasks}/{mission.tasks.length}</p>
          <p className="text-xs font-semibold text-slate-600">fullført</p>
        </div>
        <div className={`rounded-xl p-2 ${criticalLogCount > 0 ? 'bg-red-50 text-red-950' : 'bg-slate-50 text-slate-950'}`}>
          <p className="text-[0.65rem] font-black uppercase tracking-wide opacity-70">Kritisk logg</p>
          <p className="mt-1 font-black">{criticalLogCount}</p>
          <p className="text-xs font-semibold">kritisk/videresend</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Kart</p>
          <p className="mt-1 font-black text-slate-950">{mapCount}</p>
          <p className="text-xs font-semibold text-slate-600">{mapSummary.markerCount} markører · {mapSummary.drawingCount} tegninger</p>
        </div>
      </div>
    </section>
  );
}
