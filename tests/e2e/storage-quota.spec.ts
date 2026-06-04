import { expect, test } from '@playwright/test';

async function mockStorageEstimate(page: import('@playwright/test').Page, estimate: { usage?: number; quota?: number } | 'error') {
  await page.addInitScript((nextEstimate) => {
    const estimateFn = async () => {
      if (nextEstimate === 'error') throw new Error('quota unavailable');
      return nextEstimate;
    };
    Object.defineProperty(Navigator.prototype, 'storage', {
      configurable: true,
      get() {
        return { estimate: estimateFn };
      },
    });
  }, estimate);
}

test('shows warning and critical storage quota states on data-on-device page', async ({ page }) => {
  await mockStorageEstimate(page, { usage: 95, quota: 100 });
  await page.goto('/data-pa-enheten');
  await expect(page.getByRole('heading', { name: /Data lagret på denne enheten/i })).toBeVisible();
  await expect(page.getByTestId('local-data-quota')).toContainText(/95 %/);
  await expect(page.getByTestId('local-data-quota')).toContainText(/kritisk|Eksporter og rydd/i);

  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'storage', {
      configurable: true,
      get() {
        return { estimate: async () => ({ usage: 80, quota: 100 }) };
      },
    });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('local-data-quota')).toContainText(/80 %/);
  await expect(page.getByTestId('local-data-quota')).toContainText(/nærmer seg|rydd/i);
});

test('falls back when browser quota estimate is unavailable', async ({ page }) => {
  await mockStorageEstimate(page, 'error');
  await page.goto('/data-pa-enheten');
  await expect(page.getByTestId('local-data-quota')).toContainText(/Lagringskvote er ukjent/i);
  await page.getByRole('button', { name: /Oppdater kvote/i }).click();
  await expect(page.getByTestId('local-data-quota')).toContainText(/Nettleseren oppgir ikke lokal lagringskvote/i);
});
