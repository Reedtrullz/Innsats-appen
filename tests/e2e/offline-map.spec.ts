import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';
import { clearBrowserLocalState, createLocalMission, waitForServiceWorker } from './helpers';

const mapTileUrlPattern = /(?:\/tiles?\/|\.mbtiles\b|mapbox|openstreetmap|maplibre|leaflet|tile\.openstreetmap|statkart|kartverket|\/wmts\/|gatekeeper\/gk)/i;
const mapPackageFixtureDir = path.join(process.cwd(), 'public', 'map-packages');

function baseOriginFor(testInfo: TestInfo) {
  const configuredBaseUrl = testInfo.project.use.baseURL;
  if (typeof configuredBaseUrl !== 'string') throw new Error('Playwright baseURL must be configured for offline map URL guards.');
  return new URL(configuredBaseUrl).origin;
}

function isForbiddenTileProviderRequest(url: string, baseOrigin: string) {
  const parsedUrl = new URL(url);
  if (parsedUrl.origin === baseOrigin) {
    if (parsedUrl.pathname.startsWith('/map-packages/')) return false;
    return /(?:\/tiles?\/|\.mbtiles\b)/i.test(parsedUrl.pathname);
  }
  return mapTileUrlPattern.test(url);
}

test('offline-map request guard flags external official tile providers but allows local packages', () => {
  const baseOrigin = 'http://127.0.0.1:3064';
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/map-packages/trondheim-lokal.pmtiles`, baseOrigin)).toBe(false);
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/map-packages/trondheim-style.json`, baseOrigin)).toBe(false);
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/tiles/12/1/1.pbf`, baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=norges_grunnkart', baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://api.kartverket.no/wmts/topo/default/webmercator/12/1/1.png', baseOrigin)).toBe(true);
});

function hasLocalMapPackageFixtures() {
  if (!fs.existsSync(mapPackageFixtureDir)) return false;
  const entries = fs.readdirSync(mapPackageFixtureDir);
  return entries.some((entry) => entry.endsWith('.pmtiles')) && entries.some((entry) => entry.endsWith('.json'));
}

test('offline map page is local-only, cacheable and tile-free', async ({ page, context }, testInfo) => {
  const baseOrigin = baseOriginFor(testInfo);
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
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  await expect(page.getByText(/Schematic local map package, not authoritative navigation/i).first()).toBeVisible();
  await expect(page.getByText(/Ingen eksterne kartfliser/i).first()).toBeVisible();
  await expect(page.getByText(/CacheStorage for offline bruk/i)).toBeVisible();
  await expect(page.getByText(/Ingen ekstern tile-provider, backend-sync/i).first()).toBeVisible();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Ingen kartpakke/i);

  if (!hasLocalMapPackageFixtures()) {
    await expect(page.getByTestId('map-performance-guard')).toContainText(/Ytelsesvern/i);
    await expect(page.getByTestId('offline-maplibre-container')).toHaveCount(0);
  }

  await context.setOffline(false);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
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

  const forbiddenTileProviderUrls = requestedUrls.filter((url) => isForbiddenTileProviderRequest(url, baseOrigin));
  expect(forbiddenTileProviderUrls).toEqual([]);
});
