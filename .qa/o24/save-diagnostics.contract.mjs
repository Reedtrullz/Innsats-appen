import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { createServer, request as httpRequest } from 'node:http';
import test from 'node:test';
import { register } from 'node:module';
import vm from 'node:vm';
import * as probe from './browser-probe.mjs';
import { startFixture } from './http-fixture.mjs';

const { mapAssetRows, logMapAssetRows, requestBoundary } = probe;
const PMT = '/map-packages/trondheim-osm.pmtiles';
const STYLE = '/map-packages/trondheim-osm-style.json';
const source = readFileSync(new URL('./browser-probe.mjs', import.meta.url), 'utf8');

// Maps the deleted observer tests (fetch/Cache wrapper, sync throw, cap, thenable) to this absence check.
test('no promise/fetch/Cache observer remains in the probe', () => {
  for (const banned of ['installRejectionCapture', 'addInitScript', '__o24Rejections', 'Cache.prototype', '.then(', 'reportSaveFailure', 'withinOneSecond'])
    assert(!source.includes(banned), banned);
  assert.equal(probe.installRejectionCapture, undefined);
  assert.equal(probe.reportSaveFailure, undefined);
});

test('original DOM diagnostic block keeps its single one-second deadline and rethrows the original error', () => {
  assert.equal(source.match(/setTimeout\(\(\) => reject\(new Error\('Map diagnostic exceeded one second'\)\), 1000\)/g)?.length, 1);
  assert.equal(source.match(/map-administration-status/g)?.length, 1);
  assert(/logMapAssetRows\(evidence\.fixture, saveBoundary\);[\s\S]*o24-map-save-failure[\s\S]*o24-map-save-diagnostic-failure[\s\S]*finally \{ clearTimeout\(timer\); \}\n    throw error;/.test(source));
  assert(/const saveBoundary = requestBoundary\(evidence\.fixture\);\n  await page\.getByRole\('button', \{ name: 'Lagre valgt kartpakke lokalt'[^\n]*\.click\(\);/.test(source));
});

test('save boundary: only rows recorded after the boundary are exported, pre-existing map-load rows excluded', () => {
  const requests = [{ path: PMT, status: 200 }, { path: STYLE, status: 200 }];
  const boundary = requestBoundary({ state: { requests } });
  assert.equal(boundary, 2);
  requests.push({ path: PMT, status: 500 }, { path: '/other', status: 1 }, { path: STYLE, status: 503 });
  assert.deepEqual(mapAssetRows({ state: { requests } }, boundary).map(r => r.status), [500, 503]);
});

test('save boundary: no rows after the boundary gives an empty list, not older rows', () => {
  const requests = [{ path: PMT, status: 200 }, { path: STYLE, status: 200 }];
  assert.deepEqual(mapAssetRows({ state: { requests } }, 2), []);
});

test('save boundary: still capped to the latest four after the boundary', () => {
  const requests = [{ path: PMT, status: 1 }];
  for (let i = 0; i < 6; i++) requests.push({ path: i % 2 ? PMT : STYLE, status: 500 + i });
  assert.deepEqual(mapAssetRows({ state: { requests } }, 1).map(r => r.status), [502, 503, 504, 505]);
});

test('save boundary: invalid boundary is unavailable (null), never fabricated old rows', () => {
  const fixture = { state: { requests: [{ path: PMT, status: 200 }] } };
  for (const bad of [-1, 1.5, NaN, '0', null, 2]) assert.equal(mapAssetRows(fixture, bad), null, String(bad));
  assert.equal(requestBoundary(null), null);
  assert.equal(requestBoundary({}), null);
  assert.equal(mapAssetRows(fixture, undefined).length, 1);
});

test('selects the LATEST four rows for the two map assets only, in order', () => {
  const rows = [{ path: '/api/x', status: 200 }];
  for (let i = 1; i <= 7; i++) rows.push({ path: i % 2 ? PMT : STYLE, status: 400 + i, encodedBytes: i, encoding: 'br', complete: true, fault: null });
  rows.push({ path: '/other', status: 1 });
  const out = mapAssetRows({ state: { requests: rows } });
  assert.deepEqual(out.map(r => r.status), [404, 405, 406, 407]);
  assert.deepEqual(Object.keys(out[0]), ['path', 'status', 'encodedBytes', 'encoding', 'complete', 'fault', 'saveId']);
  assert(out.every(r => r.path === PMT || r.path === STYLE));
});

test('does not mutate fixture rows or the request array', () => {
  const requests = [{ path: PMT, status: 200, encodedBytes: 1, encoding: 'gzip', complete: true, fault: null }];
  const before = JSON.stringify(requests);
  mapAssetRows({ state: { requests } });
  assert.equal(JSON.stringify(requests), before);
});

test('malformed values become null/unavailable, never fabricated', () => {
  const out = mapAssetRows({ state: { requests: [{ path: PMT, status: 'bad', encodedBytes: -1, encoding: 5, complete: 'yes', fault: {} }] } });
  assert.deepEqual(out[0], { path: PMT, status: null, encodedBytes: null, encoding: null, complete: null, fault: 'unavailable', saveId: null });
  assert.equal(mapAssetRows(null), null);
  assert.equal(mapAssetRows({}), null);
});

test('throwing getters skip or degrade a row without throwing', () => {
  const bad = { get path() { throw new Error('p'); } };
  const half = { path: STYLE, get status() { throw new Error('s'); } };
  const out = mapAssetRows({ state: { requests: [bad, half, { path: PMT, status: 200 }] } });
  assert.equal(out.length, 2);
  assert.equal(out[0].fault, 'unavailable'); assert.equal(out[0].status, null);
  assert.equal(out[1].status, 200);
});

test('privacy: query paths, raw error messages and extra fields are never exported', () => {
  const out = mapAssetRows({ state: { requests: [
    { path: PMT + '?token=abc', status: 200 },
    { path: PMT, status: 500, fault: 'connect failed token=abc secret', encoding: 'x'.repeat(99), query: 'secret', headers: { authorization: 'secret' } },
    { path: STYLE, status: 500, fault: 'ECONNRESET' }] } });
  assert.equal(out.length, 2);
  assert.equal(out[0].fault, 'unavailable'); assert.equal(out[0].encoding, null); assert.equal(out[1].fault, 'ECONNRESET');
  assert(!/token|secret|authorization/.test(JSON.stringify(out)));
});

test('logged line is valid JSON within 4096 bytes', () => {
  const lines = [];
  logMapAssetRows({ state: { requests: Array.from({ length: 9 }, () => ({ path: PMT, status: 200, fault: 'F'.repeat(32), encoding: 'x'.repeat(16) })) } }, undefined, line => lines.push(line));
  assert.equal(lines.length, 1); assert(lines[0].length <= 4096);
  assert.equal(JSON.parse(lines[0]).kind, 'o24-map-save-http');
  assert.equal(JSON.parse(lines[0]).rows.length, 4);
});

test('a throwing logger or broken fixture never masks the primary failure', () => {
  const primary = new Error('primary');
  const run = () => { try { throw primary; } catch (error) { logMapAssetRows(undefined, undefined, () => { throw new Error('log'); }); logMapAssetRows({ get state() { throw new Error('x'); } }, undefined, () => { throw new Error('log'); }); throw error; } };
  assert.throws(run, e => e === primary);
});

test('warning recorder keeps approved classes only, ignores forged tags/names/secrets, caps at four', () => {
  const classes = [];
  const { recordSaveWarning } = probe;
  recordSaveWarning(classes, 'warning', '[offline-map-cache] save-failed QuotaExceededError');
  recordSaveWarning(classes, 'warning', '[offline-map-cache] save-failed SyntheticPrivateSentinelError');
  recordSaveWarning(classes, 'warning', '[offline-map-cache] save-failed TypeError token=secret');
  recordSaveWarning(classes, 'warning', 'x [offline-map-cache] save-failed TypeError');
  recordSaveWarning(classes, 'error', '[offline-map-cache] save-failed TypeError');
  recordSaveWarning(classes, 'warning', { toString() { return '[offline-map-cache] save-failed TypeError'; } });
  assert.deepEqual(classes, ['QuotaExceededError']);
  for (let i = 0; i < 6; i++) recordSaveWarning(classes, 'warning', '[offline-map-cache] save-failed UnknownError');
  assert.deepEqual(classes, ['QuotaExceededError', 'UnknownError', 'UnknownError', 'UnknownError']);
});

function fakePage({ click, waitFor, evidence }) {
  const page = new EventEmitter();
  const emit = (type, text) => page.emit('console', { type: () => type, text: () => text });
  const warn = text => emit('warning', '[offline-map-cache] save-failed ' + text);
  const node = { filter: () => node, locator: () => node, waitFor, isVisible: async () => true, selectOption: async () => warn('QuotaExceededError'), click: () => click(warn, emit) };
  Object.assign(page, {
    goto: async () => {}, waitForFunction: async () => {}, evaluate: async () => ({ status: 'x' }),
    getByLabel: () => node, getByRole: () => node, getByTestId: () => node, getByText: () => node,
  });
  return { page, warn, evidence: { fixture: { state: { requests: [] } }, pageErrors: [] } };
}

async function lifecycle(options) {
  const { page, evidence } = fakePage(options);
  const lines = [], original = console.error, timers = () => process.getActiveResourcesInfo().filter(n => n === 'Timeout').length;
  const before = timers();
  console.error = line => lines.push(line);
  let result;
  try { result = await probe.saveMap(page, evidence).then(() => null, error => error); } finally { console.error = original; }
  assert.equal(page.listenerCount('console'), 0);
  assert.equal(timers(), before);
  return { result, lines };
}

test('saveMap success: listener removed, nothing logged', async () => {
  const { result, lines } = await lifecycle({ click: async () => {}, waitFor: async () => {} });
  assert.equal(result, null); assert.deepEqual(lines, []);
});

test('saveMap status failure: original error rethrown, listener removed, only current bounded approved classes logged', async () => {
  const primary = new Error('status');
  const { result, lines } = await lifecycle({
    click: async warn => { warn('TypeError'); warn('SyntheticPrivateSentinelError'); for (let i = 0; i < 5; i++) warn('RangeError'); },
    waitFor: async () => { throw primary; } });
  assert.equal(result, primary);
  const classes = JSON.parse(lines.find(l => l.includes('o24-map-save-warning-classes'))).classes;
  assert.deepEqual(classes, ['TypeError', 'RangeError', 'RangeError', 'RangeError']);
  assert(!lines.join().includes('Synthetic'));
});

test('saveMap click failure: original error rethrown and listener removed', async () => {
  const primary = new Error('click');
  const { result } = await lifecycle({ click: async warn => { warn('TypeError'); throw primary; }, waitFor: async () => {} });
  assert.equal(result, primary);
});

test('phase recorder keeps only exact finite rows, rejects forged/mismatched ones, caps at four', () => {
  const rows = [];
  const tag = '[offline-map-cache] save-phase ';
  const { recordSavePhase } = probe;
  recordSavePhase(rows, 'warning', tag + 'fetch TypeError');
  recordSavePhase(rows, 'warning', tag + 'put QuotaExceededError varyStar=true bodyUsed=false bodyLocked=true');
  for (const bad of [tag + 'put TypeError', tag + 'fetch TypeError varyStar=true bodyUsed=false bodyLocked=false', tag + 'put Weird varyStar=true bodyUsed=false bodyLocked=false',
    tag + 'other TypeError', tag + 'fetch TypeError token=secret', 'x ' + tag + 'fetch TypeError', tag + 'put TypeError varyStar=1 bodyUsed=false bodyLocked=false', { toString: () => tag + 'fetch TypeError' }])
    recordSavePhase(rows, 'warning', bad);
  recordSavePhase(rows, 'error', tag + 'fetch TypeError');
  assert.deepEqual(rows, [{ phase: 'fetch', errorClass: 'TypeError' }, { phase: 'put', errorClass: 'QuotaExceededError', varyStar: true, bodyUsed: false, bodyLocked: true }]);
  for (let i = 0; i < 6; i++) recordSavePhase(rows, 'warning', tag + 'read Error');
  assert.equal(rows.length, 4);
});

function correlationLine(id, layer, operation, errorClass = 'TypeError', reason = 'UNKNOWN') {
  return '[offline-map-cache] save-corr ' + id + ' ' + layer + ' ' + operation + ' ' + errorClass + ' range=false varyStar=true prePutBodyUsed=false prePutBodyLocked=false reason=' + reason;
}

function loadServiceWorker(fetchImpl, putImpl, source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), match = async () => undefined) {
  const warnings = [];
  const handlers = new Map();
  const puts = [];
  vm.runInNewContext(source, {
    console: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    self: {
      location: new URL('https://example.test/'),
      clients: { matchAll: async () => [] },
      registration: { waiting: null },
      skipWaiting() {},
      addEventListener: (type, handler) => handlers.set(type, handler),
    },
    caches: {
      open: async () => ({ match, put: async (request, response) => { puts.push([request, response]); return putImpl(request, response); } }),
      keys: async () => [],
      delete: async () => true,
    },
    fetch: fetchImpl,
    Headers, Request, Response, URL, Date, JSON, Promise, Set, ReadableStream,
  });
  return { warnings, handlers, puts };
}

async function runFetch(handlers, request) {
  const responded = [];
  handlers.get('fetch')({ request, respondWith: promise => responded.push(promise) });
  return responded[0];
}

const BASELINE_SW = new URL('../../../../../../.omo/operations/innsats-o24-correlated-save-20261102/source/before/public/sw.js', import.meta.url);
const F325_SW = new URL('../../../../../../.omo/operations/innsats-o24-correlated-save-20261102/source-corrective/before/public/sw.js', import.meta.url);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const FINITE_RANGE_TRACE = /^\[offline-map-cache\] save-corr 7 sw range-response TypeError range=(true|false) varyStar=(true|false) prePutBodyUsed=(true|false) prePutBodyLocked=(true|false) reason=(FAILED_TO_FETCH|NETWORK_ERROR|ABORTED|UNKNOWN)$/;

async function rangedBodyOracle(source) {
  const bodyError = Object.assign(new TypeError('O24_RANGE_BODY'), { name: 'TypeError' });
  const cached = new Response(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), { status: 200, headers: { 'content-type': 'application/octet-stream' } });
  const sw = loadServiceWorker(
    async () => new Response(new ReadableStream({ pull(controller) { controller.error(bodyError); } }), { status: 200, headers: { 'content-type': 'application/octet-stream' } }),
    async () => {},
    source,
    async () => cached.clone(),
  );
  const request = new Request('https://example.test/map-packages/trondheim-osm.pmtiles', { headers: { range: 'bytes=0-3', 'x-o24-save': '7' } });
  try {
    const response = await runFetch(sw.handlers, request);
    return { outcome: 'response', status: response.status, bytes: (await response.arrayBuffer()).byteLength, warnings: sw.warnings };
  } catch (error) {
    return { outcome: 'reject', same: error === bodyError, warnings: sw.warnings };
  }
}

