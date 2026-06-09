import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { ContentManifestSchema, type ContentManifest } from '@/lib/content/schemas';
import {
  WorkplanSchema,
  WorkplansSnapshotSchema,
  type Workplan,
  type WorkplanRisk,
  type WorkplanStage,
  type WorkplanStatus,
  type WorkplansSnapshot,
} from '@/lib/workplans/schemas';

export interface ParseWorkplanOptions {
  fileName: string;
  relativePath: string;
  markdown: string;
  updatedAt?: string;
}

export interface SyncWorkplansOptions {
  rootDir?: string;
  plansDir?: string;
  generatedDir?: string;
  publicGeneratedDir?: string;
  snapshotSourcePath?: string;
  obsidianProjectDir?: string;
  now?: string;
  mode?: 'write' | 'check';
}

export interface SyncWorkplansResult {
  snapshot: WorkplansSnapshot;
  workplans: Workplan[];
  obsidianNotePath?: string;
}

interface LocalPlanReadResult {
  workplans: Workplan[];
  planSourceCount: number;
  planSourceHash: string;
  sourceDirectoryExists: boolean;
}

function repoPath(rootDir: string, ...parts: string[]) {
  return path.join(rootDir, ...parts);
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeNorwegian(value: string) {
  return value
    .replace(/æ/g, 'ae').replace(/Æ/g, 'ae')
    .replace(/ø/g, 'o').replace(/Ø/g, 'o')
    .replace(/å/g, 'a').replace(/Å/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .trim();
}

type MetadataValue = string | string[];
type MetadataMap = Record<string, MetadataValue>;

interface TaskSection {
  number: string;
  title: string;
  body: string;
}

function metadataKey(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, '-');
}

function extractLeadingMetadata(markdown: string): MetadataMap {
  const metadata: MetadataMap = {};
  const lines = markdown.split(/\r?\n/);
  const h1Index = lines.findIndex((line) => /^#\s+/.test(line.trim()));
  const startIndex = h1Index === -1 ? 0 : h1Index + 1;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!line) continue;
    if (line.startsWith('>') || /^(?:\*\*)?Goal(?:\*\*)?:/i.test(line) || /^###\s+Task\s+\d+\s*:/i.test(line)) break;

    const match = line.match(/^([A-Za-z][A-Za-z _-]*):\s*(.*)$/);
    if (!match) break;

    const key = metadataKey(match[1] ?? '');
    const value = cleanInlineMarkdown(match[2] ?? '');
    const existing = metadata[key];
    if (key === 'evidence') {
      metadata[key] = existing === undefined ? [value] : Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else if (existing === undefined) {
      metadata[key] = value;
    } else {
      throw new Error(`Invalid workplan metadata duplicate ${key}: ${value}`);
    }
  }

  return metadata;
}

function scalarMetadata(metadata: MetadataMap, key: string) {
  const value = metadata[metadataKey(key)];
  return typeof value === 'string' ? value : undefined;
}

function evidenceMetadata(metadata: MetadataMap) {
  const value = metadata.evidence;
  if (value === undefined) return undefined;
  const evidence = Array.isArray(value) ? value : [value];
  const nonEmptyEvidence = evidence.filter((item) => item.length > 0);
  return nonEmptyEvidence.length > 0 ? nonEmptyEvidence : undefined;
}

function slugifyWorkplanId(value: string) {
  return normalizeNorwegian(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function extractTitle(markdown: string, fileName: string) {
  const h1 = markdown.match(/^#\s+(.+)$/m)?.[1];
  if (h1) return cleanInlineMarkdown(h1);
  return cleanInlineMarkdown(path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, ' '));
}

function extractSummary(markdown: string) {
  const goal = markdown.match(/\*\*Goal:\*\*\s*([^\n]+)/i)?.[1] ?? markdown.match(/^Goal:\s*([^\n]+)/im)?.[1];
  if (goal) return cleanInlineMarkdown(goal);

  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !line || line === '---') continue;
    if (line.startsWith('#') || line.startsWith('>') || line.startsWith('- ') || /^\d+\./.test(line)) continue;
    return cleanInlineMarkdown(line).slice(0, 220);
  }
  return 'Workplan imported from the local Hermes planning folder.';
}

function inferStage(title: string, markdown: string): WorkplanStage {
  const text = `${title}\n${markdown.slice(0, 500)}`.toLowerCase();
  if (/\b(deploy|go-live|launch|shipping|ship it|production)\b/.test(text)) return 'release';
  if (/\b(verify|review|audit|remediation|qa|test|gate|quality)\b/.test(text)) return 'verify';
  if (/\b(scope|boundary|non-goal|requirements?)\b/.test(text)) return 'scope';
  if (/\b(idea|intake|proposal|vision)\b/.test(text)) return 'idea';
  return 'build';
}

function inferRisk(markdown: string): WorkplanRisk {
  const text = markdown.toLowerCase();
  if (/\b(high risk|security|privacy|persondata|sensitive|deploy|live|production|vps|ci\/cd)\b/.test(text)) return 'high';
  if (/\b(medium risk|offline|pwa|validation|api|integration)\b/.test(text)) return 'medium';
  return 'medium';
}

function inferStatus(markdown: string): WorkplanStatus {
  const explicit = markdown.match(/^status:\s*(blocked|completed|complete|active|planned)\s*$/im)?.[1]?.toLowerCase();
  if (explicit === 'blocked') return 'blocked';
  if (explicit === 'completed' || explicit === 'complete') return 'completed';
  if (explicit === 'planned') return 'planned';
  if (explicit === 'active') return 'active';
  if (/^blocked:\s*true\s*$/im.test(markdown)) return 'blocked';
  if (/\b(task|implementation|execute|build|ship|verify|review)\b/i.test(markdown)) return 'active';
  return 'planned';
}

function enumMetadata<T extends string>(value: string | undefined, fallback: T, allowed: readonly T[], label: string): T {
  if (value === undefined) return fallback;
  const parsed = value.toLowerCase() as T;
  if ((allowed as readonly string[]).includes(parsed)) return parsed;
  throw new Error(`Invalid workplan metadata ${label}: ${value}`);
}

function parseStage(value: string | undefined, fallback: WorkplanStage): WorkplanStage {
  return enumMetadata(value, fallback, ['idea', 'scope', 'build', 'verify', 'release'] as const, 'stage');
}

function parseRisk(value: string | undefined, fallback: WorkplanRisk): WorkplanRisk {
  return enumMetadata(value, fallback, ['low', 'medium', 'high'] as const, 'risk');
}

function parseStatus(value: string | undefined, fallback: WorkplanStatus): WorkplanStatus {
  return enumMetadata(value, fallback, ['planned', 'active', 'blocked', 'completed'] as const, 'status');
}

function markdownBeforeFirstTask(markdown: string) {
  const firstTask = markdown.search(/^###\s+Task\s+\d+\s*:/im);
  return firstTask === -1 ? markdown : markdown.slice(0, firstTask);
}

function extractTaskSections(markdown: string): TaskSection[] {
  const headings: Array<{ number: string; title: string; bodyStart: number; headingStart: number }> = [];
  let inFence = false;

  for (const lineMatch of markdown.matchAll(/^.*(?:\r?\n|$)/gm)) {
    const rawLine = lineMatch[0];
    if (!rawLine) continue;
    const headingStart = lineMatch.index ?? 0;
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const headingMatch = line.match(/^###\s+Task\s+(\d+)\s*:\s*(.+)$/i);
    if (!headingMatch) continue;

    headings.push({
      number: headingMatch[1] ?? String(headings.length + 1),
      title: cleanInlineMarkdown(headingMatch[2] ?? `Task ${headings.length + 1}`),
      bodyStart: headingStart + rawLine.length,
      headingStart,
    });
  }

  return headings.map((heading, index) => ({
    number: heading.number,
    title: heading.title,
    body: markdown.slice(heading.bodyStart, headings[index + 1]?.headingStart ?? markdown.length),
  }));
}

function extractSectionMetadata(sectionBody: string): MetadataMap {
  const metadata: MetadataMap = {};
  const lines = sectionBody.split(/\r?\n/);
  let foundMetadata = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (foundMetadata) break;
      continue;
    }
    if (line.startsWith('```') || line.startsWith('**') || /^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) break;

    const match = line.match(/^([A-Za-z][A-Za-z _-]*):\s*(.*)$/);
    if (!match) break;

    const key = metadataKey(match[1] ?? '');
    const value = cleanInlineMarkdown(match[2] ?? '');
    const existing = metadata[key];
    foundMetadata = true;
    if (key === 'evidence') {
      metadata[key] = existing === undefined ? [value] : Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else if (existing === undefined) {
      metadata[key] = value;
    } else {
      throw new Error(`Invalid workplan metadata duplicate ${key}: ${value}`);
    }
  }

  return metadata;
}

function inferTaskStage(title: string, fallback: WorkplanStage): WorkplanStage {
  const lower = title.toLowerCase();
  if (/release|deploy|launch|go-live|final/.test(lower)) return 'release';
  if (/verify|test|review|audit|lint|gate|quality/.test(lower)) return 'verify';
  if (/scope|requirement|boundary/.test(lower)) return 'scope';
  if (/idea|plan|proposal/.test(lower)) return 'idea';
  return fallback;
}

export function parseWorkplanMarkdown({ fileName, relativePath, markdown, updatedAt }: ParseWorkplanOptions): Workplan {
  const metadata = extractLeadingMetadata(markdown);
  const id = slugifyWorkplanId(path.basename(fileName, path.extname(fileName)));
  const title = extractTitle(markdown, fileName);
  const summary = extractSummary(markdown);
  const planPreamble = markdownBeforeFirstTask(markdown);
  const inferredStage = inferStage(title, summary);
  const stage = parseStage(scalarMetadata(metadata, 'stage'), inferredStage);
  const risk = parseRisk(scalarMetadata(metadata, 'risk'), inferRisk(planPreamble));
  const status = parseStatus(scalarMetadata(metadata, 'status'), inferStatus(planPreamble));
  const tasks = extractTaskSections(markdown).map((section) => {
    const taskMetadata = extractSectionMetadata(section.body);
    const taskStage = parseStage(scalarMetadata(taskMetadata, 'stage'), inferTaskStage(section.title, stage));
    const taskRisk = parseRisk(scalarMetadata(taskMetadata, 'risk'), risk);
    return {
      id: `${id}-task-${section.number}`,
      title: section.title,
      status: parseStatus(scalarMetadata(taskMetadata, 'status'), 'planned'),
      stage: taskStage,
      risk: taskRisk,
      owner: scalarMetadata(taskMetadata, 'owner'),
      completedAt: scalarMetadata(taskMetadata, 'completed-at'),
      evidence: evidenceMetadata(taskMetadata),
      sourceHeading: `Task ${section.number}: ${section.title}`,
    };
  });

  return WorkplanSchema.parse({
    id,
    title,
    sourcePath: relativePath.replace(/\\/g, '/'),
    sourceType: 'hermes-plan',
    summary,
    stage,
    risk,
    status,
    owner: scalarMetadata(metadata, 'owner'),
    completedAt: scalarMetadata(metadata, 'completed-at'),
    evidence: evidenceMetadata(metadata),
    taskCount: tasks.length,
    updatedAt: updatedAt ?? new Date().toISOString(),
    tasks,
  });
}

async function readLocalPlanFiles(rootDir: string, plansDir: string): Promise<LocalPlanReadResult> {
  if (!(await pathExists(plansDir))) {
    return { workplans: [], planSourceCount: 0, planSourceHash: hashPlanSources([]), sourceDirectoryExists: false };
  }
  const entries = (await fs.readdir(plansDir)).filter((file) => file.endsWith('.md')).sort((a, b) => a.localeCompare(b, 'nb'));
  const workplans: Workplan[] = [];
  const sourcePayload: Array<{ relativePath: string; markdown: string }> = [];
  for (const fileName of entries) {
    const filePath = path.join(plansDir, fileName);
    const markdown = await fs.readFile(filePath, 'utf8');
    const stat = await fs.stat(filePath);
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    sourcePayload.push({ relativePath, markdown });
    workplans.push(parseWorkplanMarkdown({
      fileName,
      relativePath,
      markdown,
      updatedAt: stat.mtime.toISOString(),
    }));
  }
  return {
    workplans,
    planSourceCount: sourcePayload.length,
    planSourceHash: hashPlanSources(sourcePayload),
    sourceDirectoryExists: true,
  };
}

async function readWorkplansSnapshot(snapshotSourcePath: string): Promise<WorkplansSnapshot | undefined> {
  if (!(await pathExists(snapshotSourcePath))) return undefined;
  return WorkplansSnapshotSchema.parse(JSON.parse(await fs.readFile(snapshotSourcePath, 'utf8')));
}

async function readSnapshotSource(snapshotSourcePath: string): Promise<WorkplansSnapshot | undefined> {
  const snapshot = await readWorkplansSnapshot(snapshotSourcePath);
  if (!snapshot) return undefined;
  const workplans = snapshot.workplans.map((workplan) => WorkplanSchema.parse({ ...workplan, sourceType: workplan.sourceType ?? 'manual-snapshot' }));
  return WorkplansSnapshotSchema.parse({
    ...snapshot,
    sourceCount: workplans.length,
    planSourceCount: snapshot.planSourceCount ?? workplans.length,
    planSourceHash: snapshot.planSourceHash ?? hashSnapshotWorkplans(workplans),
    workplans,
  });
}

async function readManifest(generatedDir: string): Promise<ContentManifest> {
  const manifestPath = path.join(generatedDir, 'manifest.json');
  if (!(await pathExists(manifestPath))) {
    return {
      contentVersion: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      sourceCount: 0,
      actionCardCount: 0,
      checklistCount: 0,
      trainingPathCount: 0,
      protectionMeasureCount: 0,
      glossaryCount: 0,
      faqCount: 0,
      equipmentTaxonomyCount: 0,
      exportTemplateCount: 0,
      imageMetadataCount: 0,
      localOverlayCount: 0,
      changelogCount: 0,
      mustReadCount: 0,
      workplanCount: 0,
      searchSynonymCount: 0,
      copiedAssetCount: 0,
      usedPregeneratedFallback: false,
    };
  }
  return ContentManifestSchema.parse(JSON.parse(await fs.readFile(manifestPath, 'utf8')));
}

function defaultObsidianProjectDir() {
  return process.env.OBSIDIAN_BEREDSKAPSBOKA_PATH ?? path.join(process.env.HOME ?? '', 'Obsidian/Hvelvet/01_Projects/Beredskapsboka');
}

function workplanSectionTitle(status: WorkplanStatus) {
  if (status === 'completed') return 'Fullførte planer';
  if (status === 'blocked') return 'Blokkerte planer';
  return 'Aktive planer';
}

function groupedWorkplans(workplans: Workplan[]) {
  const order = ['Aktive planer', 'Blokkerte planer', 'Fullførte planer'] as const;
  const groups = new Map<(typeof order)[number], Workplan[]>();
  for (const title of order) groups.set(title, []);
  for (const workplan of workplans) {
    const title = workplanSectionTitle(workplan.status);
    groups.get(title)?.push(workplan);
  }
  return order
    .map((title) => ({ title, workplans: groups.get(title) ?? [] }))
    .filter((group) => group.workplans.length > 0);
}

function renderEvidenceLines(evidence: string[] | undefined) {
  return (evidence ?? []).map((line) => `  - Evidence: ${line}`);
}

function renderObsidianWorkplansNote(snapshot: WorkplansSnapshot) {
  const lines = [
    '---',
    `updated: ${snapshot.generatedAt.slice(0, 10)}`,
    'type: workplan-index',
    'project: beredskapsboka',
    'status: active',
    'tags:',
    '  - beredskapsboka',
    '  - workplans',
    '  - release-readiness',
    '---',
    '',
    '# Workplans',
    '',
    'Oppdatert automatisk fra repoets Hermes-planer og speilet til `https://innsats.reidar.tech/release` ved bygg/deploy.',
    '',
    `- Prosjektindeks: [[00-Index]]`,
    `- Live release board: https://innsats.reidar.tech/release`,
    `- Sist planendring: ${snapshot.generatedAt}`,
    `- Antall workplans: ${snapshot.sourceCount}`,
    '',
  ];

  if (snapshot.workplans.length === 0) {
    lines.push('## Aktive planer', '');
    lines.push('Ingen workplans funnet i `.hermes/plans/` eller `content/workplans/workplans.json`.', '');
    return `${lines.join('\n')}\n`;
  }

  for (const group of groupedWorkplans(snapshot.workplans)) {
    lines.push(`## ${group.title}`, '');
    for (const workplan of group.workplans) {
      lines.push(`### ${workplan.title}`);
      lines.push('');
      lines.push(`- Status: ${workplan.status}`);
      lines.push(`- Fase: ${workplan.stage}`);
      lines.push(`- Risiko: ${workplan.risk}`);
      lines.push(`- Kilde: \`${workplan.sourcePath}\``);
      lines.push(`- Oppgaver: ${workplan.taskCount}`);
      lines.push(`- Sammendrag: ${workplan.summary}`);
      if (workplan.completedAt) lines.push(`- Fullført: ${workplan.completedAt}`);
      for (const evidence of workplan.evidence ?? []) lines.push(`- Evidence: ${evidence}`);
      if (workplan.tasks.length > 0) {
        lines.push('', '#### Oppgaver');
        for (const task of workplan.tasks) {
          lines.push(`- ${task.sourceHeading ?? task.title} — \`${task.status}\``);
          if (task.completedAt) lines.push(`  - Fullført: ${task.completedAt}`);
          lines.push(...renderEvidenceLines(task.evidence));
        }
      }
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

async function writeObsidianNote(snapshot: WorkplansSnapshot, obsidianProjectDir: string, explicitPath: boolean) {
  if (!explicitPath && !(await pathExists(obsidianProjectDir))) return undefined;
  await fs.mkdir(obsidianProjectDir, { recursive: true });
  const notePath = path.join(obsidianProjectDir, '20-Workplans.md');
  await fs.writeFile(notePath, renderObsidianWorkplansNote(snapshot), 'utf8');
  return notePath;
}

function latestWorkplanTimestamp(workplans: Workplan[], fallback: string) {
  return workplans.map((workplan) => workplan.updatedAt).sort().at(-1) ?? fallback;
}

function hashPlanSources(sources: Array<{ relativePath: string; markdown: string }>) {
  const stablePayload = JSON.stringify(sources.map((source) => ({
    relativePath: source.relativePath.replace(/\\/g, '/'),
    markdown: source.markdown,
  })));
  return `sha256:${crypto.createHash('sha256').update(stablePayload).digest('hex')}`;
}

function hashSnapshotWorkplans(workplans: Workplan[]) {
  const stablePayload = JSON.stringify(workplans.map((workplan) => ({
    ...workplan,
    sourcePath: workplan.sourcePath.replace(/\\/g, '/'),
  })));
  return `sha256:${crypto.createHash('sha256').update(stablePayload).digest('hex')}`;
}

function describeSnapshotDrift(snapshotSourcePath: string, expectedCount: number, expectedHash: string, actualCount: number | undefined, actualHash: string | undefined) {
  return [
    `Workplan snapshot drift detected in ${snapshotSourcePath}.`,
    `Expected planSourceCount=${expectedCount} and planSourceHash=${expectedHash}.`,
    `Tracked snapshot has planSourceCount=${actualCount ?? 'missing'} and planSourceHash=${actualHash ?? 'missing'}.`,
    'Run npm run sync:workplans and commit content/workplans/workplans.json.',
  ].join(' ');
}

export async function syncWorkplans(options: SyncWorkplansOptions = {}): Promise<SyncWorkplansResult> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const plansDir = path.resolve(options.plansDir ?? repoPath(rootDir, '.hermes/plans'));
  const generatedDir = path.resolve(options.generatedDir ?? repoPath(rootDir, 'content/generated'));
  const publicGeneratedDir = path.resolve(options.publicGeneratedDir ?? repoPath(rootDir, 'public/generated-content'));
  const snapshotSourcePath = path.resolve(options.snapshotSourcePath ?? repoPath(rootDir, 'content/workplans/workplans.json'));
  const runGeneratedAt = options.now ?? new Date().toISOString();
  const mode = options.mode ?? 'write';

  const localPlanSource = await readLocalPlanFiles(rootDir, plansDir);
  const trackedSnapshot = await readSnapshotSource(snapshotSourcePath);
  const hasLocalSource = localPlanSource.sourceDirectoryExists;
  if (!hasLocalSource && !trackedSnapshot) {
    throw new Error(`Workplan snapshot missing at ${snapshotSourcePath}; no local Hermes plans directory found to regenerate it.`);
  }

  const workplans = hasLocalSource ? localPlanSource.workplans : (trackedSnapshot?.workplans ?? []);
  const planSourceCount = hasLocalSource ? localPlanSource.planSourceCount : (trackedSnapshot?.planSourceCount ?? trackedSnapshot?.sourceCount ?? 0);
  const planSourceHash = hasLocalSource ? localPlanSource.planSourceHash : (trackedSnapshot?.planSourceHash ?? hashSnapshotWorkplans(trackedSnapshot?.workplans ?? []));
  const snapshotGeneratedAt = options.now ?? (hasLocalSource ? latestWorkplanTimestamp(workplans, runGeneratedAt) : (trackedSnapshot?.generatedAt ?? runGeneratedAt));
  const snapshot = WorkplansSnapshotSchema.parse({
    generatedAt: snapshotGeneratedAt,
    sourceCount: workplans.length,
    planSourceCount,
    planSourceHash,
    workplans,
  });

  if (mode === 'check') {
    if (hasLocalSource && (!trackedSnapshot || trackedSnapshot.planSourceCount !== planSourceCount || trackedSnapshot.planSourceHash !== planSourceHash)) {
      throw new Error(describeSnapshotDrift(snapshotSourcePath, planSourceCount, planSourceHash, trackedSnapshot?.planSourceCount, trackedSnapshot?.planSourceHash));
    }
    return { snapshot, workplans: snapshot.workplans };
  }

  if (hasLocalSource) await writeJson(snapshotSourcePath, snapshot);
  await writeJson(path.join(generatedDir, 'workplans.json'), snapshot);
  await writeJson(path.join(publicGeneratedDir, 'workplans.json'), snapshot);

  const previous = await readManifest(generatedDir);
  const manifest: ContentManifest = {
    ...previous,
    contentVersion: runGeneratedAt,
    generatedAt: runGeneratedAt,
    workplanCount: snapshot.workplans.length,
  };
  await writeJson(path.join(generatedDir, 'manifest.json'), manifest);
  await writeJson(path.join(publicGeneratedDir, 'manifest.json'), manifest);

  const explicitObsidianPath = options.obsidianProjectDir !== undefined;
  const obsidianProjectDir = path.resolve(options.obsidianProjectDir ?? defaultObsidianProjectDir());
  const obsidianNotePath = await writeObsidianNote(snapshot, obsidianProjectDir, explicitObsidianPath);
  return { snapshot, workplans: snapshot.workplans, obsidianNotePath };
}

async function main() {
  const mode = process.argv.includes('--check') ? 'check' : 'write';
  const result = await syncWorkplans({ mode });
  if (mode === 'check') {
    console.log(`Workplan snapshot fresh (${result.workplans.length} workplans)`);
    return;
  }
  console.log(`Synced ${result.workplans.length} workplans${result.obsidianNotePath ? ` and updated ${result.obsidianNotePath}` : ''}`);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
