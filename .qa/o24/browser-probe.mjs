import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { startFixture, controlBody, controlGzip } from './http-fixture.mjs';
import { exerciseAdverse, waitForMapHydration } from './browser-adverse.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const illustrations = [2, 3].map(index => `/content-assets/docx_7.7-Opplringsplan-for-beredskapsvakt-ved-sivilforsvarsdistriktene__image${index}.png`);

async function startApp(root) {
  const standalone = path.join(root, '.next/standalone');
  const server = spawn(process.execPath, [path.join(standalone, 'server.js')], {
    cwd: standalone, env: { ...process.env, PORT: '32100', HOSTNAME: '127.0.0.1', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  const exited = once(server, 'exit');
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Next readiness exceeded 30 seconds')), 30000);
    const finish = callback => { clearTimeout(timer); callback(); };
    for (const stream of [server.stdout, server.stderr]) stream.on('data', bytes => {
      logs += bytes.toString();
      if (Buffer.byteLength(logs) > 16384) finish(() => reject(new Error('Next output exceeded 16 KiB')));
      if (/Ready in/.test(logs)) finish(resolve);
    });
    server.once('error', error => finish(() => reject(error)));
    server.once('exit', code => finish(() => reject(new Error(`Next exited before readiness: ${code}`))));
  });
  async function close() {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill('SIGTERM');
      const timer = setTimeout(() => server.kill('SIGKILL'), 3000);
      try { await exited; } finally { clearTimeout(timer); }
    }
    assert(server.exitCode !== null || server.signalCode !== null, 'Unreaped Next process');
  }
  try { await ready; }
  catch (error) { await close(); throw error; }
  return { close, logs: () => logs };
}

export async function serviceWorkerReady(page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 30000 });
}

export async function cacheBodies(page) {
  return page.evaluate(async () => {
    const rows = [];
    for (const name of (await caches.keys()).sort()) {
      const cache = await caches.open(name);
      let bytes = 0;
      const requests = await cache.keys();
      for (const request of requests) {
        const response = await cache.match(request);
        if (!response) throw new Error('Cache changed during body accounting');
        bytes += (await response.arrayBuffer()).byteLength;
      }
      rows.push({ name, entries: requests.length, bodyBytes: bytes });
    }
    return rows;
  });
}

const mapAssetPaths = ['/map-packages/trondheim-osm.pmtiles', '/map-packages/trondheim-osm-style.json'];

const text = (value, max, pattern) => (typeof value === 'string' && value.length <= max && pattern.test(value) ? value : null);
const count = value => (Number.isSafeInteger(value) && value >= 0 ? value : null);

// Number of fixture rows recorded so far; null when unavailable.
export function requestBoundary(fixture) {
  try { return count(fixture.state.requests.length); } catch { return null; }
}

// Synchronous, read-only view of rows the fixture recorded at or after index `start`: latest 4 for the two map assets.
// An invalid start yields null (unavailable) instead of older rows.
export function mapAssetRows(fixture, start = 0) {
  try {
    if (!Number.isSafeInteger(start) || start < 0 || start > fixture.state.requests.length) return null;
    const rows = [];
    const all = fixture.state.requests;
    for (let i = start; i < all.length; i++) { const row = all[i]; try { if (mapAssetPaths.includes(row.path)) rows.push(row); } catch { /* skip unreadable row */ } }
    return rows.slice(-4).map(row => {
      try {
        return { path: row.path, status: count(row.status), encodedBytes: count(row.encodedBytes), encoding: text(row.encoding, 16, /^[a-z0-9-]*$/),
          complete: typeof row.complete === 'boolean' ? row.complete : null,
          fault: row.fault == null ? null : (text(row.fault, 32, /^[A-Za-z0-9_-]+$/) ?? 'unavailable') };
      } catch { return { path: row?.path ?? null, status: null, encodedBytes: null, encoding: null, complete: null, fault: 'unavailable' }; }
    });
  } catch { return null; }
}

export function logMapAssetRows(fixture, start, log = console.error) {
  try { log(JSON.stringify({ kind: 'o24-map-save-http', rows: mapAssetRows(fixture, start) }).slice(0, 4096)); } catch { /* logging must not mask the save failure */ }
}

