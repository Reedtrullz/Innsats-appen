import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

type ManifestLike = {
  pages?: Record<string, string[]>;
  polyfillFiles?: string[];
  rootMainFiles?: string[];
  ampDevFiles?: string[];
  lowPriorityFiles?: string[];
};

export type PerformanceBudget = {
  maxRouteJsGzipBytes: number;
  maxChunkGzipBytes: number;
  maxOptionalMapRuntimeChunkGzipBytes: number;
};

export type BudgetFinding = {
  label: string;
  gzipBytes: number;
  budgetBytes: number;
};

const defaultBudget: PerformanceBudget = {
  // Lighthouse-style mobile transfer budget for initial route JavaScript.
  maxRouteJsGzipBytes: 350 * 1024,
  // Guard one unexpectedly heavy client chunk. This keeps PWA/offline UX changes small.
  maxChunkGzipBytes: 180 * 1024,
  // MapLibre/PMTiles is deliberately lazy-loaded only after an approved local package is active.
  // Keep a separate cap so it never hides in the generic initial-route budget.
  maxOptionalMapRuntimeChunkGzipBytes: 320 * 1024,
};

function readJson(filePath: string): ManifestLike | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ManifestLike;
}

function gzipSize(filePath: string) {
  return gzipSync(fs.readFileSync(filePath)).byteLength;
}

function normalizeAssetPath(asset: string) {
  return asset.replace(/^\/_next\//, '').replace(/^_next\//, '');
}

function assetFile(rootDir: string, asset: string) {
  const normalized = normalizeAssetPath(asset);
  if (normalized.startsWith('static/')) return path.join(rootDir, '.next', normalized);
  return path.join(rootDir, '.next', normalized);
}

function routeEntries(manifest: ManifestLike | null) {
  const pageEntries = Object.entries(manifest?.pages ?? {})
    .map(([route, assets]) => ({ route, assets: assets.filter((asset) => asset.endsWith('.js')) }))
    .filter((entry) => entry.assets.length > 0);
  const sharedAssets = [...(manifest?.polyfillFiles ?? []), ...(manifest?.rootMainFiles ?? [])].filter((asset) => asset.endsWith('.js'));
  if (sharedAssets.length > 0) pageEntries.push({ route: 'app shell shared', assets: sharedAssets });
  return pageEntries;
}

function isOptionalMapRuntimeChunk(filePath: string) {
  const contents = fs.readFileSync(filePath, 'utf8');
  return /\b(?:maplibre-gl|pmtiles|MapLibre|PMTiles)\b/.test(contents);
}

export function checkPerformanceBudget(rootDir = process.cwd(), budget = defaultBudget) {
  const manifests = [
    readJson(path.join(rootDir, '.next', 'build-manifest.json')),
    readJson(path.join(rootDir, '.next', 'app-build-manifest.json')),
  ].filter(Boolean) as ManifestLike[];

  if (manifests.length === 0) {
    throw new Error('No .next build manifests found. Run npm run build:app before npm run perf:budget.');
  }

  const chunksDir = path.join(rootDir, '.next', 'static', 'chunks');
  const chunkEntries = (fs.existsSync(chunksDir) ? fs.readdirSync(chunksDir, { recursive: true, encoding: 'utf8' }) : []) as string[];
  const chunkFiles = chunkEntries
    .filter((entry) => entry.endsWith('.js'))
    .map((entry) => path.join(chunksDir, entry));

  const findings: BudgetFinding[] = [];
  const summaries: BudgetFinding[] = [];
  const routeAssetFiles = new Set<string>();

  for (const manifest of manifests) {
    for (const entry of routeEntries(manifest)) {
      const files = [...new Set(entry.assets.map((asset) => assetFile(rootDir, asset)).filter((file) => fs.existsSync(file)))];
      for (const file of files) routeAssetFiles.add(file);
      for (const file of files) {
        if (isOptionalMapRuntimeChunk(file)) {
          findings.push({
            label: `MapLibre/PMTiles runtime included in initial route ${entry.route}: ${path.relative(rootDir, file)}`,
            gzipBytes: gzipSize(file),
            budgetBytes: 0,
          });
        }
      }
      const gzipBytes = files.reduce((sum, file) => sum + gzipSize(file), 0);
      const summary = { label: `route ${entry.route}`, gzipBytes, budgetBytes: budget.maxRouteJsGzipBytes };
      summaries.push(summary);
      if (gzipBytes > budget.maxRouteJsGzipBytes) findings.push(summary);
    }
  }

  for (const file of chunkFiles) {
    const gzipBytes = gzipSize(file);
    const optionalMapRuntime = !routeAssetFiles.has(file) && isOptionalMapRuntimeChunk(file);
    const budgetBytes = optionalMapRuntime ? budget.maxOptionalMapRuntimeChunkGzipBytes : budget.maxChunkGzipBytes;
    if (gzipBytes > budgetBytes) {
      findings.push({ label: path.relative(rootDir, file), gzipBytes, budgetBytes });
    }
  }

  return {
    ok: findings.length === 0,
    findings,
    summaries: summaries.sort((a, b) => b.gzipBytes - a.gzipBytes).slice(0, 10),
    budget,
  };
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function formatBudgetResult(result: ReturnType<typeof checkPerformanceBudget>) {
  const lines = [
    `Mobile performance budget: route JS <= ${formatBytes(result.budget.maxRouteJsGzipBytes)} gzip, individual chunk <= ${formatBytes(result.budget.maxChunkGzipBytes)} gzip, optional map runtime chunk <= ${formatBytes(result.budget.maxOptionalMapRuntimeChunkGzipBytes)} gzip`,
    'Largest route JS entries:',
    ...result.summaries.map((summary) => `- ${summary.label}: ${formatBytes(summary.gzipBytes)} gzip`),
  ];
  if (!result.ok) {
    lines.push('Budget failures:');
    lines.push(...result.findings.map((finding) => `- ${finding.label}: ${formatBytes(finding.gzipBytes)} > ${formatBytes(finding.budgetBytes)}`));
  }
  return lines.join('\n');
}

async function main() {
  const result = checkPerformanceBudget();
  console.log(formatBudgetResult(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
