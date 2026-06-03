import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { WorkplansSnapshotSchema } from '@/lib/workplans/schemas';
import { parseWorkplanMarkdown, syncWorkplans } from '@/scripts/sync-workplans';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

async function tempRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beredskapsboka-workplans-'));
  tempRoots.push(root);
  return root;
}

it('parses a workplan markdown file into release-ready workplan metadata and tasks', () => {
  const markdown = `# Pilot Workplan\n\n**Goal:** Ship Obsidian-backed release sync.\n\n### Task 1: Build sync script\n\nDo the thing.\n\n### Task 2: Verify release page\n\nRun the gates.\n`;

  const workplan = parseWorkplanMarkdown({
    fileName: '2026-06-04_120000-pilot-workplan.md',
    relativePath: '.hermes/plans/2026-06-04_120000-pilot-workplan.md',
    markdown,
  });

  expect(workplan).toMatchObject({
    id: '2026-06-04_120000-pilot-workplan',
    title: 'Pilot Workplan',
    summary: 'Ship Obsidian-backed release sync.',
    sourcePath: '.hermes/plans/2026-06-04_120000-pilot-workplan.md',
    stage: 'build',
    risk: 'medium',
    status: 'active',
    taskCount: 2,
  });
  expect(workplan.tasks.map((task) => task.title)).toEqual(['Build sync script', 'Verify release page']);
});

it('preserves optional workplan and task evidence metadata', () => {
  const snapshot = WorkplansSnapshotSchema.parse({
    generatedAt: '2026-06-03T13:59:34.000Z',
    sourceCount: 1,
    workplans: [
      {
        id: 'metadata-plan',
        title: 'Metadata Plan',
        sourcePath: '.hermes/plans/metadata-plan.md',
        sourceType: 'hermes-plan',
        summary: 'Prove workplan metadata survives parsing.',
        stage: 'verify',
        risk: 'high',
        status: 'completed',
        owner: 'AR',
        completedAt: '2026-06-03T13:59:34.000Z',
        evidence: ['npm run check PASS'],
        taskCount: 1,
        updatedAt: '2026-06-03T13:59:34.000Z',
        tasks: [
          {
            id: 'metadata-plan-task-1',
            title: 'Verify generated JSON',
            status: 'completed',
            stage: 'verify',
            risk: 'high',
            owner: 'AR',
            completedAt: '2026-06-03T13:59:34.000Z',
            evidence: ['sync test PASS'],
          },
        ],
      },
    ],
  });

  expect(snapshot.workplans[0].owner).toBe('AR');
  expect(snapshot.workplans[0].completedAt).toBe('2026-06-03T13:59:34.000Z');
  expect(snapshot.workplans[0].evidence).toEqual(['npm run check PASS']);
  expect(snapshot.workplans[0].tasks[0].owner).toBe('AR');
  expect(snapshot.workplans[0].tasks[0].completedAt).toBe('2026-06-03T13:59:34.000Z');
  expect(snapshot.workplans[0].tasks[0].evidence).toEqual(['sync test PASS']);
});

it('rejects inconsistent workplan and task counts', () => {
  const snapshot = {
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 2,
    workplans: [
      {
        id: 'pilot-workplan',
        title: 'Pilot Workplan',
        sourcePath: '.hermes/plans/pilot-workplan.md',
        sourceType: 'hermes-plan',
        summary: 'Ship synced workplans.',
        stage: 'build',
        risk: 'medium',
        status: 'active',
        taskCount: 2,
        updatedAt: '2026-06-04T12:00:00.000Z',
        tasks: [{ id: 'pilot-workplan-task-1', title: 'Build sync script', status: 'planned', stage: 'build', risk: 'medium' }],
      },
    ],
  };

  const result = WorkplansSnapshotSchema.safeParse(snapshot);

  expect(result.success).toBe(false);
});

it('writes generated/public workplans JSON and an Obsidian index note from local plan files', async () => {
  const root = await tempRoot();
  const plansDir = path.join(root, '.hermes/plans');
  const generatedDir = path.join(root, 'content/generated');
  const publicGeneratedDir = path.join(root, 'public/generated-content');
  const obsidianProjectDir = path.join(root, 'Obsidian/Hvelvet/01_Projects/Beredskapsboka');
  await fs.mkdir(plansDir, { recursive: true });
  await fs.writeFile(
    path.join(plansDir, '2026-06-04_120000-pilot-workplan.md'),
    '# Pilot Workplan\n\n**Goal:** Ship Obsidian-backed release sync.\n\n### Task 1: Build sync script\n',
  );

  const result = await syncWorkplans({ rootDir: root, generatedDir, publicGeneratedDir, obsidianProjectDir });

  expect(result.workplans).toHaveLength(1);
  const generated = JSON.parse(await fs.readFile(path.join(generatedDir, 'workplans.json'), 'utf8'));
  const publicGenerated = JSON.parse(await fs.readFile(path.join(publicGeneratedDir, 'workplans.json'), 'utf8'));
  const obsidianNote = await fs.readFile(path.join(obsidianProjectDir, '20-Workplans.md'), 'utf8');

  expect(generated.workplans[0].title).toBe('Pilot Workplan');
  expect(publicGenerated.workplans[0].tasks).toHaveLength(1);
  expect(obsidianNote).toContain('[[00-Index]]');
  expect(obsidianNote).toContain('Pilot Workplan');
  expect(obsidianNote).toContain('Task 1: Build sync script');
});