test('fresh ranged body error keeps its identity when a cached archive exists', async () => {
  const baseline = readFileSync(BASELINE_SW);
  const f325 = readFileSync(F325_SW);
  const corrected = readFileSync(new URL('../../public/sw.js', import.meta.url));
  assert.equal(sha256(baseline), '6aae727a73236b9613baffefc57e7f5ea81dbce8df7dd722422a45f55753bcd7');
  assert.equal(sha256(f325), '91960c5193ac2ba116133ee34ae96c5ce002f590d646e2513e667efe929c4557');
  assert.notEqual(sha256(corrected), sha256(f325));
  const original = await rangedBodyOracle(baseline.toString('utf8'));
  const regressed = await rangedBodyOracle(f325.toString('utf8'));
  const candidate = await rangedBodyOracle(corrected.toString('utf8'));
  assert.deepEqual({ outcome: original.outcome, same: original.same }, { outcome: 'reject', same: true });
  assert.deepEqual({ outcome: regressed.outcome, status: regressed.status, bytes: regressed.bytes }, { outcome: 'response', status: 206, bytes: 4 });
  assert.deepEqual({ outcome: candidate.outcome, same: candidate.same }, { outcome: 'reject', same: true });
  assert.equal(candidate.warnings.length, 1);
  assert.match(candidate.warnings[0], FINITE_RANGE_TRACE);
  assert.equal(candidate.warnings[0].includes('O24_RANGE_BODY'), false);
  const loader = 'export async function resolve(specifier, context, nextResolve) { if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\\.(?:js|mjs|cjs|json|ts|tsx|node)$/.test(specifier)) return nextResolve(specifier + ".ts", context); return nextResolve(specifier, context); }';
  const registered = register('data:text/javascript,' + encodeURIComponent(loader));
  if (registered && registered.then) await registered;
  const { buildServiceWorkerSource } = await import('../../scripts/build-service-worker.ts');
  assert.equal(buildServiceWorkerSource(corrected.toString('utf8')), corrected.toString('utf8'));
});

