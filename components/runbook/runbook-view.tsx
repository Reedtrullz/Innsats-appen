'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { ChecklistRun, MissionContext } from '@/lib/mission/schemas';
import { scenarioLabels } from '@/lib/content/taxonomy';
import { listChecklistRuns, listMissions, saveChecklistRun } from '@/lib/mission/local-store';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { buildMissionRunbook, type RunbookStep } from '@/lib/mission/runbook';

const stepDotClass: Record<RunbookStep['status'], string> = {
  done: 'bg-emerald-500',
  now: 'bg-sky-500',
  upcoming: 'bg-slate-300',
  skipped: 'bg-amber-400',
};

const statusLabel: Record<RunbookStep['status'], string> = {
  done: 'Gjort',
  now: 'Nå',
  upcoming: '',
  skipped: 'Hoppet over',
};

const statusBadgeClass: Record<RunbookStep['status'], string> = {
  done: 'bg-emerald-100 text-emerald-900',
  now: 'bg-sky-100 text-sky-900',
  upcoming: 'bg-slate-100 text-slate-600',
  skipped: 'bg-amber-100 text-amber-900',
};

/**
 * The guided step-for-step view for the active mission. Embedded as the
 * default "Nå" experience in the mission dashboard: steps lead, mission
 * context lives in the surrounding dashboard chrome.
 */
export function RunbookView({
  checklists,
  sourceTitleById = {},
  sourceRiskById = {},
  onRunSaved,
}: {
  checklists: OperationalChecklist[];
  sourceTitleById?: Record<string, string>;
  sourceRiskById?: Record<string, 'caution' | 'ok'>;
  onRunSaved?: () => void;
}) {
  const [mission, setMission] = useState<MissionContext | null>(null);
  const [run, setRun] = useState<ChecklistRun | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);

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
  const resolved = runbook ? runbook.doneCount + runbook.skippedCount : 0;

  // Serialized via the `saving` guard so rapid taps can't race the read-modify-write
  // and silently drop progress. 'reopen' clears the step back to active.
  async function writeProgress(itemId: string, mark: 'done' | 'skip' | 'reopen') {
    if (!missionId || !checklistSlug || saving) return;
    setSaving(true);
    try {
      const runs = await listChecklistRuns(missionId);
      const existing = runs.find((item) => item.templateSlug === checklistSlug);
      const checked = new Set(existing?.checkedItemIds ?? []);
      const skipped = new Set(existing?.skippedItemIds ?? []);
      checked.delete(itemId);
      skipped.delete(itemId);
      if (mark === 'done') checked.add(itemId);
      else if (mark === 'skip') skipped.add(itemId);
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
      onRunSaved?.();
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-600 shadow-sm">Laster lokal runbook …</p>;
  }

  if (!mission || !runbook) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-5">
        <h3 className="text-2xl font-black">Ingen aktivt oppdrag</h3>
        <p className="mt-2 text-sm font-semibold text-slate-700">Start eller velg et lokalt oppdrag for å få en anbefalt rekkefølge av steg.</p>
        <Link href="/oppdrag/ny" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-slate-950 px-5 font-bold text-white">Start oppdrag</Link>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {runbook.total > 0 ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-600">
            <span className="min-w-0 truncate font-black text-slate-900">{runbook.title}</span>
            <span className="shrink-0">{runbook.doneCount} gjort{runbook.skippedCount > 0 ? ` · ${runbook.skippedCount} hoppet over` : ''} av {runbook.total}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-emerald-500" style={{ width: `${Math.round((resolved / runbook.total) * 100)}%` }} /></div>
          <p className="mt-2 text-xs font-semibold text-slate-500">Anbefalt rekkefølge — ikke en kommando. Hopp over eller bruk søk fritt.</p>
          {runbook.isGenericFallback ? <p className="mt-2 rounded-xl bg-slate-100 p-2 text-xs font-semibold text-slate-700">Generell sjekkliste — ingen egen runbook for {scenarioLabels[mission.scenario].toLowerCase()} ennå.</p> : null}
          {activeChecklist?.warning ? <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900">{activeChecklist.warning}</p> : null}
        </section>
      ) : null}

      {runbook.isEmpty || runbook.total === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">Ingen scenariospesifikk runbook for dette oppdraget ennå. Bruk søk og tiltakskort.</p>
      ) : runbook.allRequiredComplete && !runbook.currentStepId ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="text-lg font-black text-emerald-950">Alle anbefalte steg er gjort</h3>
          <p className="mt-1 text-sm font-semibold text-emerald-900">Gå videre til neste fase eller åpne etterrapporten.</p>
          <a href="#etterrapport" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 font-bold text-white">Åpne etterrapport</a>
        </section>
      ) : (
        <section aria-label="Neste steg" className="space-y-2">
          {runbook.steps.map((step) => {
            const isOpen = openStep?.id === step.id;
            const resolvedStep = step.status === 'done' || step.status === 'skipped';
            const badge = statusLabel[step.status] || (step.required ? 'Påkrevd' : '');
            return (
              <div key={step.id} className={`rounded-2xl border bg-white shadow-sm ${step.status === 'now' ? 'border-2 border-sky-400' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setOpenStepId(isOpen ? null : step.id)} className="flex w-full min-h-12 items-center gap-3 p-3 text-left" aria-expanded={isOpen}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stepDotClass[step.status]}`} aria-hidden="true" />
                  <span className={`flex-1 text-sm font-bold ${resolvedStep ? 'text-slate-500 line-through' : 'text-slate-950'}`}>{step.title}</span>
                  {badge ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.66rem] font-bold ${statusBadgeClass[step.status]}`}>{badge}</span> : null}
                </button>
                {isOpen ? (
                  <div className="border-t border-slate-100 p-3">
                    {step.sourceIds.length > 0 ? (() => {
                      const caution = step.sourceIds.some((id) => sourceRiskById[id] === 'caution');
                      return (
                        <p className="flex items-start gap-2 text-xs font-semibold text-slate-500">
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${caution ? 'bg-amber-500' : 'bg-emerald-500'}`} aria-hidden="true" />
                          <span>{caution ? 'Vær varsom' : 'Verifisert'} · Kilder: {step.sourceIds.map((id) => sourceTitleById[id] ?? id.replace(/^src-/, '')).join(', ')}</span>
                        </p>
                      );
                    })() : null}
                    <div className="mt-3 flex gap-2">
                      {resolvedStep ? (
                        <button type="button" onClick={() => void writeProgress(step.itemId, 'reopen')} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800 disabled:opacity-50">Angre · sett aktiv igjen</button>
                      ) : (
                        <>
                          <button type="button" onClick={() => void writeProgress(step.itemId, 'done')} disabled={saving} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50">Gjort · neste</button>
                          <button type="button" onClick={() => void writeProgress(step.itemId, 'skip')} disabled={saving} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Hopp over</button>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
