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
  { route: '/', heading: /Hva trenger du nå/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/sok', heading: /Søk i tiltak, kilder og moduler/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/oppdrag', heading: /Lokale oppdrag/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/under', heading: /Under/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/etter', heading: /Etter/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/hurtigkort', heading: /Hurtigkort/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/mer', heading: /^Mer$/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/data-pa-enheten', heading: /Data lagret på denne enheten/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/feltmodus', heading: /Feltmodus/i, maxRequests: 90, maxMs: 8_000 },
  { route: '/kart', heading: /Kart/i, maxRequests: 90, maxMs: 8_000 },
];

test('mobile core routes stay within interaction and request budgets', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });

  for (const { route, heading, maxRequests, maxMs } of coreRoutes) {
    const requested = new Set<string>();
    const onRequest = (request: Request) => requested.add(request.url());
    page.on('request', onRequest);
    try {
      const started = Date.now();
      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: maxMs });
      const elapsed = Date.now() - started;

      await expectNoHorizontalOverflow(page);
      expect(elapsed, `${route} visible heading elapsed ${elapsed}ms`).toBeLessThan(maxMs);
      expect(requested.size, `${route} made ${requested.size} requests`).toBeLessThanOrEqual(maxRequests);
    } finally {
      page.off('request', onRequest);
    }
  }
});

test('offline app shell reload is fast after service-worker warmup', async ({ page, context }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: /Hurtigkort/i })).toBeVisible();
  await waitForServiceWorker(page);

  const offlineRoutes = [
    { route: '/', heading: /Hva trenger du nå/i, hasAppShellStatus: true },
    { route: '/sok', heading: /Søk i tiltak, kilder og moduler/i, hasAppShellStatus: true },
    { route: '/mer', heading: /^Mer$/i, hasAppShellStatus: true },
    { route: '/hurtigkort', heading: /Hurtigkort/i, hasAppShellStatus: true },
    { route: '/oppdrag', heading: /Lokale oppdrag/i, hasAppShellStatus: true },
    { route: '/under', heading: /Under/i, hasAppShellStatus: true },
    { route: '/etter', heading: /Etter/i, hasAppShellStatus: true },
    { route: '/kart', heading: /Kart/i, hasAppShellStatus: true },
    { route: '/feltmodus', heading: /Feltmodus/i, hasAppShellStatus: true },
    { route: '/nytt', heading: /Hva er nytt/i, hasAppShellStatus: true },
    { route: '/release', heading: /Innsats-app pilot/i, hasAppShellStatus: false },
  ];

  await context.setOffline(true);
  try {
    for (const { route, heading, hasAppShellStatus } of offlineRoutes) {
      const started = Date.now();
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 5_000 });
      if (hasAppShellStatus) await expect(page.getByTestId('offline-status')).toContainText(/offline|frakoblet|stale/i, { timeout: 5_000 });
      expect(Date.now() - started, `${route} offline reload budget`).toBeLessThan(5_000);
    }
  } finally {
    await context.setOffline(false);
  }
});
