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

it('parses explicit plan-level metadata from markdown', () => {
  const markdown = `# Verified Plan\n\nStatus: **completed**\nStage: release\nRisk: low\nOwner: **AR**\nCompleted-At: 2026-06-03T13:59:34.000Z\nEvidence: [npm run check PASS](https://example.invalid/log)\nEvidence: live health matched SHA\n\n**Goal:** Capture verified release truth.\n\n### Task 1: Close release loop\n`;

  const workplan = parseWorkplanMarkdown({
    fileName: '2026-06-03_135934-verified-plan.md',
    relativePath: '.hermes/plans/2026-06-03_135934-verified-plan.md',
    markdown,
    updatedAt: '2026-06-03T13:59:34.000Z',
  });

  expect(workplan).toMatchObject({
    status: 'completed',
    stage: 'release',
    risk: 'low',
    owner: 'AR',
    completedAt: '2026-06-03T13:59:34.000Z',
    evidence: ['npm run check PASS', 'live health matched SHA'],
  });
});

it('rejects explicit invalid plan-level enum metadata instead of falling back', () => {
  const markdown = `# Bad Metadata Plan\n\nStatus: done\nStage: qa\nRisk: severe\n\n**Goal:** This should fail loudly.\n\n### Task 1: Never parsed\n`;

  expect(() => parseWorkplanMarkdown({
    fileName: '2026-06-03_135934-bad-metadata-plan.md',
    relativePath: '.hermes/plans/2026-06-03_135934-bad-metadata-plan.md',
    markdown,
  })).toThrow(/Invalid workplan metadata/i);
});

it('rejects duplicate non-evidence plan metadata instead of falling back', () => {
  const markdown = `# Duplicate Metadata Plan\n\nStatus: done\nStatus: active\n\n**Goal:** Duplicate metadata should not hide invalid values.\n\n### Task 1: Never parsed\n`;

  expect(() => parseWorkplanMarkdown({
    fileName: '2026-06-03_135934-duplicate-metadata-plan.md',
    relativePath: '.hermes/plans/2026-06-03_135934-duplicate-metadata-plan.md',
    markdown,
  })).toThrow(/Invalid workplan metadata/i);
});

it('does not infer plan completion from task-level status lines', () => {
  const markdown = `# Task Only Status Plan\n\n**Goal:** Keep plan-level status inferred from the preamble only.\n\n### Task 1: Completed child task\n\nStatus: completed\nCompleted-At: 2026-06-03T13:59:34.000Z\n`;

  const workplan = parseWorkplanMarkdown({
    fileName: '2026-06-03_135934-task-only-status-plan.md',
    relativePath: '.hermes/plans/2026-06-03_135934-task-only-status-plan.md',
    markdown,
  });

  expect(workplan.status).toBe('active');
});

it('parses task-level status and evidence metadata from task sections', () => {
  const markdown = `# Task Metadata Plan

Status: active
Stage: verify
Risk: high

**Goal:** Show task truth.

### Task 1: Restore lint

Status: completed
Owner: AR
Completed-At: 2026-06-03T13:00:00.000Z
Evidence: npm run lint PASS

### Task 2: Verify offline flow

Status: active
Stage: release
Risk: high
Evidence: PLAYWRIGHT_PORT=3007 npm run e2e:prod pending
`;

  const workplan = parseWorkplanMarkdown({
    fileName: '2026-06-03_140000-task-metadata-plan.md',
    relativePath: '.hermes/plans/2026-06-03_140000-task-metadata-plan.md',
    markdown,
    updatedAt: '2026-06-03T14:00:00.000Z',
  });

  expect(workplan.tasks).toHaveLength(2);
  expect(workplan.tasks[0]).toMatchObject({
    title: 'Restore lint',
    status: 'completed',
    owner: 'AR',
    completedAt: '2026-06-03T13:00:00.000Z',
    evidence: ['npm run lint PASS'],
  });
  expect(workplan.tasks[1]).toMatchObject({
    title: 'Verify offline flow',
    status: 'active',
    stage: 'release',
    risk: 'high',
    evidence: ['PLAYWRIGHT_PORT=3007 npm run e2e:prod pending'],
  });
});

it('rejects explicit invalid task-level enum metadata', () => {
  const markdown = `# Invalid Task Metadata Plan

Status: active

**Goal:** Bad task metadata should fail.

### Task 1: Bad task

Status: waiting
Stage: qa
Risk: severe
`;

  expect(() => parseWorkplanMarkdown({
    fileName: '2026-06-03_140000-invalid-task-metadata-plan.md',
    relativePath: '.hermes/plans/2026-06-03_140000-invalid-task-metadata-plan.md',
    markdown,
  })).toThrow(/Invalid workplan metadata/i);
});

