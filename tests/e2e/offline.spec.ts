import { expect, test } from '@playwright/test';

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
