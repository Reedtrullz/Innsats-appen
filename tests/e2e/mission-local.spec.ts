import { expect, test } from '@playwright/test';

test('creates and reopens a local mission offline', async ({ page, context }) => {
  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill('Øvelse tilfluktsrom');
  await page.getByLabel('Rolle', { exact: true }).selectOption('beredskapsvakt');
  await page.getByLabel('Fase').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Trondheim sentrum');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(/Øvelse tilfluktsrom\s*·\s*Trondheim sentrum/i)).toBeVisible();
  await expect(page.getByTestId('privacy-message')).toContainText(/Lagres bare lokalt/i);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
    await expect(page.getByText(/Øvelse tilfluktsrom\s*·\s*Trondheim sentrum/i)).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
