'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  defaultReleasePlan,
  mergeSyncedWorkplansIntoPlan,
  type ReleaseItem,
  type ReleasePlan,
  type RiskLevel,
  type StageId,
  type StageStatus,
  type WorkStatus,
} from '@/lib/release/plan';
import { WorkplansSnapshotSchema, type WorkplansSnapshot } from '@/lib/workplans/schemas';

const storageKey = 'beredskapsboka-release-readiness-v1';

const stages: Array<{ id: StageId; title: string; shortTitle: string; description: string; gate: string; color: string }> = [
  { id: 'idea', title: 'Idé-innmelding', shortTitle: 'Plan', description: 'Definer og samkjør', gate: 'Hver idé har en tydelig bruker og et tydelig utfall.', color: 'blue' },
  { id: 'scope', title: 'Omfang', shortTitle: 'Omfang', description: 'Avgrens releasen', gate: 'Release-grenser og ikke-mål er tydelige.', color: 'blue' },
  { id: 'build', title: 'Bygg', shortTitle: 'Bygg', description: 'Bygg og valider', gate: 'Kjerneflytene fungerer med realistisk innhold.', color: 'green' },
  { id: 'verify', title: 'Verifiser', shortTitle: 'Klargjør', description: 'Forbered release-bevis', gate: 'Kjente risikoer er løst eller akseptert.', color: 'orange' },
  { id: 'release', title: 'Release', shortTitle: 'Lansering', description: 'Slipp og overvåk', gate: 'Releasen kan forklares og rulles tilbake.', color: 'blue' },
];

const stageLabels: Record<StageId, string> = Object.fromEntries(stages.map((stage) => [stage.id, stage.title])) as Record<StageId, string>;

const statusLabels: Record<WorkStatus, string> = {
  'needs-work': 'Trenger arbeid',
  'in-progress': 'Pågår',
  blocked: 'Blokkert',
  completed: 'Fullført',
};

const riskLabels: Record<RiskLevel, string> = {
  low: 'Lav',
  medium: 'Middels',
  high: 'Høy',
};

const stageStatusLabels: Record<StageStatus, string> = {
  'not-started': 'Ikke startet',
  'in-progress': 'Pågår',
  ready: 'Klar',
};

const milestones: Array<{ title: string; date: string; owner: string; stage: StageId }> = [
  { title: 'MVP-grense godkjent', date: 'Jun 3', owner: 'AR', stage: 'idea' },
  { title: 'Release-omfang låst', date: 'Jun 4', owner: 'JM', stage: 'scope' },
  { title: 'Kjernedashbord ferdig', date: 'Jun 5', owner: 'AR', stage: 'build' },
  { title: 'Lokal lagring verifisert', date: 'Jun 6', owner: 'TS', stage: 'build' },
  { title: 'Offline-QA ferdig', date: 'Jun 7', owner: 'TS', stage: 'verify' },
  { title: 'Personverngjennomgang', date: 'Jun 8', owner: 'AR', stage: 'verify' },
  { title: 'Pilotnotater klare', date: 'Jun 9', owner: 'JM', stage: 'release' },
  { title: 'Produksjonssetting', date: 'Jun 10', owner: 'AR', stage: 'release' },
];

