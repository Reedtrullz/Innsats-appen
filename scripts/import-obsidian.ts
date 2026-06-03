import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';
import { SourceDocumentSchema, type ContentManifest, type SourceDocument } from '@/lib/content/schemas';

const DEFAULT_SOURCE_PATH = process.env.OBSIDIAN_BEREDSKAPSBOKA_PATH ?? '/Users/reidar/Obsidian/Hvelvet/01_Projects/Beredskapsboka';
const GENERIC_ASSET_NAMES = new Set(['i-icon-32.png', 'fullscreen_on.png', 'Attachment.png']);

export interface ImportOptions {
  generatedDir?: string;
  publicAssetsDir?: string;
  publicGeneratedDir?: string;
  minRealSourceCount?: number;
}

export interface ImportResult {
  sources: SourceDocument[];
  copiedAssets: string[];
  manifest: ContentManifest;
}

function repoPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
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

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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
      copiedAssetCount: 0,
    };
  }
  return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
}

async function readPregeneratedImportResult(generatedDir: string, publicGeneratedDir: string, publicAssetsDir: string): Promise<ImportResult> {
  const sourcePath = path.join(generatedDir, 'source-documents.json');
  if (!(await pathExists(sourcePath))) {
    throw new Error(`Source extract directory is unavailable and ${sourcePath} does not exist`);
  }
  const sources = JSON.parse(await fs.readFile(sourcePath, 'utf8')).map((source: unknown) => SourceDocumentSchema.parse(source));
  if (sources.length === 0) throw new Error(`Pregenerated ${sourcePath} must contain at least one source document`);
  await writeJson(path.join(publicGeneratedDir, 'source-documents.json'), sources.map((source: SourceDocument) => ({ ...source, body: source.body.slice(0, 12000) })));
  const copiedAssets = (await pathExists(publicAssetsDir)) ? (await fs.readdir(publicAssetsDir)).sort() : [];
  const previous = await readManifest(generatedDir);
  const now = new Date().toISOString();
  const manifest: ContentManifest = {
    ...previous,
    contentVersion: now,
    generatedAt: now,
    sourceCount: sources.length,
    copiedAssetCount: copiedAssets.length,
  };
  await writeJson(path.join(generatedDir, 'manifest.json'), manifest);
  await writeJson(path.join(publicGeneratedDir, 'manifest.json'), manifest);
  return { sources, copiedAssets, manifest };
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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

  if (!(await pathExists(sourceExtractDir))) {
    if (process.env.ALLOW_PREGENERATED_CONTENT === '1') {
      return readPregeneratedImportResult(generatedDir, publicGeneratedDir, publicAssetsDir);
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
    const source = SourceDocumentSchema.parse({
      id: slugifySourceId(stem),
      title: stem,
      sourcePath: canonicalSourceRef(file),
      sourceType: 'source-extract',
      status: mapStatus(parsed.data.source_status ?? parsed.data.status),
      body: redactLocalPathReferences(parsed.content.trim()),
      warnings: ['Kontroller alltid mot gjeldende offisielt planverk før operativ bruk.'],
    });
    sources.push(source);
    const copied = await copyApprovedAssets(sourceRoot, parsed.content, publicAssetsDir);
    copied.forEach((asset) => allCopiedAssets.add(asset));
  }

  await writeJson(path.join(generatedDir, 'source-documents.json'), sources);
  await writeJson(path.join(publicGeneratedDir, 'source-documents.json'), sources.map((source) => ({ ...source, body: source.body.slice(0, 12000) })));
  const previous = await readManifest(generatedDir);
  const now = new Date().toISOString();
  const manifest: ContentManifest = {
    ...previous,
    contentVersion: now,
    generatedAt: now,
    sourceCount: sources.length,
    copiedAssetCount: allCopiedAssets.size,
  };
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
