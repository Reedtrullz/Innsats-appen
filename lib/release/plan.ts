import type { Workplan, WorkplanRisk, WorkplanStage, WorkplansSnapshot } from '@/lib/workplans/schemas';

export type StageId = 'idea' | 'scope' | 'build' | 'verify' | 'release';
export type StageStatus = 'not-started' | 'in-progress' | 'ready';
export type WorkStatus = 'needs-work' | 'in-progress' | 'blocked' | 'completed';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ReleaseItem {
  id: string;
  title: string;
  owner: string;
  stage: StageId;
  status: WorkStatus;
  risk: RiskLevel;
  notes: string;
  completedAt?: string;
}

export interface ReleasePlan {
  stages: Record<StageId, StageStatus>;
  items: ReleaseItem[];
  syncedAt?: string;
}

export const defaultReleasePlan: ReleasePlan = {
  stages: {
    idea: 'ready',
    scope: 'ready',
    build: 'ready',
    verify: 'in-progress',
    release: 'not-started',
  },
  items: [
    {
      id: 'seed-mission-dashboard',
      title: 'Mission command dashboard prototype',
      owner: 'AR',
      stage: 'build',
      status: 'completed',
      risk: 'medium',
      notes: 'Active mission context, recommended actions, and checklist progress are in place.',
      completedAt: '2026-06-03T11:50:00.000Z',
    },
    {
      id: 'seed-release-tool',
      title: 'Release readiness tracker',
      owner: 'JM',
      stage: 'verify',
      status: 'in-progress',
      risk: 'medium',
      notes: 'Track ideas, blockers, stage gates, completed work, and readiness.',
    },
    {
      id: 'seed-offline-qa',
      title: 'Offline and privacy release check',
      owner: 'TS',
      stage: 'verify',
      status: 'needs-work',
      risk: 'high',
      notes: 'Run production mobile flow, offline reload, and privacy reset before release.',
    },
  ],
};

function releaseItemId(workplanId: string) {
  return `workplan-${workplanId}`;
}

function statusFromWorkplan(workplan: Workplan): WorkStatus {
  if (workplan.status === 'completed') return 'completed';
  if (workplan.status === 'blocked') return 'blocked';
  if (workplan.status === 'active') return 'in-progress';
  return 'needs-work';
}

function summarizeOpenTasks(workplan: Workplan) {
  const openTasks = workplan.tasks.filter((task) => task.status !== 'completed').slice(0, 4);
  if (openTasks.length === 0) return 'No open task headings found.';
  return openTasks.map((task) => `• ${task.title}`).join('\n');
}

export function releaseItemFromWorkplan(workplan: Workplan, existing?: ReleaseItem): ReleaseItem {
  const generatedStatus = statusFromWorkplan(workplan);
  const status = existing?.status ?? generatedStatus;
  const completedAt = status === 'completed' ? existing?.completedAt : undefined;
  return {
    id: releaseItemId(workplan.id),
    title: workplan.title,
    owner: existing?.owner ?? 'AR',
    stage: workplan.stage as WorkplanStage,
    status,
    risk: workplan.risk as WorkplanRisk,
    completedAt,
    notes: [
      workplan.summary,
      `Kilde: ${workplan.sourcePath}`,
      `Oppgaver: ${workplan.taskCount}`,
      summarizeOpenTasks(workplan),
    ].filter(Boolean).join('\n'),
  };
}

export function mergeSyncedWorkplansIntoPlan(plan: ReleasePlan, snapshot: WorkplansSnapshot): ReleasePlan {
  const existingById = new Map(plan.items.map((item) => [item.id, item]));
  const syncedIds = new Set(snapshot.workplans.map((workplan) => releaseItemId(workplan.id)));
  const nonSyncedItems = plan.items.filter((item) => !item.id.startsWith('workplan-') || syncedIds.has(item.id));
  const withoutSynced = nonSyncedItems.filter((item) => !syncedIds.has(item.id));
  const syncedItems = snapshot.workplans.map((workplan) => releaseItemFromWorkplan(workplan, existingById.get(releaseItemId(workplan.id))));
  return {
    ...plan,
    syncedAt: snapshot.generatedAt,
    items: [...syncedItems, ...withoutSynced],
  };
}
