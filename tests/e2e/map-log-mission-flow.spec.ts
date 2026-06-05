import { expect, test, type TestInfo } from '@playwright/test';
import { clearBrowserLocalState, createLocalMission, waitForServiceWorker } from './helpers';

const mapTileUrlPattern = /(?:\/tiles?\/|\.mbtiles\b|mapbox|openstreetmap|maplibre|leaflet|tile\.openstreetmap|statkart|kartverket|\/wmts\/|gatekeeper\/gk)/i;

function baseOriginFor(testInfo: TestInfo) {
  const configuredBaseUrl = testInfo.project.use.baseURL;
  if (typeof configuredBaseUrl !== 'string') throw new Error('Playwright baseURL must be configured for map/log URL guards.');
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

test('map/log request guard flags external official tile providers but allows local packages', () => {
  const baseOrigin = 'http://127.0.0.1:3064';
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/map-packages/trondheim-lokal.pmtiles`, baseOrigin)).toBe(false);
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/map-packages/trondheim-style.json`, baseOrigin)).toBe(false);
  expect(isForbiddenTileProviderRequest(`${baseOrigin}/tiles/12/1/1.pbf`, baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=norges_grunnkart', baseOrigin)).toBe(true);
  expect(isForbiddenTileProviderRequest('https://api.kartverket.no/wmts/topo/default/webmercator/12/1/1.png', baseOrigin)).toBe(true);
});

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function missionSummaryPattern(title: string, location: string) {
  return new RegExp(`${escapeRegex(title)}\\s*·\\s*${escapeRegex(location)}`, 'i');
}

test('mobile offline user logs from map into mission and exports oppdragsmappe', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const baseOrigin = baseOriginFor(testInfo);
  const requestedUrls: string[] = [];
  const onRequest = (request: import('@playwright/test').Request) => requestedUrls.push(request.url());
  page.on('request', onRequest);
  const missionTitle = `Kartlogg ${Date.now()}`;
  const markerLabel = 'Fare nord';
  const fieldLogText = 'Fare observert uten persondata';
  const offlineQuickLogText = 'Offline hurtiglogg fra feltmodus uten persondata';
  await clearBrowserLocalState(page);
  await createLocalMission(page, {
    title: missionTitle,
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    location: 'Skjematisk øvingsområde',
  });

  await page.goto('/kart');
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`Aktivt oppdrag: ${missionTitle}`))).toBeVisible();
  await page.getByRole('combobox', { name: /Velg lokal kartpakke/i }).selectOption('trondelag-oversikt');
  await expect(page.getByText(/Cache-varsel: Trøndelag oversiktspakke.*42 MB/i)).toBeVisible();
  await page.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }).click();
  await expect(page.getByTestId('offline-map-cache-status')).toContainText(/Cachet lokalt: Trøndelag oversiktspakke/i);
  await page.getByRole('combobox', { name: /Markørtype/i }).selectOption('hazard');
  await page.getByPlaceholder(/Sanitert lokal etikett/i).fill(markerLabel);
  await page.getByRole('spinbutton', { name: /X 0-100/i }).fill('22');
  await page.getByRole('spinbutton', { name: /Y 0-100/i }).fill('33');
  await page.getByRole('button', { name: /Legg til lokal markør/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(new RegExp(`Fare — ${escapeRegex(markerLabel)}`, 'i'));
  await page.getByLabel(/Loggtekst fra kartpunkt/i).fill(fieldLogText);
  await page.getByRole('button', { name: /Logg herfra Fare nord/i }).click();
  await expect(page.getByText(/Feltlogg opprettet lokalt/i)).toBeVisible();

  await page.goto('/oppdrag');
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Kart og logg/i })).toBeVisible();
  await expect(page.getByText(/Fare nord/i).first()).toBeVisible();
  await expect(page.getByText(/Fare observert uten persondata/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Lag etteraksjonsrapport Markdown/i }).click();
  await expect(page.getByLabel(/Etteraksjonsrapport Markdown/i)).toHaveValue(/Fare observert uten persondata/i);
  await expect(page.getByLabel(/Etteraksjonsrapport Markdown/i)).toHaveValue(/Fare nord/i);
  await page.getByRole('button', { name: /Lag oppdragsmappe/i }).click();
  await expect(page.getByLabel(/Oppdragsmappe JSON/i)).toHaveValue(/schematic-0-100-local-only/i);

  await waitForServiceWorker(page);
  await context.setOffline(true);
  try {
    await page.goto('/oppdrag', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
    const mapLogSummary = page.locator('section').filter({ has: page.getByRole('heading', { name: /Kart og logg/i }) }).first();
    await expect(mapLogSummary).toContainText(/1 markør/i);
    await expect(mapLogSummary).toContainText(/1 kartkoblet logg/i);
    await expect(mapLogSummary.getByText(new RegExp(escapeRegex(markerLabel), 'i')).first()).toBeVisible();
    await expect(mapLogSummary.getByText(new RegExp(escapeRegex(fieldLogText), 'i')).first()).toBeVisible();
    const logOverview = page.locator('#loggoversikt');
    await expect(logOverview.getByRole('heading', { name: /Loggoversikt/i })).toBeVisible();
    await expect(logOverview.getByRole('button', { name: /Kartlogg \(1\)/i })).toBeVisible();
    await expect(logOverview.getByText(new RegExp(escapeRegex(fieldLogText), 'i')).first()).toBeVisible();

    await page.goto('/feltmodus', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Feltmodus for hansker/i })).toBeVisible();
    const quickActions = page.getByRole('region', { name: /Én trykkflate til operativt arbeid/i });
    await expect(quickActions.getByRole('link', { name: 'Hurtiglogg' })).toHaveAttribute('href', '/oppdrag#hurtiglogg');
    await quickActions.getByRole('link', { name: 'Hurtiglogg' }).click();
    await expect(page).toHaveURL(/\/oppdrag#hurtiglogg$/);
    await expect(page.locator('#hurtiglogg')).toBeInViewport();
    await page.locator('#hurtiglogg').getByLabel(/Hurtiglogg tekst/i).fill(offlineQuickLogText);
    await page.locator('#hurtiglogg').getByRole('button', { name: /Lagre hurtiglogg/i }).click();
    await expect(page.locator('#loggoversikt').getByText(new RegExp(escapeRegex(offlineQuickLogText), 'i')).first()).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  const forbiddenTileProviderUrls = requestedUrls.filter((url) => isForbiddenTileProviderRequest(url, baseOrigin));
  expect(forbiddenTileProviderUrls).toEqual([]);
  page.off('request', onRequest);
});