test('first accepted save correlation keeps the capacity snapshot taken then, not the later UI wait', async () => {
  const home = process.env.HOME;
  const secret = 'SECRET_UNMATCHED_TEXT';
  const primary = new Error('status');
  const accepted = correlationLine(4, 'sw', 'range-response');
  try {
    const { result, lines } = await lifecycle({
      click: async (_warn, emit) => {
        process.env.HOME = '';
        emit('warning', 'malformed ' + secret);
        emit('warning', correlationLine(4, 'sw', 'not-an-op'));
        emit('error', accepted);
        process.env.HOME = home;
        emit('warning', accepted);
        process.env.HOME = '';
        emit('warning', correlationLine(3, 'sw', 'fetch'));
        for (let i = 0; i < 5; i++) emit('warning', correlationLine(4, 'sw', 'clone', 'TypeError', 'ABORTED'));
      },
      waitFor: async () => { throw primary; },
    });
    assert.equal(result, primary);
    const capacity = JSON.parse(lines.find(line => line.includes('o24-map-save-capacity')));
    assert.notEqual(capacity.atFirstError, null);
    assert.notEqual(capacity.atFirstError.profile, null);
    assert.equal(Number.isSafeInteger(capacity.atFirstError.profile.capacityBytes), true);
    assert.equal(Number.isSafeInteger(capacity.atFirstError.profile.freeBytes), true);
    assert.equal(capacity.atFailure.profile, null);
    assert.notDeepEqual(capacity.atFirstError, capacity.atFailure);
    const recorded = JSON.parse(lines.find(line => line.includes('o24-map-save-correlation')));
    assert.equal(recorded.saveId, 4);
    assert.equal(recorded.rows.length, 4);
    assert.equal(lines.join('\n').includes(secret), false);
    assert.equal(JSON.stringify(capacity).includes('/'), false);
    assert.equal(JSON.stringify(capacity).includes(String(home)), false);
  } finally {
    if (home === undefined) delete process.env.HOME;
    else process.env.HOME = home;
  }
});

