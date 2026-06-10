'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { ChecklistRun, MissionContext } from '@/lib/mission/schemas';
import { phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { listChecklistRuns, listMissions, saveChecklistRun } from '@/lib/mission/local-store';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { buildMissionRunbook, type RunbookStep } from '@/lib/mission/runbook';

const stepDotClass: Record<RunbookStep['status'], string> = {
  done: 'bg-emerald-500',
  now: 'bg-sky-500',
  upcoming: 'bg-slate-300',
  skipped: 'bg-amber-400',
};

export function RunbookView({ checklists }: { checklists: OperationalChecklist[] }) {
  const [mission, setMission] = useState<MissionContext | null>(null);
  const [run, setRun] = useState<ChecklistRun | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const missions = await listMissions();
      const active = selectActiveMission(missions, readSelectedActiveMissionId());
      if (!alive) return;
      setMission(active ?? null);
      if (active) {
        const slug = buildMissionRunbook(checklists, active).checklistSlug;
        const runs = await listChecklistRuns(active.id);
        if (!alive) return;
        setRun(runs.find((item) => item.templateSlug === slug) ?? null);
      } else {
        setRun(null);
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [checklists, refreshKey]);

  const runbook = mission
    ? buildMissionRunbook(checklists, mission, { checkedItemIds: run?.checkedItemIds, skippedItemIds: run?.skippedItemIds })
    : null;
  const openStep = runbook?.steps.find((step) => step.id === openStepId) ?? runbook?.steps.find((step) => step.status === 'now') ?? null;
  const checklistSlug = runbook?.checklistSlug ?? null;
  const missionId = mission?.id ?? null;
  const activeChecklist = checklistSlug ? checklists.find((item) => item.slug === checklistSlug) : undefined;

  async function writeProgress(itemId: string, mark: 'done' | 'skip') {
    if (!missionId || !checklistSlug) return;
    const runs = await listChecklistRuns(missionId);
    const existing = runs.find((item) => item.templateSlug === checklistSlug);
    const checked = new Set(existing?.checkedItemIds ?? []);
    const skipped = new Set(existing?.skippedItemIds ?? []);
    if (mark === 'done') {
      checked.add(itemId);
      skipped.delete(itemId);
    } else {
      skipped.add(itemId);
      checked.delete(itemId);
    }
    await saveChecklistRun({
      id: existing?.id ?? crypto.randomUUID(),
      missionId,
      templateSlug: checklistSlug,
      checkedItemIds: [...checked],
      skippedItemIds: [...skipped],
      notesByItemId: existing?.notesByItemId ?? {},
      equipmentStatusByItemId: existing?.equipmentStatusByItemId ?? {},
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    });
    setOpenStepId(null);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-black">Beta</span>
        Veiledet runbook — anbefalt rekkefølge, ikke en kommando. Hopp over eller bruk søk fritt.
      </div>

      {!loaded ? (
        <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-600 shadow-sm">Laster lokal runbook …</p>
      ) : !mission || !runbook ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-5">
          <h1 className="text-2xl font-black">Ingen aktivt oppdrag</h1>
          <p className="mt-2 text-sm font-semibold text-slate-700">Start eller velg et lokalt oppdrag for å få en anbefalt rekkefølge av steg.</p>
          <Link href="/oppdrag/ny" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-slate-950 px-5 font-bold text-white">Start oppdrag</Link>
        </section>
      ) : (
        <>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Nå</p>
            <h1 className="text-2xl font-black">{mission.title}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">{phaseLabels[mission.phase]} · {roleLabels[mission.role]} · {scenarioLabels[mission.scenario]}</p>
            {runbook.total > 0 ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600"><span>{runbook.title}</span><span>{runbook.doneCount}/{runbook.total}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-emerald-500" style={{ width: `${Math.round((runbook.doneCount / runbook.total) * 100)}%` }} /></div>
              </div>
            ) : null}
          </section>

          {runbook.isEmpty || runbook.total === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">Ingen scenariospesifikk runbook for dette oppdraget ennå. Bruk søk og tiltakskort.</p>
          ) : runbook.allRequiredComplete && !runbook.currentStepId ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-lg font-black text-emerald-950">Alle anbefalte steg er gjort</h2>
              <p className="mt-1 text-sm font-semibold text-emerald-900">Gå videre til neste fase eller åpne etterrapport fra oppdraget.</p>
              <Link href="/oppdrag" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 font-bold text-white">Åpne oppdrag</Link>
            </section>
          ) : (
            <section aria-label="Neste steg" className="space-y-2">
              {runbook.steps.map((step) => {
                const isOpen = openStep?.id === step.id;
                const done = step.status === 'done';
                return (
                  <div key={step.id} className={`rounded-2xl border bg-white shadow-sm ${step.status === 'now' ? 'border-2 border-sky-400' : 'border-slate-200'}`}>
                    <button type="button" onClick={() => setOpenStepId(isOpen ? null : step.id)} className="flex w-full min-h-12 items-center gap-3 p-3 text-left" aria-expanded={isOpen}>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stepDotClass[step.status]}`} aria-hidden="true" />
                      <span className={`flex-1 text-sm font-bold ${done || step.status === 'skipped' ? 'text-slate-500 line-through' : 'text-slate-950'}`}>{step.title}</span>
                      {step.required ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.66rem] font-bold text-slate-600">Påkrevd</span> : null}
                    </button>
                    {isOpen && !done && step.status !== 'skipped' ? (
                      <div className="border-t border-slate-100 p-3">
                        {step.sourceIds.length > 0 ? (
                          <p className="text-xs font-semibold text-slate-500">Kilder: {step.sourceIds.map((id) => id.replace(/^src-/, '')).join(', ')}</p>
                        ) : null}
                        {activeChecklist?.warning ? <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900">{activeChecklist.warning}</p> : null}
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => void writeProgress(step.itemId, 'done')} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">Gjort · neste</button>
                          <button type="button" onClick={() => void writeProgress(step.itemId, 'skip')} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700">Hopp over</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Link href="/sok" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800">Søk i tiltak</Link>
            <Link href="/oppdrag" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800">Åpne oppdrag</Link>
          </div>
        </>
      )}
    </div>
  );
}
