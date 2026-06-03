import { expect, it } from 'vitest';
import { defaultReleasePlan, mergeSyncedWorkplansIntoPlan } from '@/lib/release/plan';
import type { WorkplansSnapshot } from '@/lib/workplans/schemas';

const snapshot: WorkplansSnapshot = {
  generatedAt: '2026-06-04T12:00:00.000Z',
  sourceCount: 1,
  workplans: [
    {
      id: 'pilot-workplan',
      title: 'Pilot Workplan',
      sourcePath: '.hermes/plans/pilot-workplan.md',
      sourceType: 'hermes-plan',
      summary: 'Ship synced workplans.',
      stage: 'verify',
      risk: 'high',
      status: 'active',
      taskCount: 2,
      updatedAt: '2026-06-04T12:00:00.000Z',
      tasks: [
        { id: 'pilot-workplan-task-1', title: 'Sync Obsidian note', status: 'active', stage: 'verify', risk: 'medium' },
        { id: 'pilot-workplan-task-2', title: 'Verify release page', status: 'planned', stage: 'release', risk: 'high' },
      ],
    },
  ],
};

it('merges synced workplans into the release plan while preserving local status overrides', () => {
  const localPlan = {
    ...defaultReleasePlan,
    items: [
      ...defaultReleasePlan.items,
      {
        id: 'workplan-pilot-workplan',
        title: 'Old local title',
        owner: 'AR',
        stage: 'verify' as const,
        status: 'completed' as const,
        risk: 'low' as const,
        notes: 'local status should survive regenerated workplan metadata',
        completedAt: '2026-06-04T13:00:00.000Z',
      },
    ],
  };

  const merged = mergeSyncedWorkplansIntoPlan(localPlan, snapshot);
  const item = merged.items.find((candidate) => candidate.id === 'workplan-pilot-workplan');

  expect(item).toMatchObject({
    title: 'Pilot Workplan',
    status: 'completed',
    completedAt: '2026-06-04T13:00:00.000Z',
    stage: 'verify',
    risk: 'high',
  });
  expect(item?.notes).toContain('Ship synced workplans.');
  expect(item?.notes).toContain('.hermes/plans/pilot-workplan.md');
  expect(merged.syncedAt).toBe('2026-06-04T12:00:00.000Z');
});

it('summarizes synced task progress and omits completed tasks from open-task notes', () => {
  const progressSnapshot: WorkplansSnapshot = {
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 1,
    workplans: [
      {
        id: 'pilot-workplan',
        title: 'Pilot Workplan',
        sourcePath: '.hermes/plans/pilot-workplan.md',
        sourceType: 'hermes-plan',
        summary: 'Ship synced workplans.',
        stage: 'verify',
        risk: 'high',
        status: 'active',
        taskCount: 2,
        updatedAt: '2026-06-04T12:00:00.000Z',
        evidence: [],
        tasks: [
          { id: 'pilot-workplan-task-1', title: 'Sync Obsidian note', status: 'completed', stage: 'verify', risk: 'medium', evidence: ['sync PASS'] },
          { id: 'pilot-workplan-task-2', title: 'Verify release page', status: 'active', stage: 'release', risk: 'high', evidence: [] },
        ],
      },
    ],
  };

  const merged = mergeSyncedWorkplansIntoPlan(defaultReleasePlan, progressSnapshot);
  const item = merged.items.find((candidate) => candidate.id === 'workplan-pilot-workplan');

  expect(item?.notes).toContain('Task progress: 1/2 completed');
  expect(item?.notes).toContain('• Verify release page');
  expect(item?.notes).not.toContain('• Sync Obsidian note');
});

it('includes blocked task count in synced task progress summaries', () => {
  const blockedSnapshot: WorkplansSnapshot = {
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 1,
    workplans: [
      {
        id: 'pilot-workplan',
        title: 'Pilot Workplan',
        sourcePath: '.hermes/plans/pilot-workplan.md',
        sourceType: 'hermes-plan',
        summary: 'Ship synced workplans.',
        stage: 'verify',
        risk: 'high',
        status: 'blocked',
        taskCount: 2,
        updatedAt: '2026-06-04T12:00:00.000Z',
        evidence: [],
        tasks: [
          { id: 'pilot-workplan-task-1', title: 'Sync Obsidian note', status: 'completed', stage: 'verify', risk: 'medium', evidence: ['sync PASS'] },
          { id: 'pilot-workplan-task-2', title: 'Verify release page', status: 'blocked', stage: 'release', risk: 'high', evidence: [] },
        ],
      },
    ],
  };

  const merged = mergeSyncedWorkplansIntoPlan(defaultReleasePlan, blockedSnapshot);
  const item = merged.items.find((candidate) => candidate.id === 'workplan-pilot-workplan');

  expect(item?.notes).toContain('Task progress: 1/2 completed, 1 blocked');
});
