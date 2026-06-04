import { expect, test } from '@playwright/test';
import { clearBrowserLocalState, createLocalMission, waitForServiceWorker } from './helpers';

const mapTileUrlPattern = /(?:\/tiles?\/|\.mbtiles\b|mapbox|openstreetmap|maplibre|leaflet|tile\.openstreetmap)/i;

test('mobile offline user logs from map into mission and exports oppdragsmappe', async ({ page, context }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const requestedUrls: string[] = [];
  const onRequest = (request: import('@playwright/test').Request) => requestedUrls.push(request.url());
  page.on('request', onRequest);
  const missionTitle = `Kartlogg ${Date.now()}`;
  await clearBrowserLocalState(page);
  await createLocalMission(page, {
    title: missionTitle,
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    location: 'Skjematisk øvingsområde',
  });

  await page.goto('/kart');
  await expect(page.getByRole('heading', { name: 'Kart' })).toBeVisible();
  await expect(page.getByText(new RegExp(`Aktivt oppdrag: ${missionTitle}`))).toBeVisible();
  await page.getByRole('combobox', { name: /Markørtype/i }).selectOption('hazard');
  await page.getByPlaceholder(/Sanitert lokal etikett/i).fill('Fare nord');
  await page.getByRole('spinbutton', { name: /X 0-100/i }).fill('22');
  await page.getByRole('spinbutton', { name: /Y 0-100/i }).fill('33');
  await page.getByRole('button', { name: /Legg til lokal markør/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Fare — Fare nord/i);
  await page.getByLabel(/Loggtekst fra kartpunkt/i).fill('Fare observert uten persondata');
  await page.getByRole('button', { name: /Opprett feltlogg fra kartpunkt/i }).click();
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
    await expect(page.getByText(/Fare nord/i).first()).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  expect(requestedUrls.filter((url) => mapTileUrlPattern.test(url))).toEqual([]);
  page.off('request', onRequest);
});
