import { expect, test, type Request } from '@playwright/test';

import { waitForServiceWorker } from './helpers';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth, `document overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  expect(overflow.bodyWidth, `body overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

const coreRoutes: Array<{ route: string; heading: RegExp; maxRequests: number; maxMs: number }> = [
  { route: '/hurtigkort', heading: /Hurtigkort/i, maxRequests: 45, maxMs: 4_000 },
  { route: '/oppdrag', heading: /Lokale oppdrag/i, maxRequests: 60, maxMs: 4_000 },
  { route: '/data-pa-enheten', heading: /Data lagret på denne enheten/i, maxRequests: 60, maxMs: 4_000 },
  { route: '/feltmodus', heading: /Feltmodus/i, maxRequests: 60, maxMs: 4_000 },
  { route: '/kart', heading: /Kart/i, maxRequests: 45, maxMs: 4_000 },
];

test('mobile core routes stay within interaction and request budgets', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });

  for (const { route, heading, maxRequests, maxMs } of coreRoutes) {
    const requested = new Set<string>();
    const onRequest = (request: Request) => requested.add(request.url());
    page.on('request', onRequest);
    const started = Date.now();
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: maxMs });
    const elapsed = Date.now() - started;
    page.off('request', onRequest);

    await expectNoHorizontalOverflow(page);
    expect(elapsed, `${route} visible heading elapsed ${elapsed}ms`).toBeLessThan(maxMs);
    expect(requested.size, `${route} made ${requested.size} requests`).toBeLessThanOrEqual(maxRequests);
  }
});

test('offline app shell reload is fast after service-worker warmup', async ({ page, context }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: /Hurtigkort/i })).toBeVisible();
  await waitForServiceWorker(page);

  await context.setOffline(true);
  for (const route of ['/hurtigkort', '/oppdrag']) {
    const started = Date.now();
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: /Hovednavigasjon/i })).toBeVisible({ timeout: 2_500 });
    await expect(page.getByTestId('offline-status')).toContainText(/offline|frakoblet|stale/i, { timeout: 2_500 });
    expect(Date.now() - started, `${route} offline reload budget`).toBeLessThan(2_500);
  }
});
