import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';
import { SourceDocumentSchema, type ContentManifest, type SourceDocument } from '@/lib/content/schemas';

const DEFAULT_SOURCE_PATH = process.env.OBSIDIAN_BEREDSKAPSBOKA_PATH ?? '/Users/reidar/Obsidian/Hvelvet/01_Projects/Beredskapsboka';
const GENERIC_ASSET_NAMES = new Set(['i-icon-32.png', 'fullscreen_on.png', 'Attachment.png']);
const DEFAULT_SOURCE_OWNER = 'content-team';
const DEFAULT_SOURCE_REVIEWER = 'fagansvarlig';
const DEFAULT_SOURCE_VERIFIED_AT = '2026-06-03';
const SOURCE_SNAPSHOT_METADATA_FILE = 'source-snapshot-metadata.json';

interface SourceSnapshotMetadata {
  sourceSnapshotGeneratedAt: string;
  sourceSnapshotHash: string;
  sourceCount: number;
}

export interface ImportOptions {
  generatedDir?: string;
  publicAssetsDir?: string;
  publicGeneratedDir?: string;
  minRealSourceCount?: number;
  allowPregenerated?: boolean;
  now?: string | Date;
}

export interface ImportResult {
  sources: SourceDocument[];
  copiedAssets: string[];
  manifest: ContentManifest;
}

function repoPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

function buildTimestamp(now?: string | Date) {
  return now instanceof Date ? now.toISOString() : (now ?? new Date().toISOString());
}

function sourceSnapshotHash(sources: SourceDocument[]) {
  const stablePayload = JSON.stringify(sources.map((source) => ({ ...source })).sort((a, b) => a.id.localeCompare(b.id)));
  return `sha256:${crypto.createHash('sha256').update(stablePayload).digest('hex')}`;
}

function emptyManifest(now: string): ContentManifest {
  return {
    contentVersion: now,
    generatedAt: now,
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
    searchSynonymCount: 0,
    workplanCount: 0,
    copiedAssetCount: 0,
    usedPregeneratedFallback: false,
  };
}

function manifestWithDefaults(previous: ContentManifest | undefined, now: string): ContentManifest {
  const base = emptyManifest(now);
  if (!previous) return base;
  return {
    contentVersion: previous.contentVersion ?? base.contentVersion,
    generatedAt: previous.generatedAt ?? base.generatedAt,
    ...(previous.sourceSnapshotGeneratedAt ? { sourceSnapshotGeneratedAt: previous.sourceSnapshotGeneratedAt } : {}),
    ...(previous.sourceSnapshotHash ? { sourceSnapshotHash: previous.sourceSnapshotHash } : {}),
    usedPregeneratedFallback: previous.usedPregeneratedFallback ?? base.usedPregeneratedFallback,
    sourceCount: previous.sourceCount ?? base.sourceCount,
    actionCardCount: previous.actionCardCount ?? base.actionCardCount,
    checklistCount: previous.checklistCount ?? base.checklistCount,
    trainingPathCount: previous.trainingPathCount ?? base.trainingPathCount,
    protectionMeasureCount: previous.protectionMeasureCount ?? base.protectionMeasureCount,
    glossaryCount: previous.glossaryCount ?? base.glossaryCount,
    faqCount: previous.faqCount ?? base.faqCount,
    equipmentTaxonomyCount: previous.equipmentTaxonomyCount ?? base.equipmentTaxonomyCount,
    exportTemplateCount: previous.exportTemplateCount ?? base.exportTemplateCount,
    imageMetadataCount: previous.imageMetadataCount ?? base.imageMetadataCount,
    localOverlayCount: previous.localOverlayCount ?? base.localOverlayCount,
    changelogCount: previous.changelogCount ?? base.changelogCount,
    mustReadCount: previous.mustReadCount ?? base.mustReadCount,
    searchSynonymCount: previous.searchSynonymCount ?? base.searchSynonymCount,
    workplanCount: previous.workplanCount ?? base.workplanCount,
    copiedAssetCount: previous.copiedAssetCount ?? base.copiedAssetCount,
  };
}

function sourceSnapshotGeneratedAtForHash(currentHash: string, now: string, previous?: ContentManifest, previousSnapshot?: SourceSnapshotMetadata) {
  if (previousSnapshot?.sourceSnapshotHash === currentHash) return previousSnapshot.sourceSnapshotGeneratedAt;
  if (previous?.sourceSnapshotHash === currentHash && previous.sourceSnapshotGeneratedAt) return previous.sourceSnapshotGeneratedAt;
  return now;
}

