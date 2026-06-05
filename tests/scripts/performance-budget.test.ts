import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkPerformanceBudget, formatBudgetResult } from '@/scripts/performance-budget';

let tmpDirs: string[] = [];

function makeBuild(files: Record<string, string>, pages: Record<string, string[]>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'beredskapsboka-budget-'));
  tmpDirs.push(root);
  fs.mkdirSync(path.join(root, '.next', 'static', 'chunks'), { recursive: true });
  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = path.join(root, '.next', relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents);
  }
  fs.writeFileSync(path.join(root, '.next', 'build-manifest.json'), JSON.stringify({ pages }, null, 2));
  return root;
}

afterEach(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
  tmpDirs = [];
});

describe('performance budget script', () => {
  it('documents a real Lighthouse mobile budget config alongside the static JS budget', () => {
    const budgets = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config', 'lighthouse-mobile-budget.json'), 'utf8')) as Array<{ resourceSizes?: Array<{ resourceType: string; budget: number }> }>;
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> };

    expect(packageJson.scripts['perf:lighthouse']).toContain('scripts/lighthouse-mobile-budget.ts');
    expect(budgets[0].resourceSizes?.some((budget) => budget.resourceType === 'script' && budget.budget <= 600)).toBe(true);
    expect(budgets[0].resourceSizes?.some((budget) => budget.resourceType === 'total')).toBe(true);
  });

  it('passes small mobile route bundles', () => {
    const root = makeBuild({ 'static/chunks/app.js': 'console.log("small")' }, { '/hurtigkort': ['static/chunks/app.js'] });
    const result = checkPerformanceBudget(root, { maxRouteJsGzipBytes: 1024, maxChunkGzipBytes: 1024, maxOptionalMapRuntimeChunkGzipBytes: 1024 });

    expect(result.ok).toBe(true);
    expect(formatBudgetResult(result)).toContain('Mobile performance budget');
  });

  it('fails oversized route and chunk JavaScript', () => {
    const root = makeBuild({ 'static/chunks/app.js': 'x'.repeat(10_000) }, { '/': ['static/chunks/app.js'] });
    const result = checkPerformanceBudget(root, { maxRouteJsGzipBytes: 20, maxChunkGzipBytes: 20, maxOptionalMapRuntimeChunkGzipBytes: 20 });

    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.label === 'route /')).toBe(true);
    expect(result.findings.some((finding) => finding.label.includes('static/chunks/app.js'))).toBe(true);
  });

  it('allows optional lazy MapLibre or PMTiles runtime chunks under a separate budget', () => {
    const mapRuntimeChunk = Array.from({ length: 160 }, (_value, index) => `maplibre-gl runtime marker ${index}`).join('\n');
    const root = makeBuild(
      {
        'static/chunks/app.js': 'console.log("small route")',
        'static/chunks/map-runtime.js': mapRuntimeChunk,
      },
      { '/kart': ['static/chunks/app.js'] },
    );
    const result = checkPerformanceBudget(root, {
      maxRouteJsGzipBytes: 1024,
      maxChunkGzipBytes: 80,
      maxOptionalMapRuntimeChunkGzipBytes: 1024,
    });

    expect(result.ok).toBe(true);
  });

  it('fails optional lazy map runtime chunks when they exceed their separate budget', () => {
    const mapRuntimeChunk = Array.from({ length: 160 }, (_value, index) => `PMTiles Protocol runtime marker ${index}`).join('\n');
    const root = makeBuild(
      {
        'static/chunks/app.js': 'console.log("small route")',
        'static/chunks/map-runtime.js': mapRuntimeChunk,
      },
      { '/kart': ['static/chunks/app.js'] },
    );
    const result = checkPerformanceBudget(root, {
      maxRouteJsGzipBytes: 1024,
      maxChunkGzipBytes: 80,
      maxOptionalMapRuntimeChunkGzipBytes: 20,
    });

    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.label.includes('static/chunks/map-runtime.js'))).toBe(true);
  });

  it('fails when App Router route-bundle-stats includes MapLibre or PMTiles in first-load chunks', () => {
    const root = makeBuild(
      {
        'static/chunks/app.js': 'console.log("small route")',
        'static/chunks/map-runtime.js': 'maplibre-gl pmtiles app-router first-load runtime',
      },
      { '/_app': ['static/chunks/app.js'] },
    );
    fs.mkdirSync(path.join(root, '.next', 'diagnostics'), { recursive: true });
    fs.writeFileSync(path.join(root, '.next', 'diagnostics', 'route-bundle-stats.json'), JSON.stringify([
      {
        route: '/kart',
        firstLoadUncompressedJsBytes: 1234,
        firstLoadChunkPaths: ['.next/static/chunks/app.js', '.next/static/chunks/map-runtime.js'],
      },
    ], null, 2));
    const result = checkPerformanceBudget(root, {
      maxRouteJsGzipBytes: 1024,
      maxChunkGzipBytes: 1024,
      maxOptionalMapRuntimeChunkGzipBytes: 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => /MapLibre\/PMTiles runtime included in initial route \/kart/i.test(finding.label))).toBe(true);
  });

  it('fails when MapLibre or PMTiles runtime is included in an initial route chunk even under byte budgets', () => {
    const root = makeBuild(
      {
        'static/chunks/app.js': 'console.log("small route")',
        'static/chunks/map-runtime.js': 'maplibre-gl pmtiles initial-route runtime',
      },
      { '/kart': ['static/chunks/app.js', 'static/chunks/map-runtime.js'] },
    );
    const result = checkPerformanceBudget(root, {
      maxRouteJsGzipBytes: 1024,
      maxChunkGzipBytes: 1024,
      maxOptionalMapRuntimeChunkGzipBytes: 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => /MapLibre\/PMTiles runtime included in initial route/i.test(finding.label))).toBe(true);
  });
});
