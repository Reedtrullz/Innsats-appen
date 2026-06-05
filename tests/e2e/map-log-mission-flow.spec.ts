import { expect, test } from '@playwright/test';
import { clearBrowserLocalState, createLocalMission, waitForServiceWorker } from './helpers';

const mapTileUrlPattern = /(?:\/tiles?\/|\.mbtiles\b|mapbox|openstreetmap|maplibre|leaflet|tile\.openstreetmap)/i;

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function missionSummaryPattern(title: string, location: string) {
  return new RegExp(`${escapeRegex(title)}\\s*·\\s*${escapeRegex(location)}`, 'i');
}

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
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`Aktivt oppdrag: ${missionTitle}`))).toBeVisible();
  await page.getByRole('combobox', { name: /Markørtype/i }).selectOption('hazard');
  await page.getByPlaceholder(/Sanitert lokal etikett/i).fill('Fare nord');
  await page.getByRole('spinbutton', { name: /X 0-100/i }).fill('22');
  await page.getByRole('spinbutton', { name: /Y 0-100/i }).fill('33');
  await page.getByRole('button', { name: /Legg til lokal markør/i }).click();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Fare — Fare nord/i);
  await page.getByLabel(/Loggtekst fra kartpunkt/i).fill('Fare observert uten persondata');
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
    await expect(page.getByText(/Fare nord/i).first()).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  expect(requestedUrls.filter((url) => mapTileUrlPattern.test(url))).toEqual([]);
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