export function slugifySourceId(stem: string): string {
  const withoutPrefix = stem.replace(/^SRC\s*-\s*/i, '');
  const ascii = withoutPrefix
    .replace(/æ/g, 'ae').replace(/Æ/g, 'ae')
    .replace(/ø/g, 'o').replace(/Ø/g, 'o')
    .replace(/å/g, 'a').replace(/Å/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return `src-${ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

function mapStatus(value: unknown): SourceDocument['status'] {
  const raw = String(value ?? '').toLowerCase();
  if (['verified', 'unverified', 'historical', 'draft', 'expired'].includes(raw)) return raw as SourceDocument['status'];
  if (['old', 'archive', 'archived'].includes(raw)) return 'historical';
  if (['draft', 'new', 'source', ''].includes(raw)) return 'unverified';
  return 'unverified';
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function metadataString(value: unknown): string | undefined {
  if (value instanceof Date) return formatDateOnly(value);
  const raw = String(value ?? '').trim();
  return raw.length > 0 ? raw : undefined;
}

function metadataDate(value: unknown): string | undefined {
  const raw = metadataString(value);
  if (!raw) return undefined;
  const dateOnly = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : undefined;
}

function mapReviewRisk(value: unknown, status: SourceDocument['status']): SourceDocument['reviewRisk'] {
  const raw = String(value ?? '').toLowerCase().trim();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return status === 'verified' ? 'medium' : 'high';
}

function sourceReviewMetadata(data: Record<string, unknown>, status: SourceDocument['status']) {
  const verifiedAt = metadataDate(data.verifiedAt ?? data.verified_at ?? data.reviewedAt ?? data.reviewed_at) ?? DEFAULT_SOURCE_VERIFIED_AT;
  const verifiedDate = new Date(`${verifiedAt}T00:00:00.000Z`);
  const reviewRisk = mapReviewRisk(data.reviewRisk ?? data.review_risk, status);
  const requiresSchedule = reviewRisk === 'high' || ['unverified', 'historical', 'draft', 'expired'].includes(status);
  const reviewAfter = metadataDate(data.reviewAfter ?? data.review_after) ?? (requiresSchedule ? formatDateOnly(addDays(verifiedDate, 90)) : formatDateOnly(addDays(verifiedDate, 180)));
  const expiresAt = metadataDate(data.expiresAt ?? data.expires_at);
  const reviewNotes = metadataString(data.reviewNotes ?? data.review_notes);
  const pilotReviewStatus = metadataString(data.pilotReviewStatus ?? data.pilot_review_status);
  const publicationStatus = metadataString(data.publicationStatus ?? data.publication_status);
  return {
    verifiedAt,
    reviewAfter,
    ...(expiresAt ? { expiresAt } : {}),
    owner: metadataString(data.owner) ?? DEFAULT_SOURCE_OWNER,
    reviewer: metadataString(data.reviewer) ?? DEFAULT_SOURCE_REVIEWER,
    reviewRisk,
    ...(reviewNotes ? { reviewNotes } : {}),
    ...(pilotReviewStatus ? { pilotReviewStatus } : {}),
    ...(publicationStatus ? { publicationStatus } : {}),
  };
}

function normalizeSourceDocument(source: unknown): SourceDocument {
  const draft = source as Record<string, unknown>;
  const status = mapStatus(draft.source_status ?? draft.status);
  return SourceDocumentSchema.parse({
    ...draft,
    status,
    ...sourceReviewMetadata(draft, status),
  });
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readManifest(generatedDir: string): Promise<ContentManifest | undefined> {
  const manifestPath = path.join(generatedDir, 'manifest.json');
  if (!(await pathExists(manifestPath))) return undefined;
  return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
}

async function readSourceSnapshotMetadata(generatedDir: string): Promise<SourceSnapshotMetadata | undefined> {
  const metadataPath = path.join(generatedDir, SOURCE_SNAPSHOT_METADATA_FILE);
  if (!(await pathExists(metadataPath))) return undefined;
  const parsed = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as Partial<SourceSnapshotMetadata>;
  if (!parsed.sourceSnapshotGeneratedAt || !parsed.sourceSnapshotHash || typeof parsed.sourceCount !== 'number') return undefined;
  return {
    sourceSnapshotGeneratedAt: parsed.sourceSnapshotGeneratedAt,
    sourceSnapshotHash: parsed.sourceSnapshotHash,
    sourceCount: parsed.sourceCount,
  };
}

async function writeSourceSnapshotMetadata(generatedDir: string, metadata: SourceSnapshotMetadata) {
  await writeJson(path.join(generatedDir, SOURCE_SNAPSHOT_METADATA_FILE), metadata);
}

async function readPregeneratedImportResult(generatedDir: string, publicGeneratedDir: string, publicAssetsDir: string, now: string): Promise<ImportResult> {
  const sourcePath = path.join(generatedDir, 'source-documents.json');
  if (!(await pathExists(sourcePath))) {
    throw new Error(`Source extract directory is unavailable and ${sourcePath} does not exist`);
  }
  const sources = JSON.parse(await fs.readFile(sourcePath, 'utf8')).map((source: unknown) => normalizeSourceDocument(source));
  if (sources.length === 0) throw new Error(`Pregenerated ${sourcePath} must contain at least one source document`);
  await writeJson(path.join(publicGeneratedDir, 'source-documents.json'), publicSourceDocuments(sources));
  const copiedAssets = (await pathExists(publicAssetsDir)) ? (await fs.readdir(publicAssetsDir)).sort() : [];
  const previous = await readManifest(generatedDir);
  const previousSnapshot = await readSourceSnapshotMetadata(generatedDir);
  const currentSourceSnapshotHash = sourceSnapshotHash(sources);
  const sourceSnapshotGeneratedAt = previous?.sourceSnapshotGeneratedAt ?? previousSnapshot?.sourceSnapshotGeneratedAt;
  const expectedSourceSnapshotHash = previous?.sourceSnapshotHash ?? previousSnapshot?.sourceSnapshotHash;
  if (!sourceSnapshotGeneratedAt) {
    throw new Error('Pregenerated content fallback requires source snapshot metadata so stale source snapshots are not reported as fresh');
  }
  if (expectedSourceSnapshotHash && expectedSourceSnapshotHash !== currentSourceSnapshotHash) {
    throw new Error('Pregenerated source-documents.json does not match source snapshot metadata; regenerate source extracts before fallback');
  }
  const previousManifest = manifestWithDefaults(previous, now);
  const manifest: ContentManifest = {
    ...previousManifest,
    contentVersion: now,
    generatedAt: now,
    sourceSnapshotGeneratedAt,
    sourceSnapshotHash: currentSourceSnapshotHash,
    usedPregeneratedFallback: true,
    sourceCount: sources.length,
    copiedAssetCount: copiedAssets.length,
  };
  await writeSourceSnapshotMetadata(generatedDir, {
    sourceSnapshotGeneratedAt,
    sourceSnapshotHash: currentSourceSnapshotHash,
    sourceCount: sources.length,
  });
  await writeJson(path.join(generatedDir, 'manifest.json'), manifest);
  await writeJson(path.join(publicGeneratedDir, 'manifest.json'), manifest);
  return { sources, copiedAssets, manifest };
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function publicSourceDocument(source: SourceDocument) {
  const body = source.publicationStatus === 'approved-public' ? source.body.slice(0, 12000) : '';
  return { ...source, body };
}

function publicSourceDocuments(sources: SourceDocument[]) {
  return sources.map(publicSourceDocument);
}

function extractAssetRefs(markdown: string): string[] {
  const refs = new Set<string>();
  for (const match of markdown.matchAll(/!\[\[([^\]]+)\]\]/g)) refs.add(match[1]);
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) refs.add(match[1]);
  return [...refs];
}

function normalizeAssetRef(ref: string): string | null {
  const clean = ref.split('|')[0]?.trim().replace(/^<|>$/g, '');
  if (!clean) return null;
  const decoded = decodeURIComponent(clean).replace(/\\/g, '/');
  const marker = 'assets/';
  const idx = decoded.indexOf(marker);
  if (idx < 0) return null;
  const rel = decoded.slice(idx);
  if (!rel.startsWith('assets/images/') && !rel.startsWith('assets/contact-sheets/')) return null;
  return rel;
}

function safeAssetName(rel: string): string {
  return path.basename(rel).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function canonicalSourceRef(fileName: string): string {
  return path.posix.join('source-extracts', fileName);
}

export function redactLocalPathReferences(markdown: string): string {
  return markdown
    .replace(/([A-Za-z]:\\[^\s`)\]]+)/g, '[redigert lokal sti]')
    .replace(/(^|[`"'({\s])\/(?:Users|home|tmp|var\/folders|private|Volumes)\/[^\s`)\]]+/g, '$1[redigert lokal sti]');
}

