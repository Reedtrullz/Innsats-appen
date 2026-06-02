import { expect, test } from '@playwright/test';

test('deletes local mission data with explicit privacy copy', async ({ page }) => {
  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill('Øvelse tilfluktsrom');
  await page.getByLabel('Rolle').selectOption('beredskapsvakt');
  await page.getByLabel('Fase').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Trondheim sentrum');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByText('Øvelse tilfluktsrom')).toBeVisible();
  await page.getByRole('button', { name: /Slett lokale data/i }).click();
  await expect(page.getByText(/Beredskapsboka sender ikke oppdrag/i)).toBeVisible();
  await page.reload();
  await expect(page.getByText('Øvelse tilfluktsrom')).not.toBeVisible();
});
