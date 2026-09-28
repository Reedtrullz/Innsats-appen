import { expect, it, vi } from 'vitest';
import worker from '@/worker/index';

it('serves public pages as assets while keeping the API on the small Worker route', async () => {
  const assetFetch = vi.fn(async () => new Response('static page'));
  const env = {
    MAP_PACKAGES: { head: vi.fn(), get: vi.fn() },
    ASSETS: { fetch: assetFetch },
  } as unknown as Parameters<typeof worker.fetch>[1];

  expect(await (await worker.fetch(new Request('https://example.test/kart'), env)).text()).toBe('static page');
  expect(assetFetch).toHaveBeenCalledOnce();

  const health = await worker.fetch(new Request('https://example.test/api/health'), env);
  expect(health.status).toBe(200);
  expect((await health.json()).status).toBe('healthy');
  expect(assetFetch).toHaveBeenCalledOnce();

  expect((await worker.fetch(new Request('https://example.test/api/absent'), env)).status).toBe(404);
  expect((await worker.fetch(new Request('https://example.test/api/health', { method: 'POST' }), env)).status).toBe(405);
});
