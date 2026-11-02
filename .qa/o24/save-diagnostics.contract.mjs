import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as probe from './browser-probe.mjs';

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
  assert.deepEqual(Object.keys(out[0]), ['path', 'status', 'encodedBytes', 'encoding', 'complete', 'fault']);
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
  assert.deepEqual(out[0], { path: PMT, status: null, encodedBytes: null, encoding: null, complete: null, fault: 'unavailable' });
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

test('warning listener is installed before the save boundary and removed on both paths', () => {
  assert(/page\.on\('console', onConsole\);\n  const saveBoundary/.test(source));
  assert.equal(source.match(/page\.off\('console', onConsole\)/g)?.length, 2);
});