it('does not parse natural prose task status lines after body content as task metadata', () => {
  const markdown = `# Task Prose Status Plan

Status: active
Stage: build
Risk: medium

**Goal:** Keep prose out of task metadata.

### Task 1: Parse prose body

Status: active

- Step 1: Document the current state.
- Status: completed in this bullet is natural prose, not metadata.

Stage: release
Evidence: should not be parsed after the bullet
`;

  const workplan = parseWorkplanMarkdown({
    fileName: '2026-06-03_140000-task-prose-status-plan.md',
    relativePath: '.hermes/plans/2026-06-03_140000-task-prose-status-plan.md',
    markdown,
  });

  expect(workplan.tasks[0]).toMatchObject({
    title: 'Parse prose body',
    status: 'active',
    stage: 'build',
    risk: 'medium',
  });
  expect(workplan.tasks[0].evidence).toBeUndefined();
});

it('ignores task headings and metadata inside fenced code blocks', () => {
  const markdown = `# Fenced Task Heading Plan

Status: active
Stage: build
Risk: medium

**Goal:** Ignore examples.

### Task 1: Real task

Status: active

\`\`\`markdown
### Task 99: Example only

Status: completed
Stage: release
Evidence: should not become a task
\`\`\`
`;

  const workplan = parseWorkplanMarkdown({
    fileName: '2026-06-03_140000-fenced-task-heading-plan.md',
    relativePath: '.hermes/plans/2026-06-03_140000-fenced-task-heading-plan.md',
    markdown,
  });

  expect(workplan.tasks).toHaveLength(1);
  expect(workplan.tasks[0]).toMatchObject({
    id: '2026-06-03_140000-fenced-task-heading-plan-task-1',
    title: 'Real task',
    status: 'active',
  });
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
        summary: 'Ship generated workplan artifacts.',
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

it('groups active and completed plans in the rendered Obsidian note', async () => {
  const root = await tempRoot();
  const plansDir = path.join(root, '.hermes/plans');
  const generatedDir = path.join(root, 'content/generated');
  const publicGeneratedDir = path.join(root, 'public/generated-content');
  const obsidianProjectDir = path.join(root, 'Obsidian/Hvelvet/01_Projects/Beredskapsboka');
  await fs.mkdir(plansDir, { recursive: true });
  await fs.writeFile(
    path.join(plansDir, '2026-06-03_140000-active-plan.md'),
    '# Active Plan\n\nStatus: active\nStage: verify\nRisk: high\n\n**Goal:** Finish the open item.\n\n### Task 1: Open item\n\nStatus: active\nEvidence: waiting for e2e\n',
  );
  await fs.writeFile(
    path.join(plansDir, '2026-06-03_130000-completed-plan.md'),
    '# Completed Plan\n\nStatus: completed\nStage: release\nRisk: medium\nCompleted-At: 2026-06-03T13:00:00.000Z\nEvidence: npm run check PASS\n\n**Goal:** Record done work.\n\n### Task 1: Done item\n\nStatus: completed\nCompleted-At: 2026-06-03T13:00:00.000Z\nEvidence: sync PASS\n',
  );

  await syncWorkplans({ rootDir: root, generatedDir, publicGeneratedDir, obsidianProjectDir });
  const obsidianNote = await fs.readFile(path.join(obsidianProjectDir, '20-Workplans.md'), 'utf8');

  expect(obsidianNote).toContain('## Aktive planer');
  expect(obsidianNote).toContain('## Fullførte planer');
  expect(obsidianNote).toContain('### Active Plan');
  expect(obsidianNote).toContain('### Completed Plan');
  expect(obsidianNote).toContain('- Task 1: Open item — `active`');
  expect(obsidianNote).toContain('- Task 1: Done item — `completed`');
  expect(obsidianNote).toContain('- Fullført: 2026-06-03T13:00:00.000Z');
  expect(obsidianNote).toContain('- Evidence: npm run check PASS');
  expect(obsidianNote).toContain('  - Evidence: waiting for e2e');
  expect(obsidianNote).toContain('  - Evidence: sync PASS');
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

it('fails check mode when local Hermes plans drift from the tracked workplan snapshot', async () => {
  const root = await tempRoot();
  const plansDir = path.join(root, '.hermes/plans');
  const generatedDir = path.join(root, 'content/generated');
  const publicGeneratedDir = path.join(root, 'public/generated-content');
  const snapshotSourcePath = path.join(root, 'content/workplans/workplans.json');
  await fs.mkdir(plansDir, { recursive: true });
  await fs.writeFile(
    path.join(plansDir, '2026-06-04_120000-pilot-workplan.md'),
    '# Pilot Workplan\n\n**Goal:** Ship Obsidian-backed release sync.\n\n### Task 1: Build sync script\n',
  );
  await fs.mkdir(path.dirname(snapshotSourcePath), { recursive: true });
  await fs.writeFile(snapshotSourcePath, JSON.stringify({
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 1,
    workplans: [
      {
        id: 'stale-plan',
        title: 'Stale Plan',
        sourcePath: 'content/workplans/workplans.json',
        sourceType: 'manual-snapshot',
        summary: 'This stale tracked snapshot should fail check mode.',
        stage: 'build',
        risk: 'medium',
        status: 'active',
        taskCount: 0,
        updatedAt: '2026-06-04T12:00:00.000Z',
        tasks: [],
      },
    ],
  }, null, 2));

  await expect(syncWorkplans({
    rootDir: root,
    generatedDir,
    publicGeneratedDir,
    snapshotSourcePath,
    mode: 'check',
    now: '2026-06-04T12:30:00.000Z',
  })).rejects.toThrow(/workplan snapshot drift/i);

  await expect(fs.readFile(path.join(generatedDir, 'workplans.json'), 'utf8')).rejects.toThrow();
  await expect(fs.readFile(path.join(publicGeneratedDir, 'workplans.json'), 'utf8')).rejects.toThrow();
});

it('passes check mode in snapshot-only environments without local Hermes plans', async () => {
  const root = await tempRoot();
  const generatedDir = path.join(root, 'content/generated');
  const publicGeneratedDir = path.join(root, 'public/generated-content');
  const snapshotSourcePath = path.join(root, 'content/workplans/workplans.json');
  await fs.mkdir(path.dirname(snapshotSourcePath), { recursive: true });
  await fs.writeFile(snapshotSourcePath, JSON.stringify({
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 1,
    planSourceCount: 1,
    planSourceHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    workplans: [
      {
        id: 'manual-snapshot-plan',
        title: 'Manual Snapshot Plan',
        sourcePath: 'content/workplans/workplans.json',
        sourceType: 'manual-snapshot',
        summary: 'Snapshot-only CI can still validate generated mirrors.',
        stage: 'verify',
        risk: 'low',
        status: 'active',
        taskCount: 0,
        updatedAt: '2026-06-04T12:00:00.000Z',
        tasks: [],
      },
    ],
  }, null, 2));

  const result = await syncWorkplans({
    rootDir: root,
    generatedDir,
    publicGeneratedDir,
    snapshotSourcePath,
    mode: 'check',
    now: '2026-06-04T12:30:00.000Z',
  });

  expect(result.workplans).toHaveLength(1);
  expect(result.snapshot.planSourceHash).toBe('sha256:1111111111111111111111111111111111111111111111111111111111111111');
  await expect(fs.readFile(path.join(generatedDir, 'workplans.json'), 'utf8')).rejects.toThrow();
});

it('fails check mode in snapshot-only environments when the tracked workplan snapshot is missing', async () => {
  const root = await tempRoot();
  const generatedDir = path.join(root, 'content/generated');
  const publicGeneratedDir = path.join(root, 'public/generated-content');
  const snapshotSourcePath = path.join(root, 'content/workplans/workplans.json');

  await expect(syncWorkplans({
    rootDir: root,
    generatedDir,
    publicGeneratedDir,
    snapshotSourcePath,
    mode: 'check',
    now: '2026-06-04T12:30:00.000Z',
  })).rejects.toThrow(/workplan snapshot.*missing/i);

  await expect(fs.readFile(path.join(generatedDir, 'workplans.json'), 'utf8')).rejects.toThrow();
});

it('fails check mode when the local Hermes plans directory is present but emptied', async () => {
  const root = await tempRoot();
  const plansDir = path.join(root, '.hermes/plans');
  const generatedDir = path.join(root, 'content/generated');
  const publicGeneratedDir = path.join(root, 'public/generated-content');
  const snapshotSourcePath = path.join(root, 'content/workplans/workplans.json');
  await fs.mkdir(plansDir, { recursive: true });
  await fs.mkdir(path.dirname(snapshotSourcePath), { recursive: true });
  await fs.writeFile(snapshotSourcePath, JSON.stringify({
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 1,
    planSourceCount: 1,
    planSourceHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    workplans: [
      {
        id: 'stale-plan',
        title: 'Stale Plan',
        sourcePath: 'content/workplans/workplans.json',
        sourceType: 'manual-snapshot',
        summary: 'The tracked snapshot should fail because local plans were removed.',
        stage: 'build',
        risk: 'medium',
        status: 'active',
        taskCount: 0,
        updatedAt: '2026-06-04T12:00:00.000Z',
        tasks: [],
      },
    ],
  }, null, 2));

  await expect(syncWorkplans({
    rootDir: root,
    generatedDir,
    publicGeneratedDir,
    snapshotSourcePath,
    mode: 'check',
    now: '2026-06-04T12:30:00.000Z',
  })).rejects.toThrow(/workplan snapshot drift/i);
});

it('rejects malformed workplan source hash metadata', () => {
  const result = WorkplansSnapshotSchema.safeParse({
    generatedAt: '2026-06-04T12:00:00.000Z',
    sourceCount: 0,
    planSourceCount: 0,
    planSourceHash: 'sha256:snapshot-only',
    workplans: [],
  });

  expect(result.success).toBe(false);
});
