import type { R2Bucket, R2ObjectBody } from '@cloudflare/workers-types';
import { GET as getHealth } from '../app/api/health/route';
import { GET as getGeocode } from '../app/api/context/geocode/route';
import { GET as getHazards } from '../app/api/context/hazards/route';
import { GET as getWeather } from '../app/api/context/weather/route';

const MAP_KEYS: Record<string, string> = {
  '/map-packages/trondheim-osm.pmtiles': 'map-packages/trondheim-osm.pmtiles',
  '/map-packages/trondelag-osm.pmtiles': 'map-packages/trondelag-osm.pmtiles',
};

type MapBucket = Pick<R2Bucket, 'get' | 'head'>;

export async function serveMapPackage(request: Request, bucket: MapBucket): Promise<Response | null> {
  const key = MAP_KEYS[new URL(request.url).pathname];
  if (!key) return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  const range = request.headers.get('range');
  const metadata = range || request.method === 'HEAD' ? await bucket.head(key) : null;
  if (metadata === null && (range || request.method === 'HEAD')) return new Response(null, { status: 404 });

  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (!match || (match[1] === '' && match[2] === ''))) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${metadata!.size}` } });
  }

  const size = metadata?.size ?? 0;
  const start = match ? (match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))) : 0;
  const end = match ? (match[2] && match[1] ? Math.min(size - 1, Number(match[2])) : size - 1) : 0;
  if (match && (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size || (match[1] && !Number.isSafeInteger(Number(match[1]))) || (match[2] && !Number.isSafeInteger(Number(match[2]))))) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }

  const object = request.method === 'HEAD'
    ? metadata
    : await bucket.get(key, match ? { range: { offset: start, length: end - start + 1 } } : undefined);
  if (!object) return new Response(null, { status: 404 });

  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Content-Type': 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400',
    ETag: object.httpEtag,
    'Content-Length': String(match ? end - start + 1 : object.size),
  });
  if (match) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  return new Response(request.method === 'HEAD' ? null : (object as R2ObjectBody).body as unknown as ReadableStream, {
    status: match ? 206 : 200,
    headers,
  });
}

const worker = {
  async fetch(request: Request, env: { MAP_PACKAGES: R2Bucket; ASSETS: { fetch(request: Request): Promise<Response> } }) {
    const mapPackage = await serveMapPackage(request, env.MAP_PACKAGES);
    if (mapPackage) return mapPackage;
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith('/api/')) {
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
      if (pathname === '/api/health') return getHealth();
      if (pathname === '/api/context/geocode') return getGeocode(request);
      if (pathname === '/api/context/hazards') return getHazards(request);
      if (pathname === '/api/context/weather') return getWeather(request);
      return new Response(null, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};

export default worker;