interface CoverageGap {
  id: string;
  title: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

interface CoverageReportSnapshot {
  generatedAt?: string;
  fallback?: boolean;
  releaseBoard: { gaps: CoverageGap[] };
}

function isCoverageGap(value: unknown): value is CoverageGap {
  if (!value || typeof value !== 'object') return false;
  const gap = value as Record<string, unknown>;
  return (
    typeof gap.id === 'string'
    && typeof gap.title === 'string'
    && typeof gap.count === 'number'
    && Number.isFinite(gap.count)
    && (gap.severity === 'low' || gap.severity === 'medium' || gap.severity === 'high')
    && typeof gap.detail === 'string'
  );
}

function normalizeCoverageReportSnapshot(value: unknown): CoverageReportSnapshot {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const releaseBoard = record.releaseBoard && typeof record.releaseBoard === 'object' ? record.releaseBoard as Record<string, unknown> : {};
  const gaps = Array.isArray(releaseBoard.gaps) ? releaseBoard.gaps.filter(isCoverageGap) : [];
  return {
    generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : undefined,
    fallback: record.fallback === true,
    releaseBoard: { gaps },
  };
}

function coverageGapBadge(gap: { id?: string; severity?: string }) {
  if (gap.severity === 'high' && String(gap.id ?? '').startsWith('source-governance-')) return 'Pilotblokker';
  if (gap.severity === 'high') return 'Høy';
  if (gap.severity === 'medium') return 'Middels';
  return 'Lav';
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `release-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadPlan(): ReleasePlan {
  if (typeof window === 'undefined') return defaultReleasePlan;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return defaultReleasePlan;
  try {
    const parsed = JSON.parse(raw) as ReleasePlan;
    if (!parsed?.stages || !Array.isArray(parsed.items)) return defaultReleasePlan;
    return parsed;
  } catch {
    return defaultReleasePlan;
  }
}

function updateItem(items: ReleaseItem[], id: string, patch: Partial<ReleaseItem>) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function ownerColor(owner: string) {
  const palette = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700', 'bg-violet-100 text-violet-700'];
  const index = owner.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function statusTone(status: WorkStatus) {
  if (status === 'completed') return 'text-emerald-700';
  if (status === 'blocked') return 'text-red-700';
  if (status === 'in-progress') return 'text-blue-700';
  return 'text-orange-700';
}

function attentionTone(item: ReleaseItem) {
  if (item.status === 'blocked' || item.risk === 'high') return { ring: 'border-red-600 text-red-700', label: '!', text: 'text-red-700' };
  if (item.risk === 'medium') return { ring: 'border-orange-600 text-orange-700', label: '?', text: 'text-orange-700' };
  return { ring: 'border-blue-600 text-blue-700', label: 'i', text: 'text-blue-700' };
}

function stageProgress(status: StageStatus) {
  if (status === 'ready') return 100;
  if (status === 'in-progress') return 58;
  return 12;
}

function workstreamProgress(plan: ReleasePlan, stage: StageId) {
  const stageItems = plan.items.filter((item) => item.stage === stage);
  const stageBase = stageProgress(plan.stages[stage]);
  if (stageItems.length === 0) return stageBase;
  const completed = stageItems.filter((item) => item.status === 'completed').length;
  const blocked = stageItems.filter((item) => item.status === 'blocked').length;
  return Math.max(5, Math.min(100, Math.round((completed / stageItems.length) * 60 + stageBase * 0.4 - blocked * 15)));
}

function materialHref(title: string) {
  if (title === 'Kildepakke') return '/kilder';
  if (title === 'Oppdragsdemo') return '/oppdrag';
  if (title === 'Hurtigkort') return '/hurtigkort';
  return '#release-export';
}

function completedTaskCount(workplan: WorkplansSnapshot['workplans'][number]) {
  return workplan.tasks.filter((task) => task.status === 'completed').length;
}

function firstOpenTask(workplan: WorkplansSnapshot['workplans'][number]) {
  return workplan.tasks.find((task) => task.status !== 'completed');
}

function isBlockedSyncedWorkplan(workplan: WorkplansSnapshot['workplans'][number]) {
  return workplan.status === 'blocked' || workplan.tasks.some((task) => task.status === 'blocked');
}

function workplanReleaseItemId(workplanId: string) {
  return `workplan-${workplanId}`;
}

export function ReleaseReadinessTool() {
  const [plan, setPlan] = useState<ReleasePlan>(defaultReleasePlan);
  const [hydrated, setHydrated] = useState(false);
  const [workplansSnapshot, setWorkplansSnapshot] = useState<WorkplansSnapshot | null>(null);
  const [workplansError, setWorkplansError] = useState<string | null>(null);
  const [coverageReport, setCoverageReport] = useState<CoverageReportSnapshot | null>(null);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPlan(loadPlan());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(plan));
  }, [hydrated, plan]);

  useEffect(() => {
    if (!hydrated) return undefined;
    let cancelled = false;

    async function loadGeneratedWorkplanArtifacts() {
      const response = await fetch('/generated-content/workplans.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load workplans: ${response.status}`);
      const snapshot = WorkplansSnapshotSchema.parse(await response.json());
      if (cancelled) return;
      setWorkplansSnapshot(snapshot);
      setWorkplansError(null);
      setPlan((current) => mergeSyncedWorkplansIntoPlan(current, snapshot));
    }

    loadGeneratedWorkplanArtifacts().catch(() => {
      if (!cancelled) setWorkplansError('Generert workplan-artefakt er utilgjengelig i denne nettleserøkten.');
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return undefined;
    let cancelled = false;

    async function loadCoverageReport() {
      const response = await fetch('/generated-content/content-coverage-report.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load content coverage report: ${response.status}`);
      const snapshot = normalizeCoverageReportSnapshot(await response.json());
      if (snapshot.fallback) throw new Error('Generert reserveinnhold er ikke release-bevis');
      if (cancelled) return;
      setCoverageReport(snapshot);
      setCoverageError(null);
    }

    loadCoverageReport().catch(() => {
      if (!cancelled) {
        setCoverageReport(null);
        setCoverageError('Dekningsrapport for innhold er utilgjengelig. Kjør npm run validate:content lokalt før du vurderer pilotklarhet.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const summary = useMemo(() => {
    const completed = plan.items.filter((item) => item.status === 'completed').length;
    const blocked = plan.items.filter((item) => item.status === 'blocked').length;
    const open = plan.items.length - completed;
    const readyStages = Object.values(plan.stages).filter((status) => status === 'ready').length;
    const stageScore = Math.round((readyStages / stages.length) * 62);
    const completionScore = plan.items.length > 0 ? Math.round((completed / plan.items.length) * 38) : 38;
    return {
      blocked,
      completed,
      open,
      readyStages,
      score: Math.max(0, Math.min(100, stageScore + completionScore - blocked * 12)),
    };
  }, [plan]);

  const activeItems = plan.items.filter((item) => item.status !== 'completed');
  const completedItems = plan.items.filter((item) => item.status === 'completed');
  const syncedWorkplans = workplansSnapshot?.workplans ?? [];
  const blockedActiveItems = activeItems.filter((item) => item.status === 'blocked');
  const blockedReleaseWorkItemIds = new Set([
    ...blockedActiveItems.map((item) => item.id),
    ...syncedWorkplans.filter(isBlockedSyncedWorkplan).map((workplan) => workplanReleaseItemId(workplan.id)),
  ]);
  const blockedReleaseWorkCount = blockedReleaseWorkItemIds.size;
  const hasBlockedReleaseWork = blockedReleaseWorkCount > 0;
  const coverageGaps = coverageReport?.releaseBoard?.gaps ?? [];
  const highCoverageGaps = coverageGaps.filter((gap) => gap.severity === 'high');
  const highCoverageGapCount = highCoverageGaps.reduce((sum, gap) => sum + gap.count, 0);
  const pilotBlockerCoverageCount = highCoverageGaps
    .filter((gap) => gap.id.startsWith('source-governance-'))
    .reduce((sum, gap) => sum + gap.count, 0);
  const effectivePilotBlockerCount = pilotBlockerCoverageCount || highCoverageGapCount;
  const hasCoverageReport = coverageReport !== null;
  const hasHighCoverageGaps = highCoverageGaps.length > 0;
  const hasPilotBlockingCoverageGaps = !hasCoverageReport || hasHighCoverageGaps;
  const hasPilotBlockingReadiness = hasPilotBlockingCoverageGaps || hasBlockedReleaseWork;
  const readinessLabel = !hasCoverageReport ? 'Dekning ukjent' : hasHighCoverageGaps || hasBlockedReleaseWork ? 'Ikke pilotklar' : summary.score >= 80 ? 'Pilotklar' : summary.score >= 55 ? 'Nær klar' : 'Trenger arbeid';
  const readinessTone = hasPilotBlockingReadiness ? 'text-red-700' : 'text-blue-600';
  const attentionItems = activeItems
    .filter((item) => item.status === 'blocked' || item.risk !== 'low')
    .slice(0, 4);
  const exportText = JSON.stringify(plan, null, 2);
  const currentStageIndex = Math.max(0, stages.findIndex((stage) => plan.stages[stage.id] === 'in-progress'));
  const ringStyle = { background: `conic-gradient(#2563eb ${summary.score * 3.6}deg, #e5e7eb 0deg)` };

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    const nextItem: ReleaseItem = {
      id: newId(),
      title,
      owner: String(form.get('owner') ?? '').trim() || 'AR',
      stage: String(form.get('stage') ?? 'idea') as StageId,
      status: String(form.get('status') ?? 'needs-work') as WorkStatus,
      risk: String(form.get('risk') ?? 'medium') as RiskLevel,
      notes: String(form.get('notes') ?? '').trim(),
    };
    if (nextItem.status === 'completed') nextItem.completedAt = new Date().toISOString();
    setPlan((current) => ({ ...current, items: [nextItem, ...current.items] }));
    event.currentTarget.reset();
  }

  function setStageStatus(stage: StageId, status: StageStatus) {
    setPlan((current) => ({ ...current, stages: { ...current.stages, [stage]: status } }));
  }

  function setItemStatus(item: ReleaseItem, status: WorkStatus) {
    setPlan((current) => ({
      ...current,
      items: updateItem(current.items, item.id, {
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      }),
    }));
  }

  function resetPlan() {
    setPlan(workplansSnapshot ? mergeSyncedWorkplansIntoPlan(defaultReleasePlan, workplansSnapshot) : defaultReleasePlan);
  }

  function removeItem(id: string) {
    setPlan((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-3 sm:px-6">
        <header className="flex items-center gap-3">
          <Image src="/icon.svg" alt="" width={34} height={34} className="rounded-lg" />
          <p className="text-xl font-black tracking-tight">Beredskapsboka Release</p>
        </header>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <main className="min-w-0">
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-start">
              <div>
                <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-7xl">Innsats-app pilot</h1>
                <p className="mt-2 text-2xl font-bold text-slate-500">Release-status</p>
              </div>
              <div className="justify-self-start rounded-full p-3 lg:justify-self-end" style={ringStyle}>
                <div className="grid h-36 w-36 place-items-center rounded-full bg-white text-center shadow-inner">
                  <div>
                    <p className="text-4xl font-black">{summary.score}%</p>
                    <p className={`text-base font-black ${readinessTone}`}>{readinessLabel}</p>
                    {hasHighCoverageGaps ? <p className="mt-1 rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-700">{effectivePilotBlockerCount} pilotblokker{effectivePilotBlockerCount === 1 ? '' : 'e'}</p> : null}
                    {hasBlockedReleaseWork ? <p className="mt-1 rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-700">{blockedReleaseWorkCount} blokkert release/workplan</p> : null}
                    {!hasCoverageReport ? <p className="mt-1 rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-700">Dekning ikke verifisert</p> : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-10">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stages.filter((stage) => stage.id !== 'scope').map((stage) => (
                  <div key={stage.id} className="flex items-center gap-4">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 font-black ${stage.color === 'green' ? 'border-emerald-600 text-emerald-700' : stage.color === 'orange' ? 'border-orange-600 text-orange-700' : 'border-blue-600 text-blue-700'}`}>
                      {stage.shortTitle.slice(0, 1)}
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{stage.shortTitle}</h2>
                      <p className="text-sm font-semibold text-slate-500">{stage.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <div className="relative h-14">
                  <div className="absolute left-0 right-0 top-6 h-1 rounded-full bg-slate-200" />
                  <div className="absolute left-0 top-6 h-1 rounded-full bg-blue-600" style={{ width: `${Math.min(100, currentStageIndex * 24 + 16)}%` }} />
                  <div className="absolute top-6 h-1 rounded-full bg-emerald-600" style={{ left: '32%', width: '18%' }} />
                  <div className="absolute top-6 h-1 rounded-full bg-orange-500" style={{ left: '50%', width: '19%' }} />
                  {stages.map((stage, index) => {
                    const status = plan.stages[stage.id];
                    const left = `${8 + index * 22}%`;
                    return (
                      <div key={stage.id} className="absolute -translate-x-1/2" style={{ left }}>
                        <button
                          type="button"
                          onClick={() => setStageStatus(stage.id, status === 'ready' ? 'in-progress' : status === 'in-progress' ? 'not-started' : 'ready')}
                          className={`grid h-11 w-11 place-items-center rounded-full border-4 bg-white text-sm font-black ${status === 'ready' ? 'border-blue-600 text-blue-700' : status === 'in-progress' ? 'border-orange-600 text-orange-700' : 'border-slate-400 text-slate-500'}`}
                          aria-label={`${stage.title} status`}
                        >
                          {status === 'ready' ? '✓' : index + 1}
                        </button>
                        {status === 'in-progress' ? <span className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-md border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">Du er her</span> : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-7 grid grid-cols-2 gap-y-5 sm:grid-cols-4 lg:grid-cols-8">
                  {milestones.map((milestone) => (
                    <article key={milestone.title} className="border-l border-slate-200 pl-3">
                      <span className={`block h-2 w-2 rounded-full ${plan.stages[milestone.stage] === 'ready' ? 'bg-blue-600' : plan.stages[milestone.stage] === 'in-progress' ? 'bg-orange-400' : 'bg-slate-300'}`} />
                      <h3 className="mt-2 min-h-10 break-words text-sm font-black leading-tight">{milestone.title}</h3>
                      <p className="mt-2 text-sm font-black uppercase text-slate-500">{milestone.date}</p>
                      <span className={`mt-2 inline-grid h-9 w-9 place-items-center rounded-full text-sm font-black ${ownerColor(milestone.owner)}`}>{milestone.owner}</span>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-10 border-t border-slate-200 pt-4">
              <div className="hidden grid-cols-[minmax(10rem,1fr)_8rem_minmax(11rem,1fr)_7rem_8rem] gap-4 px-3 text-xs font-black uppercase tracking-wide text-slate-500 md:grid">
                <span>Arbeidsstrøm</span>
                <span>Fremdrift</span>
                <span>Neste milepæl</span>
                <span>Eier</span>
                <span>Status</span>
              </div>
              <div className="mt-3 divide-y divide-slate-200">
                {stages.slice(0, 4).map((stage) => {
                  const stageItems = plan.items.filter((item) => item.stage === stage.id);
                  const progress = workstreamProgress(plan, stage.id);
                  const next = stageItems.find((item) => item.status !== 'completed') ?? stageItems[0];
                  const owner = next?.owner ?? 'AR';
                  const atRisk = hasPilotBlockingCoverageGaps || stageItems.some((item) => item.status === 'blocked' || item.risk === 'high');
                  const stageRiskLabel = hasPilotBlockingCoverageGaps ? 'Pilotblokkere' : atRisk ? 'At Risk' : 'On Track';
                  return (
                    <article key={stage.id} className="grid grid-cols-1 gap-3 px-3 py-4 md:grid-cols-[minmax(10rem,1fr)_8rem_minmax(11rem,1fr)_7rem_8rem] md:items-center">
                      <div className="flex items-center gap-4">
                        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-black ${stage.color === 'green' ? 'bg-emerald-100 text-emerald-700' : stage.color === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{stage.shortTitle.slice(0, 1)}</div>
                        <div>
                          <h3 className="text-lg font-black">{stage.shortTitle === 'Enable' ? 'Verification' : stage.title}</h3>
                          <p className="text-sm font-semibold text-slate-500">{stage.gate}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-black text-blue-600">{progress}%</p>
                        <div className="mt-1 h-2 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <div>
                        <p className="font-black">{next?.title ?? stage.gate}</p>
                        <p className="text-sm font-semibold text-slate-500">{stage.description}</p>
                      </div>
                      <span className={`inline-grid h-11 w-11 place-items-center rounded-full text-sm font-black ${ownerColor(owner)}`}>{owner}</span>
                      <p className={`font-black ${hasPilotBlockingCoverageGaps ? 'text-red-700' : atRisk ? 'text-orange-700' : 'text-emerald-700'}`}>{stageRiskLabel}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">Generert lokal artefakt</p>
                  <h2 className="text-2xl font-black">Genererte lokale workplan-artefakter</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{syncedWorkplans.length} workplan{syncedWorkplans.length === 1 ? '' : 's'} lastet fra `/generated-content/workplans.json` — ingen backend-synk</p>
                </div>
                <p className="rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700">{workplansSnapshot ? `Artefakt generert: ${workplansSnapshot.generatedAt}` : workplansError ?? 'Venter på generert lokal workplan-artefakt.'}</p>
              </div>
              {syncedWorkplans.length === 0 ? (
                <p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-slate-600">Ingen genererte workplans er tilgjengelige ennå. Kjør <code>npm run sync:workplans</code> lokalt for å generere trygge metadata fra `.hermes/plans` til `content/workplans` og `/generated-content/workplans.json`; ingen backend-synk utføres.</p>
              ) : (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {syncedWorkplans.map((workplan) => (
                    <article key={workplan.id} className="rounded-xl bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">{workplan.title}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{workplan.taskCount} oppgaver · {stageLabels[workplan.stage]} · {riskLabels[workplan.risk]} risiko</p>
                          <p className="mt-2 text-sm font-black text-slate-700">
                            {completedTaskCount(workplan)}/{workplan.taskCount} oppgaver fullført
                          </p>
                          {firstOpenTask(workplan) ? (
                            <p className="mt-1 text-sm font-semibold text-orange-700">Åpen: {firstOpenTask(workplan)?.title}</p>
                          ) : (
                            <p className="mt-1 text-sm font-semibold text-emerald-700">Ingen åpne oppgavetitler.</p>
                          )}
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${workplan.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : workplan.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{workplan.status}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-600">{workplan.summary}</p>
                      <p className="mt-3 break-all text-xs font-black text-slate-500">{workplan.sourcePath}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">Legg til arbeid</p>
                <h2 className="text-2xl font-black">Fang en idé eller release-oppgave</h2>
                <form onSubmit={addItem} className="mt-4 grid gap-3">
                  <label className="text-sm font-bold">Tittel<input name="title" required className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" placeholder="Kjør produksjons-røyktest" /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold">Eier<input name="owner" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" placeholder="AR" /></label>
                    <label className="text-sm font-bold">Steg<select name="stage" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3">{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}</select></label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold">Status<select name="status" defaultValue="needs-work" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="text-sm font-bold">Risiko<select name="risk" defaultValue="medium" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3">{Object.entries(riskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  </div>
                  <label className="text-sm font-bold">Notater<textarea name="notes" className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                  <button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 font-black text-white">Legg til på release-tavla</button>
                </form>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">Åpne kontroller</p>
                    <h2 className="text-2xl font-black">Aktivt arbeid</h2>
                  </div>
                  <button type="button" onClick={resetPlan} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black">Nullstill</button>
                </div>
                <div className="mt-4 space-y-3">
                  {activeItems.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">{item.title}</h3>
                          <p className="text-sm font-semibold text-slate-500">{stageLabels[item.stage]} / {riskLabels[item.risk]} risiko</p>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="min-h-11 rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700">Fjern</button>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">Status<select value={item.status} onChange={(event) => setItemStatus(item, event.target.value as WorkStatus)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm normal-case tracking-normal text-slate-950">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">Steg<select value={item.stage} onChange={(event) => setPlan((current) => ({ ...current, items: updateItem(current.items, item.id, { stage: event.target.value as StageId }) }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm normal-case tracking-normal text-slate-950">{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}</select></label>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section id="release-export" className="mt-6 rounded-2xl bg-slate-100 p-4">
              <h2 className="text-xl font-black">Lokal eksport</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">Lagres kun i denne nettleseren. Kopier dette øyeblikksbildet inn i en release-sak eller planleggingsnotat ved behov. Eksporterte øyeblikksbilder kan inneholde operasjonelt sensitiv planleggingsinformasjon; håndter dem etter lokale rutiner.</p>
              <pre tabIndex={0} aria-label="Lokal release-eksport" className="mt-3 max-h-56 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{exportText}</pre>
            </section>
          </main>

          <aside className="border-t border-slate-200 pt-6 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-8">
            <section>
              <h2 className="text-2xl font-black">Trenger oppmerksomhet</h2>
              <div className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
                {hasHighCoverageGaps ? <p className="py-6 text-sm font-semibold text-red-700">Pilotblokkere fra innholdsdekning må løses eller eksplisitt aksepteres før pilot-start.</p> : null}
                {!hasCoverageReport ? <p className="py-6 text-sm font-semibold text-red-700">Dekningsrapport for innhold mangler eller er bare reserve; pilotklarhet er ikke verifisert.</p> : null}
                {hasCoverageReport && !hasHighCoverageGaps && hasBlockedReleaseWork ? <p className="py-6 text-sm font-semibold text-red-700">Blokkert release-/workplan-arbeid må løses før pilot.</p> : null}
                {hasCoverageReport && !hasHighCoverageGaps && !hasBlockedReleaseWork && attentionItems.length === 0 ? <p className="py-6 text-sm font-semibold text-slate-500">Ingen aktive risikoer på tavla.</p> : null}
                {attentionItems.map((item) => {
                  const tone = attentionTone(item);
                  return (
                    <article key={item.id} className="flex gap-4 py-5">
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-xl font-black ${tone.ring}`}>{tone.label}</div>
                      <div>
                        <h3 className="font-black">{item.title}</h3>
                        <p className={`mt-2 text-sm font-black ${tone.text}`}>{statusLabels[item.status]} · Owner: {item.owner}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-500">{item.notes || `${stageLabels[item.stage]} needs review.`}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-2xl font-black">Lanseringsmateriell</h2>
              <div className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
                {['Oppdragsdemo', 'Kildepakke', 'Hurtigkort', 'Release-eksport'].map((title) => (
                  <a key={title} href={materialHref(title)} className="flex min-h-14 items-center justify-between gap-3 py-3 text-base font-black">
                    <span>{title}</span>
                    <span aria-hidden="true" className="text-2xl text-slate-400">›</span>
                  </a>
                ))}
              </div>
            </section>

            <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-2xl font-black">Hull i innholdsdekning</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">{coverageReport?.generatedAt ? `Rapport: ${coverageReport.generatedAt}` : coverageError ?? 'Venter på generert dekningsrapport.'}</p>
              <div className="mt-3 space-y-3">
                {hasCoverageReport && coverageGaps.length === 0 ? <p className="rounded-xl bg-white p-3 text-sm font-semibold text-slate-600">Ingen hull i release-tavlas innholdsdekning rapportert.</p> : null}
                {coverageGaps.map((gap) => (
                  <article key={gap.id} className="rounded-xl bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-black">{gap.title}</h3>
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${gap.severity === 'high' ? 'bg-red-100 text-red-700' : gap.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>{gap.count}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${gap.severity === 'high' ? 'bg-red-100 text-red-700' : gap.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>{coverageGapBadge(gap)}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-600">{gap.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-xl font-black">Fullført arbeid</h2>
              <div className="mt-3 space-y-3">
                {completedItems.map((item) => (
                  <article key={item.id} className="rounded-xl bg-white p-3">
                    <h3 className="font-black">{item.title}</h3>
                    <p className={`mt-1 text-sm font-black ${statusTone(item.status)}`}>{stageLabels[item.stage]} / {item.owner}</p>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
