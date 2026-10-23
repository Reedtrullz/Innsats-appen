import { expect, test } from '@playwright/test';

test('static map and data links keep browser URLs on HTML pages', async ({ page }) => {
  await page.goto('/kart');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByText('Spesialistverktøy og kartdata').click();
    await page.getByRole('link', { name: 'Administrer kartdata' }).click();
    await expect(page).toHaveURL(/\/data-pa-enheten$/);
    await page.getByRole('link', { name: 'Tilbake til operativt kart' }).click();
    await expect(page).toHaveURL(/\/kart$/);
    await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  }
});

test('server-externalized runtime deps resolve so every static page is prerendered', async ({ request }) => {
  // /release renders next/image, whose vinext shim externalizes ipaddr.js. If that package is
  // not resolvable from the project root (pnpm strict layout), the page silently drops to 404.
  for (const path of ['/release', '/nytt', '/kart', '/faq']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});
