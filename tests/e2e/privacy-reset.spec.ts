import { expect, test } from '@playwright/test';

test('deletes local mission data with explicit privacy copy', async ({ page }) => {
  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill('Øvelse tilfluktsrom');
  await page.getByLabel('Rolle', { exact: true }).selectOption('beredskapsvakt');
  await page.getByLabel('Fase').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Trondheim sentrum');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(/Øvelse tilfluktsrom\s*·\s*Trondheim sentrum/i)).toBeVisible();
  await page.getByRole('button', { name: /Slett lokale data/i }).click();
  await expect(page.getByTestId('privacy-message')).toHaveText(/Beredskapsboka sender ikke oppdrag/i);
  await page.reload();
  await expect(page.getByText('Øvelse tilfluktsrom')).toHaveCount(0);
});
