import { expect, test } from '@playwright/test';

test('creates and reopens a local mission offline', async ({ page, context }) => {
  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill('Øvelse tilfluktsrom');
  await page.getByLabel('Rolle').selectOption('beredskapsvakt');
  await page.getByLabel('Fase').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Trondheim sentrum');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByText('Øvelse tilfluktsrom')).toBeVisible();
  await expect(page.getByText(/Lagres bare lokalt/i)).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Øvelse tilfluktsrom')).toBeVisible();
});
