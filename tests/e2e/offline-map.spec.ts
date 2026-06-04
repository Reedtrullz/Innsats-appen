import { expect, test } from '@playwright/test';

const mapTileUrlPattern = /(?:\/tiles?\/|\.mbtiles\b|mapbox|openstreetmap|maplibre|leaflet|tile\.openstreetmap)/i;

test('offline map page is local-only, cacheable and tile-free', async ({ page, context }) => {
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  await page.addInitScript(() => {
    localStorage.removeItem('beredskapsboka-offline-map-cache-v1');
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Beredskapsboka' })).toBeVisible();
  await page.waitForFunction(() => 'serviceWorker' in navigator);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);

  await page.goto('/kart', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/offline|frakoblet/i).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kart' })).toBeVisible();
  await expect(page.getByText(/Schematic local map package, not authoritative navigation/i).first()).toBeVisible();
  await expect(page.getByText(/Ingen eksterne kartfliser/i).first()).toBeVisible();
  await expect(page.getByText(/ingen nettverksnedlasting/i)).toBeVisible();
  await expect(page.getByText(/ingen backend sync/i)).toBeVisible();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Ingen kartpakke/i);

  await context.setOffline(false);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Kart' })).toBeVisible();

  await page.getByRole('combobox', { name: /Velg lokal kartpakke/i }).selectOption('trondelag-oversikt');
  await expect(page.getByText(/Cache-varsel: Trøndelag oversiktspakke.*42 MB/i)).toBeVisible();
  await expect(page.getByTestId('map-performance-guard')).toContainText(/viser maks 12/i);

  await page.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }).click();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Cachet lokalt: Trøndelag oversiktspakke/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-offline-map-cache-v1'))).toContain('trondelag-oversikt');

  await page.getByRole('button', { name: /Tilbakestill kartcache/i }).click();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Ingen kartpakke/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-offline-map-cache-v1'))).toBeNull();

  expect(requestedUrls.filter((url) => mapTileUrlPattern.test(url))).toEqual([]);
});
