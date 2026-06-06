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
      summary: 'Ship generated workplan artifacts.',
      stage: 'verify',
      risk: 'high',
      status: 'active',
      taskCount: 2,
      updatedAt: '2026-06-04T12:00:00.000Z',
      tasks: [
        { id: 'pilot-workplan-task-1', title: 'Generate Obsidian note', status: 'active', stage: 'verify', risk: 'medium' },
        { id: 'pilot-workplan-task-2', title: 'Verify release page', status: 'planned', stage: 'release', risk: 'high' },
      ],
    },
  ],
};

it('merges generated workplan artifacts into the release plan while preserving local status overrides', () => {
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
  expect(item?.notes).toContain('Ship generated workplan artifacts.');
  expect(item?.notes).toContain('.hermes/plans/pilot-workplan.md');
  expect(merged.syncedAt).toBe('2026-06-04T12:00:00.000Z');
});

it('summarizes generated task progress and omits completed tasks from open-task notes', () => {
  const progressSnapshot: WorkplansSnapshot = {
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 1,
    workplans: [
      {
        id: 'pilot-workplan',
        title: 'Pilot Workplan',
        sourcePath: '.hermes/plans/pilot-workplan.md',
        sourceType: 'hermes-plan',
        summary: 'Ship generated workplan artifacts.',
        stage: 'verify',
        risk: 'high',
        status: 'active',
        taskCount: 2,
        updatedAt: '2026-06-04T12:00:00.000Z',
        evidence: [],
        tasks: [
          { id: 'pilot-workplan-task-1', title: 'Generate Obsidian note', status: 'completed', stage: 'verify', risk: 'medium', evidence: ['artifact generation PASS'] },
          { id: 'pilot-workplan-task-2', title: 'Verify release page', status: 'active', stage: 'release', risk: 'high', evidence: [] },
        ],
      },
    ],
  };

  const merged = mergeSyncedWorkplansIntoPlan(defaultReleasePlan, progressSnapshot);
  const item = merged.items.find((candidate) => candidate.id === 'workplan-pilot-workplan');

  expect(item?.notes).toContain('Task progress: 1/2 completed');
  expect(item?.notes).toContain('• Verify release page');
  expect(item?.notes).not.toContain('• Generate Obsidian note');
});

it('includes blocked task count in generated task progress summaries', () => {
  const blockedSnapshot: WorkplansSnapshot = {
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 1,
    workplans: [
      {
        id: 'pilot-workplan',
        title: 'Pilot Workplan',
        sourcePath: '.hermes/plans/pilot-workplan.md',
        sourceType: 'hermes-plan',
        summary: 'Ship generated workplan artifacts.',
        stage: 'verify',
        risk: 'high',
        status: 'blocked',
        taskCount: 6,
        updatedAt: '2026-06-04T12:00:00.000Z',
        evidence: [],
        tasks: [
          { id: 'pilot-workplan-task-1', title: 'Generate Obsidian note', status: 'completed', stage: 'verify', risk: 'medium', evidence: ['artifact generation PASS'] },
          { id: 'pilot-workplan-task-2', title: 'Run iPhone Safari', status: 'blocked', stage: 'release', risk: 'high', evidence: [] },
          { id: 'pilot-workplan-task-3', title: 'Run Android Chrome', status: 'blocked', stage: 'release', risk: 'high', evidence: [] },
          { id: 'pilot-workplan-task-4', title: 'Run home-screen install', status: 'blocked', stage: 'release', risk: 'high', evidence: [] },
          { id: 'pilot-workplan-task-5', title: 'Run low-connectivity', status: 'blocked', stage: 'release', risk: 'high', evidence: [] },
          { id: 'pilot-workplan-task-6', title: 'Run update-after-offline', status: 'blocked', stage: 'release', risk: 'high', evidence: [] },
        ],
      },
    ],
  };

  const merged = mergeSyncedWorkplansIntoPlan(defaultReleasePlan, blockedSnapshot);
  const item = merged.items.find((candidate) => candidate.id === 'workplan-pilot-workplan');

  expect(item?.notes).toContain('Task progress: 1/6 completed, 5 blocked');
  expect(item?.notes).toContain('• Run iPhone Safari');
  expect(item?.notes).toContain('• Run update-after-offline');
});

it('treats active workplans with blocked child tasks as blocked release items', () => {
  const blockedSnapshot: WorkplansSnapshot = {
    generatedAt: '2026-06-06T01:25:09.000Z',
    sourceCount: 1,
    workplans: [
      {
        id: 'pilot-device-evidence',
        title: 'Pilot Device Evidence',
        sourcePath: '.hermes/plans/pilot-device-evidence.md',
        sourceType: 'hermes-plan',
        summary: 'Collect real-device evidence.',
        stage: 'release',
        risk: 'high',
        status: 'active',
        taskCount: 2,
        updatedAt: '2026-06-06T01:25:09.000Z',
        tasks: [
          { id: 'pilot-device-evidence-task-1', title: 'Run iPhone Safari', status: 'blocked', stage: 'release', risk: 'high' },
          { id: 'pilot-device-evidence-task-2', title: 'Run Android Chrome', status: 'blocked', stage: 'release', risk: 'high' },
        ],
      },
    ],
  };

  const merged = mergeSyncedWorkplansIntoPlan(defaultReleasePlan, blockedSnapshot);
  expect(merged.items.find((item) => item.id === 'workplan-pilot-device-evidence')).toMatchObject({
    status: 'blocked',
    risk: 'high',
  });
});
