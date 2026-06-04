import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

export const LIGHTHOUSE_MOBILE_BUDGET_PATH = path.join(process.cwd(), 'config', 'lighthouse-mobile-budget.json');
export const DEFAULT_LIGHTHOUSE_ROUTE = '/hurtigkort';
export const DEFAULT_LIGHTHOUSE_PORT = 3027;
export const MIN_LIGHTHOUSE_MOBILE_PERFORMANCE_SCORE = 0.4;

type LighthouseResourceType = 'total' | 'document' | 'script' | 'stylesheet' | 'image' | 'media' | 'font' | 'other' | 'third-party';

type LighthouseBudgetEntry = {
  path: string;
  resourceSizes?: Array<{ resourceType: LighthouseResourceType; budget: number }>;
  resourceCounts?: Array<{ resourceType: LighthouseResourceType; budget: number }>;
};

type BudgetFinding = {
  resourceType: LighthouseResourceType;
  metric: 'transferSize' | 'requestCount';
  actual: number;
  budget: number;
};

type LighthouseRunSummary = {
  url: string;
  performanceScore: number;
  budgetFindings: BudgetFinding[];
};

function assertBuildExists(rootDir = process.cwd()) {
  if (!fs.existsSync(path.join(rootDir, '.next', 'standalone', 'server.js'))) {
    throw new Error('No standalone production build found. Run npm run build:app before npm run perf:lighthouse.');
  }
}

export function loadLighthouseBudgets(filePath = LIGHTHOUSE_MOBILE_BUDGET_PATH): LighthouseBudgetEntry[] {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Lighthouse mobile budget file must contain at least one budget entry.');
  return parsed as LighthouseBudgetEntry[];
}

async function assertPortAvailable(port: number, host = '127.0.0.1') {
  await new Promise<void>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') reject(new Error(`LIGHTHOUSE_PORT ${port} is already in use; refusing to audit an unknown server.`));
      else reject(error);
    });
    server.once('listening', () => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    server.listen(port, host);
  });
}

function prepareStandaloneAssets(rootDir = process.cwd()) {
  const standaloneDir = path.join(rootDir, '.next', 'standalone');
  const standalonePublic = path.join(standaloneDir, 'public');
  const standaloneStatic = path.join(standaloneDir, '.next', 'static');
  fs.rmSync(standalonePublic, { recursive: true, force: true });
  fs.rmSync(standaloneStatic, { recursive: true, force: true });
  fs.cpSync(path.join(rootDir, 'public'), standalonePublic, { recursive: true });
  fs.mkdirSync(path.dirname(standaloneStatic), { recursive: true });
  fs.cpSync(path.join(rootDir, '.next', 'static'), standaloneStatic, { recursive: true });
}

