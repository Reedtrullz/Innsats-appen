import assert from 'node:assert/strict';
import { createServer, get } from 'node:http';
import test from 'node:test';
import { gzipSync, gunzipSync } from 'node:zlib';
import { controlBody, controlGzip, startFixture } from './http-fixture.mjs';

async function read(url) {
  return new Promise((resolve, reject) => {
    get(url, response => {
      const parts = [];
      response.on('data', part => parts.push(part));
      response.once('end', () => resolve(Buffer.concat(parts)));
      response.once('error', reject);
    }).once('error', reject);
  });
}

test('counts actual encoded bytes while forwarding the unmodified response', async () => {
  // Given a real local origin serving an already encoded response.
  const upstream = createServer((_, response) => {
    response.writeHead(200, { 'Content-Encoding': 'gzip', 'Content-Length': controlGzip.length });
    response.end(controlGzip);
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const address = upstream.address();
  assert(address && typeof address === 'object');
  const fixture = await startFixture(address.port);
  try {
    // When the browser-facing boundary carries the response.
    const body = await read(`${fixture.origin}/asset`);
    // Then decoded equality and actual encoded bytes are independently checked.
    assert.deepEqual(gunzipSync(body), controlBody);
    assert.equal(fixture.snapshot().encodedBytes, controlGzip.length);
    assert(controlGzip.length < controlBody.length);
    fixture.reset();
    assert.equal(fixture.snapshot().encodedBytes, 0);
  } finally {
    try { await fixture.close(); }
    finally { await new Promise((resolve, reject) => upstream.close(error => error ? reject(error) : resolve())); }
  }
});

test('rejects a partial wire observation instead of reporting successful zero bytes', async () => {
  // Given a declared fault at the optional-chunk boundary.
  const fixture = await startFixture(32100);
  fixture.state.mode = 'chunk-failure';
  fixture.state.optionalChunks.add('/optional.js');
  try {
    // When the real HTTP connection is interrupted.
    await assert.rejects(read(`${fixture.origin}/optional.js`), { code: 'ECONNRESET' });
    // Then the incomplete observation cannot become a performance metric.
    assert.throws(() => fixture.snapshot(), /Failed\/partial/);
  } finally { await fixture.close(); }
});

test('uses the real gzip SW response for the explicitly authored previous-version fixture', async () => {
  // Given encoded SW source with a version and unrelated content to preserve.
  const source = "const SW_CACHE_VERSION = 'v7';\nself.unchanged = 'original';\n";
  const encoded = gzipSync(source);
  const upstream = createServer((_, response) => {
    response.writeHead(200, { 'Content-Encoding': 'gzip', 'Content-Length': encoded.length });
    response.end(encoded);
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const address = upstream.address();
  assert(address && typeof address === 'object');
  const fixture = await startFixture(address.port);
  fixture.state.mode = 'previous-version';
  try {
    // When the authored prior version is requested through the actual HTTP boundary.
    const body = await read(`${fixture.origin}/sw.js`);
    // Then only the declared literal changes, compression and wire accounting remain real.
    assert.equal(gunzipSync(body).toString(), source.replace("'v7'", "'o24-authored-previous'"));
    assert.equal(fixture.snapshot().encodedBytes, body.length);
  } finally {
    try { await fixture.close(); }
    finally { await new Promise((resolve, reject) => upstream.close(error => error ? reject(error) : resolve())); }
  }
});