async function saveMap(page, evidence) {
  await page.goto('/data-pa-enheten');
  await waitForMapHydration(page, evidence);
  await page.getByLabel('Velg lokal kartpakke', { exact: true }).selectOption('trondheim-osm');
  const saveBoundary = requestBoundary(evidence.fixture);
  await page.getByRole('button', { name: 'Lagre valgt kartpakke lokalt', exact: true }).click();
  try {
    await page.getByTestId('offline-map-cache-status').filter({ hasText: 'Lagret lokalt: Trondheim lokal' }).waitFor();
  } catch (error) {
    logMapAssetRows(evidence.fixture, saveBoundary);
    // The app catches cache errors; retain its actual status before propagating this failed assertion.
    let timer;
    try {
      const diagnostic = await Promise.race([
        page.evaluate(async () => ({
          status: document.querySelector('[data-testid="map-administration-status"]')?.textContent?.slice(0, 1000),
          cached: document.querySelector('[data-testid="offline-map-cache-status"]')?.textContent?.slice(0, 1000),
          storage: await navigator.storage.estimate(),
          caches: await Promise.all((await caches.keys()).map(async name => ({ name, entries: (await (await caches.open(name)).keys()).length }))),
        })),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Map diagnostic exceeded one second')), 1000); }),
      ]);
      console.error(JSON.stringify({ kind: 'o24-map-save-failure', diagnostic }).slice(0, 4096));
    } catch (diagnosticError) {
      console.error(JSON.stringify({ kind: 'o24-map-save-diagnostic-failure', message: String(diagnosticError) }).slice(0, 4096));
    } finally { clearTimeout(timer); }
    throw error;
  }
  await page.goto('/kart');
  await page.getByText('Lokal kartpakke aktiv: Trondheim lokal (OSM-utdrag).', { exact: true }).waitFor();
  assert(await page.getByTestId('offline-maplibre-container').locator('canvas').isVisible(), 'No real map canvas');
}

