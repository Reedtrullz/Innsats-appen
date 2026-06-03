import { expect, test } from '@playwright/test';

test('home page installs the service worker before app-shell navigation', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Beredskapsboka' })).toBeVisible();
  await page.waitForFunction(() => 'serviceWorker' in navigator);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.goto('/hurtigkort', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
});

test('serves shell and generated content offline with stale label', async ({ page, context }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  const version = await page.getByTestId('content-version').textContent();
  expect(version).toBeTruthy();

  await page.waitForFunction(() => 'serviceWorker' in navigator);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Beredskapsboka')).toBeVisible();
  await expect(page.getByTestId('content-version')).toHaveText(version ?? '');
  await expect(page.getByText(/offline|frakoblet|stale/i)).toBeVisible();
  await expect(page.getByText(/5-punktsordre/i)).toBeVisible();

  await page.locator('a[href="/kort/tilfluktsrom-klargjoring"]').first().click();
  await expect(page.getByRole('heading', { name: /Klargjør offentlig tilfluktsrom/i })).toBeVisible();
  await page.locator('a[href="/kilder/src-deep-research-tilfluktsrom"]').first().click();
  await expect(page.getByRole('heading', { name: /SRC - Deep Research Tilfluktsrom/i })).toBeVisible();

  await page.goto('/kort/tilfluktsrom-klargjoring', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Tilfluktsrom/i }).first()).toBeVisible();
  await expect(page.getByText(/Kildereferanse|Kilder/i).first()).toBeVisible();

  await page.goto('/kilder/src-5-punktsordre', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /SRC - 5-punktsordre/i })).toBeVisible();
  await expect(page.getByText('Kildereferanse: source-extracts/SRC - 5-punktsordre.md')).toBeVisible();

  await page.goto('/moduler/tilfluktsrom', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Tilfluktsrom', exact: true })).toBeVisible();

  await page.goto('/laering', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Opplæring', exact: true })).toBeVisible();

  const apiOk = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/context/weather?lat=abc&lon=10');
      return res.ok;
    } catch {
      return false;
    }
  });
  expect(apiOk).toBe(false);
});
