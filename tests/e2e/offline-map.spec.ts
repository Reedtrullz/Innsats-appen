import { expect, test } from '@playwright/test';
import { clearBrowserLocalState, createLocalMission, waitForServiceWorker } from './helpers';

const mapTileUrlPattern = /(?:\/tiles?\/|\.mbtiles\b|mapbox|openstreetmap|maplibre|leaflet|tile\.openstreetmap)/i;

test('offline map page is local-only, cacheable and tile-free', async ({ page, context }) => {
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  const missionTitle = `Offline kart ${Date.now()}`;

  await clearBrowserLocalState(page);
  await createLocalMission(page, {
    title: missionTitle,
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    location: 'Skjematisk offlineområde',
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Beredskapsboka' })).toBeVisible();
  await waitForServiceWorker(page);
  await context.setOffline(true);

  await page.goto('/kart', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/offline|frakoblet/i).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kart' })).toBeVisible();
  await expect(page.getByText(/Schematic local map package, not authoritative navigation/i).first()).toBeVisible();
  await expect(page.getByText(/Ingen eksterne kartfliser/i).first()).toBeVisible();
  await expect(page.getByText(/ingen nettverksnedlasting/i)).toBeVisible();
  await expect(page.getByText(/ingen backend sync/i).first()).toBeVisible();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Ingen kartpakke/i);

  await context.setOffline(false);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Kart' })).toBeVisible();
  await expect(page.getByText(new RegExp(`Aktivt oppdrag: ${missionTitle}`, 'i'))).toBeVisible();

  await page.getByRole('combobox', { name: /Velg lokal kartpakke/i }).selectOption('trondelag-oversikt');
  await expect(page.getByText(/Cache-varsel: Trøndelag oversiktspakke.*42 MB/i)).toBeVisible();
  await expect(page.getByTestId('map-performance-guard')).toContainText(/viser maks 12/i);

  await page.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }).click();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Cachet lokalt: Trøndelag oversiktspakke/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-offline-map-cache-v1'))).toContain('trondelag-oversikt');

  await page.getByRole('button', { name: /Tilbakestill kartcache/i }).click();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Ingen kartpakke/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-offline-map-cache-v1'))).toBeNull();

  await page.getByRole('combobox', { name: /Markørtype/i }).selectOption('il-ko');
  await page.getByPlaceholder(/Sanitert lokal etikett/i).fill('KO lokal');
  await page.getByRole('spinbutton', { name: /X 0-100/i }).fill('23');
  await page.getByRole('spinbutton', { name: /Y 0-100/i }).fill('34');
  await page.getByRole('button', { name: /Legg til lokal markør/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/IL-KO — KO lokal/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1'))).toContain('il-ko');

  await page.getByRole('button', { name: /Lagre lokal tegning\/sektor/i }).click();
  await expect(page.getByTestId('map-measurement-readout')).toContainText(/Sektor\/teig: avstand/i);

  await page.getByRole('button', { name: /Lag GeoJSON eksport/i }).click();
  await expect(page.getByLabel(/GeoJSON eksport/i)).toContainText(/schematic-0-100-local-only/i);
  await page.getByRole('button', { name: /Lag kartbilde/i }).click();
  await expect(page.getByLabel(/Kartbilde SVG/i)).toContainText(/Sanitert lokalt kartbilde/i);
  await expect(page.getByText(/KML-import er ikke implementert i MVP/i)).toBeVisible();
  await expect(page.getByText(/Delt live posisjon\/blue-force tracking skal ikke bygges i MVP/i)).toBeVisible();

  expect(requestedUrls.filter((url) => mapTileUrlPattern.test(url))).toEqual([]);
});