function startProductionServer(port: number) {
  const standaloneDir = path.join(process.cwd(), '.next', 'standalone');
  prepareStandaloneAssets();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: standaloneDir,
    detached: true,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NEXT_TELEMETRY_DISABLED: '1',
      ALLOW_PREGENERATED_CONTENT: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout?.on('data', (chunk) => {
    log += String(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    log += String(chunk);
  });
  return { child, getLog: () => log.slice(-4_000) };
}

async function waitForHttp(url: string, getLog: () => string, timeoutMs = 90_000) {
  const startedAt = Date.now();
  let lastError = '';
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Production server did not become ready at ${url}. Last error: ${lastError}\n${getLog()}`);
}

async function stopServer(child: ChildProcess | undefined) {
  if (!child || child.killed || child.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    child.once('exit', done);
    try {
      if (child.pid) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
    setTimeout(() => {
      if (child.exitCode === null) {
        try {
          if (child.pid) process.kill(-child.pid, 'SIGKILL');
          else child.kill('SIGKILL');
        } catch {
          child.kill('SIGKILL');
        }
      }
      resolve();
    }, 2_000).unref();
  });
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function formatLighthouseSummary(summary: LighthouseRunSummary) {
  const percent = Math.round(summary.performanceScore * 100);
  const budget = summary.budgetFindings.length === 0 ? 'pass' : 'fail';
  const lines = [
    `Lighthouse mobile budget for ${summary.url}`,
    `- performance score: ${percent}`,
    `- resource budget checks: ${budget}`,
  ];
  if (summary.budgetFindings.length > 0) {
    lines.push(...summary.budgetFindings.map((finding) => {
      const actual = finding.metric === 'transferSize' ? formatBytes(finding.actual) : String(finding.actual);
      const budgetValue = finding.metric === 'transferSize' ? formatBytes(finding.budget) : String(finding.budget);
      return `  - ${finding.resourceType} ${finding.metric}: ${actual} > ${budgetValue}`;
    }));
  }
  return lines.join('\n');
}

function resourceRows(lhr: { audits: Record<string, { details?: unknown }> }) {
  const details = lhr.audits['resource-summary']?.details as { items?: Array<Record<string, unknown>> } | undefined;
  const rows = new Map<LighthouseResourceType, { transferSize: number; requestCount: number }>();
  for (const item of details?.items ?? []) {
    const resourceType = item.resourceType as LighthouseResourceType | undefined;
    if (!resourceType) continue;
    rows.set(resourceType, {
      transferSize: typeof item.transferSize === 'number' ? item.transferSize : 0,
      requestCount: typeof item.requestCount === 'number' ? item.requestCount : 0,
    });
  }
  return rows;
}

export function evaluateLighthouseBudgets(lhr: { audits: Record<string, { details?: unknown }> }, budgets: LighthouseBudgetEntry[]) {
  const rows = resourceRows(lhr);
  const findings: BudgetFinding[] = [];
  for (const budget of budgets) {
    for (const sizeBudget of budget.resourceSizes ?? []) {
      const actual = rows.get(sizeBudget.resourceType)?.transferSize ?? 0;
      const budgetBytes = sizeBudget.budget * 1024;
      if (actual > budgetBytes) findings.push({ resourceType: sizeBudget.resourceType, metric: 'transferSize', actual, budget: budgetBytes });
    }
    for (const countBudget of budget.resourceCounts ?? []) {
      const actual = rows.get(countBudget.resourceType)?.requestCount ?? 0;
      if (actual > countBudget.budget) findings.push({ resourceType: countBudget.resourceType, metric: 'requestCount', actual, budget: countBudget.budget });
    }
  }
  return findings;
}

async function runLighthouseBudget(url: string) {
  const budgets = loadLighthouseBudgets();
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
    }, {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance'],
        formFactor: 'mobile',
        throttlingMethod: 'simulate',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          disabled: false,
        },
      },
    } as Parameters<typeof lighthouse>[2]);

    if (!result) throw new Error('Lighthouse returned no result.');
    const performanceScore = result.lhr.categories.performance?.score ?? 0;
    const budgetFindings = evaluateLighthouseBudgets(result.lhr, budgets);
    const summary: LighthouseRunSummary = { url, performanceScore, budgetFindings };
    console.log(formatLighthouseSummary(summary));
    const failures: string[] = [];
    if (budgetFindings.length > 0) failures.push('Lighthouse mobile resource budget failed.');
    if (summary.performanceScore < MIN_LIGHTHOUSE_MOBILE_PERFORMANCE_SCORE) {
      failures.push(`Lighthouse mobile performance score ${Math.round(summary.performanceScore * 100)} is below ${Math.round(MIN_LIGHTHOUSE_MOBILE_PERFORMANCE_SCORE * 100)}.`);
    }
    if (failures.length > 0) throw new Error(failures.join('\n'));
  } finally {
    await chrome.kill();
  }
}

async function main() {
  assertBuildExists();
  const port = Number(process.env.LIGHTHOUSE_PORT ?? DEFAULT_LIGHTHOUSE_PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) throw new Error('LIGHTHOUSE_PORT must be a valid TCP port.');
  const url = process.env.LIGHTHOUSE_URL ?? `http://127.0.0.1:${port}${DEFAULT_LIGHTHOUSE_ROUTE}`;
  let server: ReturnType<typeof startProductionServer> | undefined;
  if (!process.env.LIGHTHOUSE_URL) {
    await assertPortAvailable(port);
    server = startProductionServer(port);
    await waitForHttp(url, server.getLog);
  }
  try {
    await runLighthouseBudget(url);
  } finally {
    await stopServer(server?.child);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