async function copyApprovedAssets(sourceRoot: string, markdown: string, publicAssetsDir: string) {
  const copied: string[] = [];
  const seenNames = new Set<string>();
  for (const rawRef of extractAssetRefs(markdown)) {
    const rel = normalizeAssetRef(rawRef);
    if (!rel) continue;
    const name = safeAssetName(rel);
    if (GENERIC_ASSET_NAMES.has(name)) continue;
    if (seenNames.has(name)) continue;
    const sourcePath = path.join(sourceRoot, rel);
    if (!(await pathExists(sourcePath))) continue;
    await fs.mkdir(publicAssetsDir, { recursive: true });
    await fs.copyFile(sourcePath, path.join(publicAssetsDir, name));
    seenNames.add(name);
    copied.push(name);
  }
  return copied;
}

export async function importObsidianSources(basePath = DEFAULT_SOURCE_PATH, options: ImportOptions = {}): Promise<ImportResult> {
  const sourceRoot = path.resolve(basePath);
  const isDefaultSourceRoot = sourceRoot === path.resolve(DEFAULT_SOURCE_PATH);
  if (!isDefaultSourceRoot && (!options.generatedDir || !options.publicGeneratedDir || !options.publicAssetsDir)) {
    throw new Error('Non-default source imports must pass generatedDir, publicGeneratedDir, and publicAssetsDir to avoid overwriting repository artifacts');
  }
  const generatedDir = path.resolve(options.generatedDir ?? repoPath('content/generated'));
  const publicAssetsDir = path.resolve(options.publicAssetsDir ?? repoPath('public/content-assets'));
  const publicGeneratedDir = path.resolve(options.publicGeneratedDir ?? repoPath('public/generated-content'));
  const sourceExtractDir = path.join(sourceRoot, 'source-extracts');
  const minRealSourceCount = options.minRealSourceCount ?? (isDefaultSourceRoot ? 61 : 0);
  const now = buildTimestamp(options.now);

  if (!(await pathExists(sourceExtractDir))) {
    if (options.allowPregenerated || process.env.ALLOW_PREGENERATED_CONTENT === '1') {
      return readPregeneratedImportResult(generatedDir, publicGeneratedDir, publicAssetsDir, now);
    }
    throw new Error(`Source extract directory not found: ${sourceExtractDir}`);
  }

  const entries = (await fs.readdir(sourceExtractDir)).filter((file) => file.endsWith('.md')).sort((a, b) => a.localeCompare(b, 'nb'));
  if (entries.length < minRealSourceCount) {
    throw new Error(`Expected at least ${minRealSourceCount} source extracts in ${sourceExtractDir}, found ${entries.length}`);
  }

  const sources: SourceDocument[] = [];
  const allCopiedAssets = new Set<string>();
  for (const file of entries) {
    const sourcePath = path.join(sourceExtractDir, file);
    const raw = await fs.readFile(sourcePath, 'utf8');
    const parsed = matter(raw);
    const stem = path.basename(file, '.md');
    const status = mapStatus(parsed.data.source_status ?? parsed.data.status);
    const source = SourceDocumentSchema.parse({
      id: slugifySourceId(stem),
      title: stem,
      sourcePath: canonicalSourceRef(file),
      sourceType: 'source-extract',
      status,
      ...sourceReviewMetadata(parsed.data, status),
      body: redactLocalPathReferences(parsed.content.trim()),
      warnings: ['Kontroller alltid mot gjeldende offisielt planverk før operativ bruk.'],
    });
    sources.push(source);
    const copied = await copyApprovedAssets(sourceRoot, parsed.content, publicAssetsDir);
    copied.forEach((asset) => allCopiedAssets.add(asset));
  }

  await writeJson(path.join(generatedDir, 'source-documents.json'), sources);
  await writeJson(path.join(publicGeneratedDir, 'source-documents.json'), publicSourceDocuments(sources));
  const previousRawManifest = await readManifest(generatedDir);
  const previousSnapshot = await readSourceSnapshotMetadata(generatedDir);
  const previous = manifestWithDefaults(previousRawManifest, now);
  const currentSourceSnapshotHash = sourceSnapshotHash(sources);
  const sourceSnapshotGeneratedAt = sourceSnapshotGeneratedAtForHash(currentSourceSnapshotHash, now, previousRawManifest, previousSnapshot);
  const manifest: ContentManifest = {
    ...previous,
    contentVersion: now,
    generatedAt: now,
    sourceSnapshotGeneratedAt,
    sourceSnapshotHash: currentSourceSnapshotHash,
    usedPregeneratedFallback: false,
    sourceCount: sources.length,
    copiedAssetCount: allCopiedAssets.size,
  };
  await writeSourceSnapshotMetadata(generatedDir, {
    sourceSnapshotGeneratedAt,
    sourceSnapshotHash: currentSourceSnapshotHash,
    sourceCount: sources.length,
  });
  await writeJson(path.join(generatedDir, 'manifest.json'), manifest);
  await writeJson(path.join(publicGeneratedDir, 'manifest.json'), manifest);
  return { sources, copiedAssets: [...allCopiedAssets].sort(), manifest };
}

async function main() {
  await importObsidianSources();
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
