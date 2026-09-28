import { expect, test } from '@playwright/test';

test('static map and data links keep browser URLs on HTML pages', async ({ page }) => {
  await page.goto('/kart');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole('button', { name: 'Spesialistverktøy og kartdata' }).click();
    await page.getByRole('link', { name: 'Administrer kartdata' }).click();
    await expect(page).toHaveURL(/\/data-pa-enheten$/);
    await page.getByRole('link', { name: 'Tilbake til operativt kart' }).click();
    await expect(page).toHaveURL(/\/kart$/);
    await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  }
});
