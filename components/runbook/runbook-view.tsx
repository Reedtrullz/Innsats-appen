'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { ChecklistRun, MissionContext } from '@/lib/mission/schemas';
import { nextPhase, phaseLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { listChecklistRuns, listMissions, saveChecklistRun } from '@/lib/mission/local-store';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { withPhaseChange } from '@/lib/mission/phase-progress';
import { buildMissionRunbook, type RunbookStep } from '@/lib/mission/runbook';
import { useRole } from '@/lib/role/role-context';
import type { MissionUpdate } from '@/components/mission/dashboard/dashboard-types';

const stepDotClass: Record<RunbookStep['status'], string> = {
  done: 'bg-[#34d399]',
  now: 'bg-[#38bdf8] ring-4 ring-[#38bdf8]/20',
  upcoming: 'bg-[var(--border)]',
  skipped: 'bg-[#fbbf24]',
  locked: 'bg-[var(--border)]',
};

// Dot size: active is larger to draw the eye
const stepDotSize: Record<RunbookStep['status'], string> = {
  done: 'h-3 w-3',
  now: 'h-4 w-4',
  upcoming: 'h-2.5 w-2.5',
  skipped: 'h-2.5 w-2.5',
  locked: 'h-2.5 w-2.5',
};

const statusLabel: Record<RunbookStep['status'], string> = {
  done: 'Gjort',
  now: 'Nå',
  upcoming: '',
  skipped: 'Hoppet over',
  locked: '',
};

const statusBadgeClass: Record<RunbookStep['status'], string> = {
  done: 'bg-[#34d399]/15 text-[#34d399] dark:bg-[#34d399]/15 dark:text-[#34d399]',
  now: 'bg-[#38bdf8]/15 text-[var(--accent-fg)] dark:bg-[#38bdf8]/15 dark:text-[var(--accent-fg)]',
  upcoming: 'bg-slate-100 text-slate-600 dark:bg-[var(--surface)] dark:text-[var(--text-muted)]',
  skipped: 'bg-[#fbbf24]/15 text-amber-700 dark:text-[#fcd34d]',
  locked: 'bg-[var(--surface-muted)] text-[var(--text-muted)]',
};

/**
 * The guided step-for-step view for the active mission. Embedded as the
 * default "Nå" experience in the mission dashboard: steps lead, mission
 * context lives in the surrounding dashboard chrome.
 */
export function RunbookView({
  mission: missionProp,
  checklists,
  compact = false,
  sourceTitleById = {},
  sourceRiskById = {},
  onMissionChange,
  onRunSaved,
}: {
  /**
   * Controlled active mission. When supplied (mission dashboard), the runbook
   * re-derives whenever the mission — including its phase — changes, so the
   * "Nå" runbook swaps with the phase. When omitted, the view self-loads the
   * selected active mission (standalone usage / tests).
   */
  mission?: MissionContext;
  checklists: OperationalChecklist[];
  /** "Nå" view: show only the active step + the next couple, not the whole list. */
  compact?: boolean;
  sourceTitleById?: Record<string, string>;
  sourceRiskById?: Record<string, 'caution' | 'ok'>;
  /** Required to offer the one-tap "go to next phase" CTA. */
  onMissionChange?: (missionId: string, update: MissionUpdate) => Promise<void>;
  onRunSaved?: () => void;
}) {
  const { roleGroup, roleGroupLabel } = useRole();
  const lens = { roleGroup };
  const [mission, setMission] = useState<MissionContext | null>(missionProp ?? null);
  const [run, setRun] = useState<ChecklistRun | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const active = missionProp ?? selectActiveMission(await listMissions(), readSelectedActiveMissionId());
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
  }, [checklists, refreshKey, missionProp]);

  const runbook = mission
    ? buildMissionRunbook(checklists, mission, { checkedItemIds: run?.checkedItemIds, skippedItemIds: run?.skippedItemIds }, lens)
    : null;
  const openStep = runbook?.steps.find((step) => step.id === openStepId) ?? runbook?.steps.find((step) => step.status === 'now') ?? null;
  const checklistSlug = runbook?.checklistSlug ?? null;
  const missionId = mission?.id ?? null;
  const activeChecklist = checklistSlug ? checklists.find((item) => item.slug === checklistSlug) : undefined;
  const resolved = runbook ? runbook.doneCount + runbook.skippedCount : 0;

  // One-tap, never automatic: the user confirms the advance. Only offered when the
  // view is controlled (has a mission + onMissionChange); 'etter' is terminal.
  const upcomingPhase = mission ? nextPhase(mission.phase) : null;
  const canAdvancePhase = Boolean(mission && onMissionChange && upcomingPhase);
  function goToPhase(target: NonNullable<typeof upcomingPhase>) {
    if (!mission || !onMissionChange) return;
    void onMissionChange(mission.id, (current) => withPhaseChange(current, target));
  }

  // In "Nå" only the active step and the next couple are shown; the full board
  // lives in "Arbeid". Falls back to the first unresolved steps if none is active.
  const allSteps = runbook?.steps ?? [];
  const nowIndex = allSteps.findIndex((step) => step.status === 'now');
  const compactSteps = nowIndex >= 0
    ? allSteps.slice(nowIndex, nowIndex + 3)
    : allSteps.filter((step) => step.status === 'upcoming').slice(0, 3);
  const visibleSteps = compact ? compactSteps : allSteps;
  const hiddenStepCount = allSteps.length - visibleSteps.length;

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
    return (
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 font-mono text-sm text-[var(--text-muted)]">
        Laster lokal runbook …
      </p>
    );
  }

  if (!mission || !runbook) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="text-xl font-bold text-[var(--text-primary)]">Ingen aktivt oppdrag</h3>
        <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">Start eller velg et lokalt oppdrag for å få en anbefalt rekkefølge av steg.</p>
        <Link href="/oppdrag/ny" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-[#38bdf8] px-5 font-bold text-[#04141f]">Start oppdrag</Link>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {runbook.total > 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-bold text-[var(--text-primary)]">{runbook.title}</span>
            <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">
              {runbook.doneCount} gjort{runbook.skippedCount > 0 ? ` · ${runbook.skippedCount} hoppet over` : ''} av {runbook.total}
            </span>
          </div>
          {roleGroup !== 'ikke-valgt' ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-fg)]" aria-hidden="true" />
              {roleGroupLabel}-linse
            </p>
          ) : null}
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
            <div className="h-full rounded-full bg-[#34d399] transition-all" style={{ width: `${Math.round((resolved / runbook.total) * 100)}%` }} />
          </div>
          <p className="mt-2 font-mono text-[0.68rem] text-[var(--text-muted)]">Anbefalt rekkefølge — ikke en kommando. Hopp over eller bruk søk fritt.</p>
          {runbook.isGenericFallback ? (
            <p className="mt-2 rounded-xl bg-[var(--surface-muted)] p-2 text-xs font-semibold text-[var(--text-secondary)]">
              Generell sjekkliste — ingen egen runbook for {scenarioLabels[mission.scenario].toLowerCase()} ennå.
            </p>
          ) : null}
          {activeChecklist?.warning ? (
            <p className="mt-2 rounded-xl border border-[#fbbf24]/30 bg-[var(--warning-surface)] p-2 text-xs font-bold text-[var(--warning-fg)]">{activeChecklist.warning}</p>
          ) : null}
        </section>
      ) : null}

      {runbook.isEmpty || runbook.total === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            {canAdvancePhase
              ? 'Ingen sjekkliste for denne fasen — gå videre når du er klar.'
              : 'Ingen scenariospesifikk runbook for dette oppdraget ennå. Bruk søk og tiltakskort.'}
          </p>
          {canAdvancePhase && upcomingPhase ? (
            <button type="button" onClick={() => goToPhase(upcomingPhase)} className="mt-3 inline-flex min-h-12 items-center rounded-xl bg-[#38bdf8] px-5 font-bold text-[#04141f]">
              Gå til {phaseLabels[upcomingPhase]} →
            </button>
          ) : null}
        </section>
      ) : runbook.allRequiredComplete && !runbook.currentStepId ? (
        <section className="rounded-2xl border border-[#34d399]/40 bg-[var(--success-surface)] p-5">
          <h3 className="text-base font-bold text-[var(--success-fg)]">Alle anbefalte steg er gjort</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--success-fg)] opacity-80">
            {canAdvancePhase ? 'Bekreft for å gå videre til neste fase, eller åpne etterrapporten.' : 'Gå videre til neste fase eller åpne etterrapporten.'}
          </p>
          {runbook.requiredSkippedCount > 0 ? (
            <p className="mt-2 font-mono text-xs font-bold text-[var(--warning-fg)]">{runbook.requiredSkippedCount} påkrevde hoppet over</p>
          ) : null}
          {canAdvancePhase && upcomingPhase ? (
            <button type="button" onClick={() => goToPhase(upcomingPhase)} className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-[#38bdf8] px-5 font-bold text-[#04141f]">
              Gå til {phaseLabels[upcomingPhase]} →
            </button>
          ) : (
            <a href="#etterrapport" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-[#38bdf8] px-5 font-bold text-[#04141f]">Åpne etterrapport</a>
          )}
        </section>
      ) : (
        <>
        {/* Vertical-spine runbook list — gjort/nå/kommende readable at a glance */}
        <section aria-label="Neste steg">
          <div className="flex gap-3">
            {/* Spine column */}
            <div className="relative flex w-4 flex-none flex-col items-center" aria-hidden="true">
              {/* Continuous line behind all dots */}
              <div className="absolute inset-x-0 top-2 bottom-2 mx-auto w-0.5 bg-[var(--border)]" style={{ left: '50%', transform: 'translateX(-50%)' }} />
              {visibleSteps.map((step, idx) => (
                <div key={step.id} className={`relative z-10 flex-none ${idx > 0 ? 'mt-[calc(var(--step-gap,2rem)-1rem)]' : ''}`} style={{ marginTop: idx > 0 ? undefined : undefined }}>
                  <span className={`block rounded-full ${stepDotClass[step.status]} ${stepDotSize[step.status]}`} />
                </div>
              ))}
            </div>

            {/* Steps */}
            <div className="flex flex-1 flex-col gap-2">
              {visibleSteps.map((step) => {
                if (step.status === 'locked') {
                  return (
                    <div
                      key={step.id}
                      className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-3 opacity-80"
                    >
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true" className="text-sm text-[var(--text-muted)]">🔒</span>
                        <span className="flex-1 text-sm font-semibold text-[var(--text-muted)]">{step.title}</span>
                      </div>
                      {step.lockReason ? (
                        <p className="mt-1 pl-6 font-mono text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                          {step.lockReason}
                        </p>
                      ) : null}
                    </div>
                  );
                }

                const isOpen = openStep?.id === step.id;
                const resolvedStep = step.status === 'done' || step.status === 'skipped';
                const badge = statusLabel[step.status] || (step.required ? 'Påkrevd' : '');
                const isActive = step.status === 'now';

                return (
                  <div
                    key={step.id}
                    className={`rounded-2xl border transition-shadow ${
                      isActive
                        ? 'border-[#38bdf8] bg-[var(--surface-elevated)] shadow-[0_4px_20px_rgba(56,189,248,0.12)] dark:border-[#38bdf8]'
                        : resolvedStep
                          ? 'border-[var(--border)] bg-[var(--surface)] opacity-70'
                          : 'border-[var(--border)] bg-[var(--surface)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenStepId(isOpen ? null : step.id)}
                      className="flex w-full min-h-12 items-center gap-3 px-3 py-3 text-left"
                      aria-expanded={isOpen}
                    >
                      {isActive ? (
                        <div className="min-w-0 flex-1">
                          <span className="block font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent-fg)]">Nå</span>
                          <span className="mt-0.5 block text-sm font-bold text-[var(--text-primary)]">{step.title}</span>
                        </div>
                      ) : (
                        <span className={`flex-1 text-sm font-semibold ${resolvedStep ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}`}>
                          {step.title}
                        </span>
                      )}
                      {badge ? (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[0.6rem] font-semibold ${statusBadgeClass[step.status]}`}>
                          {badge}
                        </span>
                      ) : null}
                    </button>

                    {isOpen ? (
                      <div className="border-t border-[var(--border)] px-3 pb-3 pt-2">
                        {step.sourceIds.length > 0 ? (() => {
                          const caution = step.sourceIds.some((id) => sourceRiskById[id] === 'caution');
                          return (
                            <p className="flex items-start gap-2 font-mono text-xs text-[var(--text-muted)]">
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${caution ? 'bg-[#fbbf24]' : 'bg-[#34d399]'}`} aria-hidden="true" />
                              <span>{caution ? 'Vær varsom' : 'Verifisert'} · Kilde: {step.sourceIds.map((id) => sourceTitleById[id] ?? id.replace(/^src-/, '')).join(', ')}</span>
                            </p>
                          );
                        })() : null}
                        <div className="mt-3 flex gap-2">
                          {resolvedStep ? (
                            <button
                              type="button"
                              onClick={() => void writeProgress(step.itemId, 'reopen')}
                              disabled={saving}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-bold text-[var(--text-secondary)] disabled:opacity-50"
                            >
                              Angre · sett aktiv igjen
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void writeProgress(step.itemId, 'done')}
                                disabled={saving}
                                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#38bdf8] px-4 text-sm font-bold text-[#04141f] disabled:opacity-50"
                              >
                                Gjort · neste
                              </button>
                              <button
                                type="button"
                                onClick={() => void writeProgress(step.itemId, 'skip')}
                                disabled={saving}
                                className="min-h-12 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-muted)] disabled:opacity-50"
                              >
                                Hopp over
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        {compact && hiddenStepCount > 0 ? (
          <p className="rounded-xl bg-[var(--surface)] px-3 py-2 font-mono text-xs font-semibold text-[var(--text-muted)]">
            +{hiddenStepCount} flere steg — se hele tavla i <span className="font-bold">Arbeid</span>.
          </p>
        ) : null}
        </>
      )}
    </div>
  );
}
