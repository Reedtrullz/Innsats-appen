import { describe, expect, it, vi } from 'vitest';
import type { R2Bucket } from '@cloudflare/workers-types';

vi.mock('vinext/server/fetch-handler', () => ({ default: { fetch: vi.fn() } }));

import { serveMapPackage } from './index';

describe('R2 map package delivery', () => {
  it('streams requested bytes with PMTiles range headers', async () => {
    const bytes = new TextEncoder().encode('abcdefgh');
    const bucket = {
      head: vi.fn(async () => ({ size: bytes.length, httpEtag: '"fixture"' })),
      get: vi.fn(async (_key: string, options: { range: { offset: number; length: number } }) => ({
        size: bytes.length,
        httpEtag: '"fixture"',
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(bytes.slice(options.range.offset, options.range.offset + options.range.length));
            controller.close();
          },
        }),
      })),
    } as unknown as R2Bucket;
    const request = new Request('https://example.com/map-packages/trondheim-osm.pmtiles', {
      headers: { Range: 'bytes=2-5' },
    });

    const response = await serveMapPackage(request, bucket);
    expect(response?.status).toBe(206);
    expect(response?.headers.get('Content-Range')).toBe('bytes 2-5/8');
    expect(await response?.text()).toBe('cdef');
    expect(bucket.get).toHaveBeenCalledWith('map-packages/trondheim-osm.pmtiles', {
      range: { offset: 2, length: 4 },
    });
  });
});
