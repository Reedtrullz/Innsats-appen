import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth, `document overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewportWidth);
  expect(overflow.bodyWidth, `body overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewportWidth);
}

test('mobile layout has no horizontal overflow and nav touch targets are large enough', async ({ page }) => {
  for (const route of ['/hurtigkort', '/kort/tilfluktsrom-klargjoring', '/oppdrag/ny', '/moduler/tilfluktsrom']) {
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  }

  await page.goto('/hurtigkort');
  const navLinks = page.getByRole('navigation', { name: /Hovednavigasjon/i }).getByRole('link');
  const count = await navLinks.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await navLinks.nth(index).boundingBox();
    expect(box, `missing nav link bounding box at index ${index}`).not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('warning banners remain visible in card detail', async ({ page }) => {
  await page.goto('/kort/tilfluktsrom-klargjoring');
  await expect(page.getByRole('heading', { name: /Klargjør.*tilfluktsrom/i })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: /Researchbasert støtte/i })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: /Kontroller alltid mot gjeldende offisielt planverk/i }).first()).toBeVisible();
});

test('mission and local export form controls have accessible labels', async ({ page }) => {
  await page.goto('/oppdrag/ny');
  for (const label of ['Tittel', 'Rolle', 'Fase', 'Scenario', 'Sted/lokasjon']) {
    await expect(page.getByLabel(label)).toBeVisible();
  }

  await page.goto('/oppdrag');
  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband', 'Kanal/talegruppe', 'Kallesignal', 'Telefon/ISSI']) {
    await expect(page.getByLabel(new RegExp(label, 'i'))).toBeVisible();
  }
  await expect(page.locator('form').filter({ hasText: '5-punktsordre' }).getByLabel(/Notes/i)).toBeVisible();
  await expect(page.locator('form').filter({ hasText: 'Sambandsplan' }).getByLabel(/Notes/i)).toBeVisible();
});
