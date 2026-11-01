import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync } from 'node:zlib';

export const controlBody = Buffer.from('o24-wire-control\n'.repeat(1024));
export const controlGzip = gzipSync(controlBody);

// Count encoded response bodies at the actual loopback HTTP boundary, including SW fetches.
export async function startFixture(upstreamPort) {
  assert(Number.isInteger(upstreamPort) && upstreamPort > 0 && upstreamPort < 65536);
  const state = { mode: 'current', optionalChunks: new Set(), requests: [], pending: 0 };
  const sockets = new Set();
  const server = createServer((incoming, outgoing) => {
    const path = new URL(incoming.url ?? '/', 'http://127.0.0.1').pathname;
    const row = { path, status: 0, encodedBytes: 0, encoding: '', complete: false, fault: null };
    state.requests.push(row);
    state.pending++;
    outgoing.once('close', () => { state.pending--; });
    outgoing.on('error', error => { row.fault = error.code ?? error.message; });
    if (path === '/__o24_wire_control') {
      row.status = 200; row.encodedBytes = controlGzip.length; row.encoding = 'gzip';
      outgoing.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Encoding': 'gzip', 'Content-Length': controlGzip.length, 'Cache-Control': 'no-store' });
      outgoing.end(controlGzip, () => { row.complete = true; });
      return;
    }
    if ((state.mode === 'chunk-failure' && state.optionalChunks.has(path)) ||
        (state.mode === 'interrupted-update' && path.startsWith('/generated-content/'))) {
      row.fault = state.mode;
      outgoing.destroy();
      return;
    }
    const upstream = request({ hostname: '127.0.0.1', port: upstreamPort, path: incoming.url,
      method: incoming.method, headers: incoming.headers }, response => {
      row.status = response.statusCode ?? 0;
      row.encoding = String(response.headers['content-encoding'] ?? 'identity');
      const oldWorker = state.mode === 'previous-version' && path === '/sw.js';
      if (oldWorker) {
        const parts = [];
        response.on('data', part => parts.push(part));
        response.once('end', () => {
          const encoded = Buffer.concat(parts);
          assert(['identity', 'gzip', 'br'].includes(row.encoding), 'Unsupported SW content encoding');
          const actual = (row.encoding === 'gzip' ? gunzipSync(encoded) : row.encoding === 'br' ? brotliDecompressSync(encoded) : encoded).toString('utf8');
          assert(actual.includes("const SW_CACHE_VERSION = 'v7';"), 'Unexpected SW version');
          const decoded = Buffer.from(actual.replace("const SW_CACHE_VERSION = 'v7';", "const SW_CACHE_VERSION = 'o24-authored-previous';"));
          const body = row.encoding === 'gzip' ? gzipSync(decoded) : row.encoding === 'br' ? brotliCompressSync(decoded) : decoded;
          const headers = { ...response.headers, 'content-length': String(body.length), 'cache-control': 'no-store' };
          delete headers['transfer-encoding'];
          outgoing.writeHead(row.status, headers);
          row.encodedBytes = body.length;
          outgoing.end(body, () => { row.complete = true; });
        });
      } else {
        outgoing.writeHead(row.status, response.headers);
        response.on('data', part => { row.encodedBytes += part.length; });
        response.once('end', () => { row.complete = true; });
        response.pipe(outgoing);
      }
      response.once('error', error => { row.fault = error.code ?? error.message; outgoing.destroy(error); });
    });
    upstream.once('error', error => { row.fault = error.code ?? error.message; outgoing.destroy(error); });
    outgoing.once('close', () => { if (!upstream.destroyed) upstream.destroy(); });
    incoming.pipe(upstream);
  });
  server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  assert(address && typeof address === 'object');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    state,
    reset() { assert.equal(state.pending, 0, 'Cannot reset while a response is in flight'); state.requests.length = 0; },
    snapshot(allowedFaults = []) {
      assert.equal(state.pending, 0, 'Incomplete wire observation');
      assert(state.requests.every(row => (row.complete && !row.fault) || allowedFaults.includes(row.fault)), 'Failed/partial HTTP response in measured interval');
      return { encodedBytes: state.requests.reduce((sum, row) => sum + row.encodedBytes, 0),
        requests: state.requests.map(row => ({ ...row })) };
    },
    async close() {
      const closed = [...sockets].map(socket => new Promise(resolve => { socket.once('close', resolve); socket.destroy(); }));
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      await Promise.all(closed);
      assert.equal(sockets.size, 0);
    },
  };
}
