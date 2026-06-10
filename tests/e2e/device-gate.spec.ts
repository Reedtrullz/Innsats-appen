import { expect, test } from '@playwright/test';

import { clearBrowserLocalState } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('renders six checks and computes NOT READY when one fails', async ({ page }) => {
  await page.goto('/release');

  await expect(page.getByText('Pilotklar sjekkliste')).toBeVisible();
  await expect(page.getByText('VENT', { exact: true })).toBeVisible();

  const checkArticles = page.locator('section').first().getByRole('article');
  await expect(checkArticles).toHaveCount(6);

  await expect(page.getByText('Nullstill bekreftelser')).toBeVisible();

  await expect(page.getByText(/PILOTKLAR/)).toHaveCount(0);
});

test('renders READY when all six checks pass via manual confirm', async ({ page }) => {
  await page.goto('/release');

  const checkboxes = page.getByRole('checkbox', { name: 'Bekreft' });
  const count = await checkboxes.count();
  expect(count).toBe(6);

  for (let i = 0; i < count; i += 1) {
    await checkboxes.nth(i).check();
  }

  await expect(page.getByText('KLAR', { exact: true })).toBeVisible();
  await expect(page.getByText('6/6 bestått — PILOTKLAR')).toBeVisible();
  await expect(page.getByText('VENT', { exact: true })).toHaveCount(0);
});

test('displays SHA from /api/health', async ({ page }) => {
  await page.route('/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', app: 'beredskapsboka', version: 'abc1234', nodeEnv: 'test', timestamp: new Date().toISOString() }),
    });
  });

  await page.goto('/release');
  await expect(page.getByText('SHA: abc1234')).toBeVisible();
});

test('reset clears all manual confirms', async ({ page }) => {
  await page.goto('/release');

  const checkboxes = page.getByRole('checkbox', { name: 'Bekreft' });
  const count = await checkboxes.count();
  for (let i = 0; i < count; i += 1) {
    await checkboxes.nth(i).check();
  }

  await expect(page.getByText('KLAR', { exact: true })).toBeVisible();
  await expect(page.getByText('6/6 bestått — PILOTKLAR')).toBeVisible();

  await page.getByText('Nullstill bekreftelser').click();

  await expect(page.getByText('VENT', { exact: true })).toBeVisible();
  await expect(page.getByText('KLAR', { exact: true })).toHaveCount(0);
});