test('map marker and field log stay scoped when switching between two missions', async ({ page }) => {
  const suffix = Date.now();
  const missionB = `Kartlogg B ${suffix}`;
  const missionA = `Kartlogg A ${suffix}`;
  const locationB = 'Skjematisk B';
  const locationA = 'Skjematisk A';
  const markerLabel = 'Fare kun B';
  const fieldLogText = 'B-feltlogg uten persondata';

  await clearBrowserLocalState(page);
  await createLocalMission(page, {
    title: missionB,
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    location: locationB,
  });
  await createLocalMission(page, {
    title: missionA,
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    location: locationA,
  });

  await page.goto('/oppdrag');
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(missionSummaryPattern(missionA, locationA))).toBeVisible();

  await page.getByRole('button', { name: new RegExp(`^Åpne ${escapeRegex(missionB)} som aktivt oppdrag$`) }).click();
  await expect(page.getByText(missionSummaryPattern(missionB, locationB))).toBeVisible();

  await page.goto('/kart');
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`Feltlogg går til: ${escapeRegex(missionB)}`, 'i'))).toBeVisible();
  await page.getByRole('combobox', { name: /Markørtype/i }).selectOption('hazard');
  await page.getByPlaceholder(/Sanitert lokal etikett/i).fill(markerLabel);
  await page.getByRole('spinbutton', { name: /X 0-100/i }).fill('44');
  await page.getByRole('spinbutton', { name: /Y 0-100/i }).fill('55');
  await page.getByRole('button', { name: /Legg til lokal markør/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(new RegExp(escapeRegex(markerLabel), 'i'));
  await page.getByLabel(/Loggtekst fra kartpunkt/i).fill(fieldLogText);
  await page.getByRole('button', { name: /Logg herfra Fare kun B/i }).click();
  await expect(page.getByText(/Feltlogg opprettet lokalt/i)).toBeVisible();

  await page.goto('/oppdrag');
  await expect(page.getByText(missionSummaryPattern(missionB, locationB))).toBeVisible();
  await expect(page.getByText(new RegExp(escapeRegex(markerLabel), 'i')).first()).toBeVisible();
  await expect(page.getByText(new RegExp(escapeRegex(fieldLogText), 'i')).first()).toBeVisible();

  await page.getByRole('button', { name: new RegExp(`^Åpne ${escapeRegex(missionA)} som aktivt oppdrag$`) }).click();
  await expect(page.getByText(missionSummaryPattern(missionA, locationA))).toBeVisible();
  await expect(page.getByText(new RegExp(escapeRegex(markerLabel), 'i'))).toHaveCount(0);
  await expect(page.getByText(new RegExp(escapeRegex(fieldLogText), 'i'))).toHaveCount(0);

  await page.getByRole('button', { name: new RegExp(`^Åpne ${escapeRegex(missionB)} som aktivt oppdrag$`) }).click();
  await expect(page.getByText(missionSummaryPattern(missionB, locationB))).toBeVisible();
  await expect(page.getByText(new RegExp(escapeRegex(markerLabel), 'i')).first()).toBeVisible();
  await expect(page.getByText(new RegExp(escapeRegex(fieldLogText), 'i')).first()).toBeVisible();
});