test('correlation: one save id across page, worker and proxy, pre-put flags, and rejected raw text', async () => {
  const cache = await import('../../lib/maps/map-package-cache.ts');
  const mapPackage = { url: '/map-packages/trondheim-osm.pmtiles', styleUrl: '/map-packages/trondheim-osm-style.json' };
  const secret = Object.assign(new TypeError('SECRET https://user:pass@private.example/a?token=1'), { name: 'TypeError' });
  const calls = [];
  const puts = [];
  let traced;
  let thrown;
  try {
    await cache.cacheLocalMapPackageAssets(mapPackage, {
      saveId: 7,
      caches: { open: async () => ({ put: async (url, response) => {
        puts.push({ url, beforeUsed: response.bodyUsed, beforeLocked: response.body.locked });
        await response.arrayBuffer();
        puts[0].afterUsed = response.bodyUsed;
        throw secret;
      } }) },
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { vary: 'accept-encoding, *' } });
      },
      onProgress: () => {},
      onTrace: record => { traced = record; },
    });
  } catch (error) { thrown = error; }
  assert.equal(thrown, secret);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { url: mapPackage.url, init: { headers: { 'x-o24-save': '7' } } });
  assert.equal(puts[0].url, mapPackage.url);
  assert.equal(puts[0].beforeUsed, false);
  assert.equal(puts[0].afterUsed, true);
  assert.equal(traced.prePutBodyUsed, false);
  assert.equal(traced.prePutBodyLocked, false);
  assert.equal(traced.varyStar, true);
  assert.equal(traced.rangePresent, false);
  assert.equal(traced.reason, 'UNKNOWN');
  assert.equal(traced.bodyUsed, undefined);
  assert.equal(JSON.stringify(traced).includes('SECRET'), false);

  const fetchError = Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' });
  let fetchTrace;
  let fetchThrown;
  const fetchCalls = [];
  try {
    await cache.cacheLocalMapPackageAssets(mapPackage, {
      saveId: 1000000,
      caches: { open: async () => ({ put: async () => {} }) },
      fetchImpl: async (url, init) => { fetchCalls.push(init); throw fetchError; },
      onProgress: () => {},
      onTrace: record => { fetchTrace = record; },
    });
  } catch (error) { fetchThrown = error; }
  assert.equal(fetchThrown, fetchError);
  assert.deepEqual(fetchCalls, [undefined]);
  assert.equal(fetchTrace.saveId, undefined);
  assert.equal(fetchTrace.phase, 'fetch');
  assert.equal(cache.finiteReasonCode(fetchError), 'FAILED_TO_FETCH');
  assert.equal(cache.finiteReasonCode({ get message() { throw new Error('SECRET'); } }), 'UNKNOWN');

  const allowedFetchError = Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' });
  let allowedTrace;
  let allowedThrown;
  const allowedCalls = [];
  try {
    await cache.cacheLocalMapPackageAssets(mapPackage, {
      saveId: 8,
      caches: { open: async () => ({ put: async () => {} }) },
      fetchImpl: async (url, init) => { allowedCalls.push(init); throw allowedFetchError; },
      onProgress: () => {},
      onTrace: record => { allowedTrace = record; },
    });
  } catch (error) { allowedThrown = error; }
  assert.equal(allowedThrown, allowedFetchError);
  assert.equal(allowedCalls.length, 1);
  assert.equal(allowedTrace.operation, 'fetch');
  assert.equal(allowedTrace.reason, 'FAILED_TO_FETCH');
  assert.equal(allowedTrace.prePutBodyUsed, false);

  const putError = Object.assign(new TypeError('body secret'), { name: 'TypeError' });
  let swThrown;
  const sw = loadServiceWorker(async () => new Response(new Uint8Array([9, 8, 7]), { status: 200, headers: { vary: '*' } }), async (_request, response) => {
    await response.arrayBuffer();
    throw putError;
  });
  const swRequest = new Request('https://example.test/map-packages/trondheim-osm.pmtiles', { headers: { 'x-o24-save': '7' } });
  try { await runFetch(sw.handlers, swRequest); } catch (error) { swThrown = error; }
  assert.equal(swThrown, putError);
  assert.equal(sw.puts.length, 1);
  assert.equal(sw.puts[0][0], swRequest);
  assert.equal(sw.warnings.length, 1);
  assert.equal(sw.warnings[0], correlationLine(7, 'sw', 'cache-put'));
  assert.equal(sw.warnings.join('').includes('secret'), false);

  const quota = Object.assign(new Error('quota secret'), { name: 'QuotaExceededError' });
  const swallowed = loadServiceWorker(async () => new Response(new Uint8Array([1]), { status: 200 }), async () => { throw quota; });
  const swallowedResponse = await runFetch(swallowed.handlers, new Request('https://example.test/map-packages/trondheim-osm.pmtiles', { headers: { 'x-o24-save': '7' } }));
  assert.equal(swallowedResponse.status, 200);
  assert.deepEqual(swallowed.warnings, []);
  assert.equal((await swallowedResponse.arrayBuffer()).byteLength, 1);

  const bare = loadServiceWorker(async () => { throw secret; }, async () => {});
  let bareThrown;
  try { await runFetch(bare.handlers, new Request('https://example.test/map-packages/trondheim-osm.pmtiles')); } catch (error) { bareThrown = error; }
  assert.equal(bareThrown, secret);
  assert.deepEqual(bare.warnings, []);

  const body = Buffer.from('pmtiles-bytes');
  const seenIds = [];
  const upstream = createServer((incoming, outgoing) => {
    const raw = incoming.headers['x-o24-save'];
    seenIds.push(typeof raw === 'string' && /^[1-9][0-9]{0,5}$/.test(raw) ? Number(raw) : null);
    outgoing.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': String(body.length) });
    outgoing.end(body);
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const address = upstream.address();
  const fixture = await startFixture(address.port);
  try {
    const send = (headers) => new Promise((resolve, reject) => {
      const outgoing = httpRequest({ hostname: '127.0.0.1', port: new URL(fixture.origin).port, path: '/map-packages/trondheim-osm.pmtiles', method: 'GET', headers }, response => {
        const parts = [];
        response.on('data', part => parts.push(part));
        response.once('end', () => resolve(Buffer.concat(parts)));
        response.once('error', reject);
      });
      outgoing.once('error', reject);
      outgoing.end();
    });
    const plainBody = await send({});
    const taggedBody = await send({ 'x-o24-save': '42' });
    const badBody = await send({ 'x-o24-save': '42 SECRET' });
    assert.deepEqual(plainBody, body);
    assert.deepEqual(taggedBody, body);
    assert.deepEqual(badBody, body);
    assert.deepEqual(seenIds, [null, 42, null]);
    const rows = probe.mapAssetRows(fixture);
    assert.deepEqual(rows.map(row => row.saveId), [null, 42, null]);
    assert.equal(JSON.stringify(rows).includes('SECRET'), false);
    assert.equal(JSON.stringify(fixture.state.requests).includes('SECRET'), false);
    assert.equal(fixture.state.requests.length, 3);
  } finally {
    await fixture.close();
    await new Promise((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()));
  }

  const state = { current: 0, rows: [] };
  probe.recordSaveCorrelation(state, 'warning', correlationLine(3, 'page', 'fetch', 'TypeError', 'FAILED_TO_FETCH'));
  probe.recordSaveCorrelation(state, 'warning', correlationLine(3, 'page', 'fetch') + ' token=secret');
  probe.recordSaveCorrelation(state, 'warning', '[offline-map-cache] save-corr 3 page cache-put TypeError range=false varyStar=false prePutBodyUsed=false prePutBodyLocked=false reason=UNKNOWN');
  probe.recordSaveCorrelation(state, 'warning', { toString: () => correlationLine(3, 'page', 'fetch') });
  probe.recordSaveCorrelation(state, 'warning', correlationLine(9, 'sw', 'fetch', 'TypeError', 'NETWORK_ERROR'));
  probe.recordSaveCorrelation(state, 'warning', correlationLine(3, 'page', 'put'));
  assert.equal(state.current, 9);
  assert.equal(state.rows.length, 1);
  assert.equal(state.rows[0].reason, 'NETWORK_ERROR');
  for (let i = 0; i < 6; i++) probe.recordSaveCorrelation(state, 'warning', correlationLine(9, 'sw', 'clone', 'TypeError', 'ABORTED'));
  assert.equal(state.rows.length, 4);
  assert.equal(JSON.stringify(state).includes('secret'), false);

  const capacity = probe.ownedCapacity();
  const encoded = JSON.stringify(capacity);
  assert.equal(encoded.includes('/'), false);
  assert.equal(encoded.includes('HOME'), false);
  for (const side of [capacity.profile, capacity.scratch]) {
    if (side) {
      assert.equal(Number.isSafeInteger(side.capacityBytes), true);
      assert.equal(Number.isSafeInteger(side.freeBytes), true);
      assert.equal(side.freeBytes <= side.capacityBytes, true);
    }
  }
});
