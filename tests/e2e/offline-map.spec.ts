import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';
import { clearBrowserLocalState, createLocalMission, waitForServiceWorker } from './helpers';

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
  return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
}

test('offline-map request guard flags external official tile providers but allows local packages', () => {
  const baseOrigin = 'http://127.0.0.1:3064';
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/map-packages/trondheim-lokal.pmtiles`, baseOrigin)).toBe(false);
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/map-packages/trondheim-style.json`, baseOrigin)).toBe(false);
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/tiles/12/1/1.pbf`, baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=norges_grunnkart', baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://api.kartverket.no/wmts/topo/default/webmercator/12/1/1.png', baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://basemaps.cartocdn.com/light_all/12/1/1.png', baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://api.maptiler.com/maps/basic/style.json?key=secret', baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://example.invalid/offline-style.json', baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://cdn.example.invalid/vector/12/1/1.pbf', baseOrigin)).toBe(true);
});

function hasLocalMapPackageFixtures() {
  if (!fs.existsSync(mapPackageFixtureDir)) return false;
  const entries = fs.readdirSync(mapPackageFixtureDir);
  return entries.some((entry) => entry.endsWith('.pmtiles')) && entries.some((entry) => entry.endsWith('.json'));
}

test('offline map page is local-only, schematic and tile-free', async ({ page, context }, testInfo) => {
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
  await expect(page.getByText(/Kart, markører og logger blir på enheten/i)).toBeVisible();
  await page.getByText(/Spesialistverktøy og kartdata/i).click();
  await expect(page.getByRole('link', { name: /Administrer kartdata/i })).toHaveAttribute('href', '/data-pa-enheten');
  await expect(page.getByRole('region', { name: /Lokale kartpakker/i })).toHaveCount(0);

  if (!hasLocalMapPackageFixtures()) {
    await expect(page.getByTestId('map-performance-guard')).toContainText(/Ytelsesvern/i);
    await expect(page.getByTestId('offline-maplibre-container')).toHaveCount(0);
  }

  await context.setOffline(false);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`Aktivt oppdrag: ${missionTitle}`, 'i'))).toBeVisible();

  await page.goto('/data-pa-enheten');
  await expect(page.getByRole('heading', { name: /Kartdata og offline/i })).toBeVisible();
  await page.getByRole('combobox', { name: /Velg skjematisk kartpakke/i }).selectOption('trondelag-oversikt');
  // Approved PMTiles packages are listed; nothing is cached until the user saves.
  await expect(page.getByRole('combobox', { name: /Velg lokal kartpakke/i })).toBeVisible();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Ingen kartpakke/i);

  await page.goto('/kart');
  await expect(page.getByTestId('map-performance-guard')).toContainText(/viser maks 12/i);
  await expect(page.getByTestId('map-performance-guard')).toContainText(/2 skjult/i);

  await page.getByRole('combobox', { name: /Markørtype/i }).selectOption('il-ko');
  await page.getByPlaceholder(/Sanitert lokal etikett/i).fill('KO lokal');
  await page.getByRole('spinbutton', { name: /X 0-100/i }).fill('23');
  await page.getByRole('spinbutton', { name: /Y 0-100/i }).fill('34');
  await page.getByRole('button', { name: /Legg til lokal markør/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/IL-KO — KO lokal/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1'))).toContain('il-ko');

  await page.getByText(/Spesialistverktøy og kartdata/i).click();
  await page.getByRole('button', { name: 'Pumpe' }).click();
  const waterSupplyPlanner = page.getByRole('region', { name: /Pumpe- og slangeplanlegger/i });
  await waterSupplyPlanner.getByLabel(/Planetikett/i).fill('Skogbrann vest');
  await waterSupplyPlanner.getByLabel(/Vannkilde X-koordinat/i).fill('10');
  await waterSupplyPlanner.getByLabel(/Vannkilde Y-koordinat/i).fill('20');
  await waterSupplyPlanner.getByLabel(/Pumpeplass X-koordinat/i).fill('25');
  await waterSupplyPlanner.getByLabel(/Pumpeplass Y-koordinat/i).fill('35');
  await waterSupplyPlanner.getByLabel(/Leveringspunkt X-koordinat/i).fill('60');
  await waterSupplyPlanner.getByLabel(/Leveringspunkt Y-koordinat/i).fill('50');
  await waterSupplyPlanner.getByLabel(/Planmerknad uten persondata/i).fill('Avklart med leder');
  await waterSupplyPlanner.getByRole('button', { name: /Lag pumpe- og slangeplan/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Ressurs — Vannkilde Skogbrann vest/i);
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Pumpeplass — Pumpeplass Skogbrann vest/i);
  await expect(page.getByTestId('operations-drawing-list')).toContainText(/Linje — Slangevei Skogbrann vest/i);
  await expect(waterSupplyPlanner.getByTestId('water-supply-plan-summary')).toContainText(/trykkforsterkning|seriekjøring/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1') ?? '')).toContain('"kind":"pump-location"');
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1') ?? '')).not.toMatch(/\b\d+\s*(?:l\/min|liter\/min|bar|m3\/t)\b/i);

  await page.getByRole('button', { name: 'RADIAC' }).click();
  await expect(waterSupplyPlanner).toHaveCount(0);
  const radiacPlanner = page.getByRole('region', { name: /RADIAC målepunktplanlegger/i });
  await radiacPlanner.getByLabel(/RADIAC planetikett/i).fill('RAD nord');
  await radiacPlanner.getByLabel(/Målepunkter som x,y/i).fill('15,30 35,40 55,45');
  await radiacPlanner.getByLabel(/RADIAC planmerknad uten persondata/i).fill('Rapporteringsformat avklart');
  await radiacPlanner.getByRole('button', { name: /Lag RADIAC måleplan/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Observasjon — Målepunkt 1 RAD nord/i);
  await expect(page.getByTestId('operations-drawing-list')).toContainText(/Linje — Målerute RAD nord/i);
  await expect(radiacPlanner.getByTestId('radiac-measurement-plan-summary')).toContainText(/beregner ikke dose/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1') ?? '')).toContain('Målerute RAD nord');
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1') ?? '')).not.toMatch(/\b\d+\s*(?:µ?Sv\/h|mSv|dosegrense|oppholdstid)\b/i);

  await page.getByRole('button', { name: 'Søketeig' }).click();
  await expect(radiacPlanner).toHaveCount(0);
  const searchPlanner = page.getByRole('region', { name: /Søketeig planlegger/i });
  await searchPlanner.getByLabel(/Søketeig etikett/i).fill('Teig alfa');
  await searchPlanner.getByLabel(/Teiggrense som x,y/i).fill('10,20 42,18 48,52 14,58');
  await searchPlanner.getByLabel(/Startpunkt X-koordinat/i).fill('12');
  await searchPlanner.getByLabel(/Startpunkt Y-koordinat/i).fill('22');
  await searchPlanner.getByLabel(/Returpunkt X-koordinat/i).fill('40');
  await searchPlanner.getByLabel(/Returpunkt Y-koordinat/i).fill('55');
  await searchPlanner.getByLabel(/Søketeig planmerknad uten persondata/i).fill('Rapporteringsintervall avklart');
  await searchPlanner.getByRole('button', { name: /Lag søketeig plan/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Møteplass — Startpunkt Teig alfa/i);
  await expect(page.getByTestId('operations-drawing-list')).toContainText(/Sektor\/teig — Søketeig Teig alfa/i);
  await expect(searchPlanner.getByTestId('search-sector-plan-summary')).toContainText(/live tracking/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1') ?? '')).toContain('Søketeig Teig alfa');
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1') ?? '')).not.toMatch(/\b(?:personnummer|\+47|pasient|GPS-sporing|blue-force|sanntidsposisjon)\b/i);

  await page.getByRole('button', { name: 'MRE' }).click();
  await expect(searchPlanner).toHaveCount(0);
  const mrePlanner = page.getByRole('region', { name: /MRE ren\/uren-side planlegger/i });
  await mrePlanner.getByLabel(/MRE planetikett/i).fill('Rens nord');
  await mrePlanner.getByLabel(/Uren side som x,y/i).fill('10,20 38,18 36,46 12,48');
  await mrePlanner.getByLabel(/^Ren side som x,y/i).fill('48,22 76,22 74,48 50,50');
  await mrePlanner.getByLabel(/Renselinje som x,y/i).fill('40,20 44,52');
  await mrePlanner.getByLabel(/Innpassering X-koordinat/i).fill('14');
  await mrePlanner.getByLabel(/Innpassering Y-koordinat/i).fill('24');
  await mrePlanner.getByLabel(/Utpassering X-koordinat/i).fill('54');
  await mrePlanner.getByLabel(/Utpassering Y-koordinat/i).fill('46');
  await mrePlanner.getByLabel(/Avfallspunkt X-koordinat/i).fill('32');
  await mrePlanner.getByLabel(/Avfallspunkt Y-koordinat/i).fill('54');
  await mrePlanner.getByLabel(/MRE planmerknad uten persondata/i).fill('Samband og stoppkriterier avklart');
  await mrePlanner.getByRole('button', { name: /Lag MRE soneplan/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Møteplass — Innpassering Rens nord/i);
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Ressurs — Avfallspunkt Rens nord/i);
  await expect(page.getByTestId('operations-drawing-list')).toContainText(/Polygon — Uren side Rens nord/i);
  await expect(page.getByTestId('operations-drawing-list')).toContainText(/Linje — Renselinje Rens nord/i);
  await expect(mrePlanner.getByTestId('mre-zone-plan-summary')).toContainText(/fastsetter ikke stoff/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1') ?? '')).toContain('Renselinje Rens nord');
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-operations-map-v1') ?? '')).not.toMatch(/\b(?:personnummer|\+47|pasient|Level\s*A|nivå\s*A|sarin|klorgass|cyanid)\b/i);

  await page.getByRole('button', { name: /Lagre lokal tegning\/sektor/i }).click();
  await expect(page.getByTestId('map-measurement-readout')).toContainText(/Sektor\/teig: avstand/i);

  await page.goto('/data-pa-enheten');
  await expect(page.getByRole('heading', { name: /Kartdata og offline/i })).toBeVisible();
  await page.getByRole('button', { name: /Lag GeoJSON eksport/i }).click();
  await expect(page.getByLabel(/GeoJSON eksport/i)).toContainText(/schematic-0-100-local-only/i);
  await page.getByRole('button', { name: /Lag kartbilde/i }).click();
  await expect(page.getByLabel(/Kartbilde SVG/i)).toContainText(/Sanitert lokalt kartbilde/i);
  await expect(page.getByText(/KML-import er ikke aktivert/i)).toBeVisible();
  await expect(page.getByText(/Delt live posisjon\/blue-force tracking er ikke aktivert/i)).toBeVisible();

  const forbiddenTileProviderUrls = requestedUrls.filter((url) => isForbiddenTileProviderRequest(url, baseOrigin));
  expect(forbiddenTileProviderUrls).toEqual([]);
});