async function observe(config, phase, scenario) {
  const root = config.roots[phase];
  assert(path.isAbsolute(root) && ['baseline', 'candidate'].includes(phase));
  assert(['desktop', 'mobile'].includes(config.viewport) && ['closed', 'open'].includes(config.map));
  assert(['cold', 'warm'].includes(config.temperature) && ['qualify', 'measure'].includes(config.mode));
  const { chromium } = createRequire(new URL('../package.json', import.meta.url))('playwright-core');
  const app = await startApp(root);
  let fixture, context;
  const cleanup = { browserClosed: false, httpClosed: false, appReaped: false };
  try {
    fixture = await startFixture(32100);
    fixture.state.optionalChunks = new Set(config.optionalChunks[phase]);
    context = await chromium.launchPersistentContext(path.join(process.env.HOME, 'profile'), {
      executablePath: config.browser, headless: true, acceptDownloads: false,
      viewport: config.viewport === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      isMobile: config.viewport === 'mobile', hasTouch: config.viewport === 'mobile',
      baseURL: fixture.origin, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    context.setDefaultTimeout(15000);
    context.setDefaultNavigationTimeout(15000);
    const pageErrors = [];
    context.on('page', page => page.on('pageerror', error => pageErrors.push(error.message)));
    const page = await context.newPage();
    await page.goto(`${fixture.origin}/__o24_wire_control`);
    assert.equal((await page.locator('body').innerText()).trimEnd(), controlBody.toString().trimEnd());
    await page.waitForLoadState('networkidle');
    const control = fixture.snapshot().requests.filter(row => row.path === '/__o24_wire_control');
    assert.equal(control.length, 1, 'Missing/duplicate wire control');
    assert.equal(control[0].encodedBytes, controlGzip.length, 'Encoded wire control failed');
    fixture.reset();

    if (config.temperature === 'warm') {
      await page.goto('/'); await serviceWorkerReady(page);
      if (config.map === 'open') await saveMap(page, { fixture, pageErrors });
      await page.waitForLoadState('networkidle');
      fixture.reset();
    }
    if (scenario === 'failure') {
      const adverse = await exerciseAdverse({ page, context, fixture, measure: config.mode === 'measure', pageErrors });
      const semanticDigest = await sourceContentDigest(page, root);
      await page.waitForLoadState('networkidle');
      return { ...adverse, semanticDigest,
        network: config.mode === 'measure' ? fixture.snapshot(['chunk-failure', 'interrupted-update']) : null,
        offlineCache: config.mode === 'measure' ? await cacheBodies(page) : null,
        expectedFaults: fixture.state.requests.filter(row => row.fault).map(row => ({ path: row.path, fault: row.fault })) };
    }
    assert.equal(scenario, 'happy');
    const routeStart = config.mode === 'measure' ? performance.now() : null;
    await page.goto('/');
    await page.getByRole('heading', { name: 'Hva trenger du nå', exact: true }).waitFor();
    const routeMs = routeStart === null ? null : performance.now() - routeStart;
    const interactionStart = config.mode === 'measure' ? performance.now() : null;
    await page.locator('a[href="/sok"]:visible').first().click();
    await page.getByRole('heading', { name: 'Søk i tiltak, kilder og moduler', exact: true }).waitFor();
    const interactionMs = interactionStart === null ? null : performance.now() - interactionStart;
    await serviceWorkerReady(page);
    const assets = [];
    for (const url of illustrations) {
      const actual = await page.evaluate(async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Illustration status ${response.status}`);
        return Array.from(new Uint8Array(await response.arrayBuffer()));
      }, url);
      assert.equal(sha(Buffer.from(actual)), sha(readFileSync(path.join(root, 'public', url))), 'Served asset source mismatch');
      assets.push(url);
    }
    if (config.map === 'open') await saveMap(page, { fixture, pageErrors });
    await page.waitForLoadState('networkidle');
    const semanticDigest = await sourceContentDigest(page, root);
    await page.waitForLoadState('networkidle');
    const network = config.mode === 'measure' ? fixture.snapshot() : null;
    const onlineCache = config.mode === 'measure' ? await cacheBodies(page) : null;
    await context.setOffline(true);
    try {
      const offlineStart = config.mode === 'measure' ? performance.now() : null;
      await page.goto('/');
      await page.getByRole('heading', { name: 'Hva trenger du nå', exact: true }).waitFor();
      const offlineMs = offlineStart === null ? null : performance.now() - offlineStart;
      if (config.map === 'open') {
        await page.goto('/kart');
        await page.getByText('Lokal kartpakke aktiv: Trondheim lokal (OSM-utdrag).', { exact: true }).waitFor();
      }
      assert.deepEqual(pageErrors, [], 'Unexpected application error');
      return { semanticDigest, semantics: { viewport: config.viewport, map: config.map, temperature: config.temperature,
        heading: 'Hva trenger du nå', search: 'Søk i tiltak, kilder og moduler', assets, offline: true },
        routeMs, interactionMs, offlineMs, network, onlineCache,
        offlineCache: config.mode === 'measure' ? await cacheBodies(page) : null };
    } finally { await context.setOffline(false); }
  } finally {
    try { if (context) await context.close(); cleanup.browserClosed = true; }
    finally {
      try { if (fixture) await fixture.close(); cleanup.httpClosed = true; }
      finally { await app.close(); cleanup.appReaped = true; }
    }
    assert(Object.values(cleanup).every(Boolean), 'Incomplete browser fixture cleanup');
  }
}

async function sourceContentDigest(page, root) {
  const bytes = await page.evaluate(async () => {
    const response = await fetch('/generated-content/manifest.json');
    if (!response.ok || response.headers.get('x-beredskapsboka-generated-fallback') === '1') throw new Error('Source manifest is unavailable');
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  const actual = sha(Buffer.from(bytes));
  assert.equal(actual, sha(readFileSync(path.join(root, 'public/generated-content/manifest.json'))), 'Generated source manifest differs from browser response');
  return actual;
}

async function main() {
  const [file, phase, scenario] = process.argv.slice(2);
  assert(file && phase && scenario && path.isAbsolute(file), 'Literal config/phase/scenario required');
  const config = JSON.parse(readFileSync(file, 'utf8'));
  assert(['qualify', 'measure'].includes(config.mode));
  const request = config.mode === 'measure' ? JSON.parse(process.env.MEASURE_REQUEST ?? 'null') : null;
  if (config.mode === 'measure') {
    assert(request && request.phase === phase && request.scenario === scenario && /^[a-f0-9]{64}$/.test(request.caseHash), 'Missing native request');
    const definition = JSON.parse(readFileSync(config.case, 'utf8'));
    assert.equal(definition[phase].revision, request.revision, 'Frozen source revision mismatch');
    assert.equal(definition.harness[process.argv[1]], sha(readFileSync(process.argv[1])), 'Unbound browser harness');
    assert.equal(sha(readFileSync(config.protocol)), config.protocolSha256, 'Changed frozen protocol');
  }
  const observation = await observe(config, phase, scenario);
  const { semanticDigest } = observation;
  if (config.mode === 'qualify') {
    console.log(JSON.stringify({ status: 'qualified', phase, scenario, semanticDigest, observation,
      cleanup: 'Browser, HTTP sockets and Next child closed; outer namespace must independently prove zero survivors' }));
    return;
  }
  assert.equal(semanticDigest, config.semanticDigest, 'Actual browser semantics changed');
  assert(observation.network && observation.offlineCache, 'Missing measured observations');
  const values = { routeMs: observation.routeMs, interactionMs: observation.interactionMs,
    offlineMs: observation.offlineMs, networkBytes: observation.network.encodedBytes,
    cacheBodyBytes: observation.offlineCache.reduce((sum, row) => sum + row.bodyBytes, 0),
    cacheVersionCount: observation.offlineCache.length };
  const metrics = Object.fromEntries(Object.entries(values).map(([name, value]) => {
    assert(Number.isFinite(value) && value >= 0, `Missing/invalid actual metric ${name}`);
    return [name, { scope: 'invocation', unit: name.endsWith('Ms') ? 'ms' : name.endsWith('Bytes') ? 'bytes' : 'count', values: [value] }];
  }));
  console.log(JSON.stringify({ ...request, status: 'complete', semanticDigest, capabilities: config.capabilities, metrics,
    observation, cleanup: 'Browser, HTTP sockets and Next child closed; namespace cleanup must independently pass' }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1; });
