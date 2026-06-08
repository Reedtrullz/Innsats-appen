import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, openMissionDetails, readLocalDatabaseCounts } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('privacy reset removes active archived checklist and log data after archive', async ({ page }) => {
  const missionTitle = `Arkiv reset øvelse ${Date.now()}`;

  await createLocalMission(page, {
    title: missionTitle,
    phase: 'for',
    scenario: 'tilfluktsrom',
    location: 'Testområde arkiv',
  });

  await openMissionDetails(page, /Loggoversikt og lokale oppgaver/i, 'Arbeid');
  await page.getByLabel(/Ny lokal oppgave/i).fill('Arkivklar lokal oppgave');
  await page.getByRole('button', { name: /Legg til oppgave/i }).click();
  await openMissionDetails(page, /Feltlogg/i, 'Arbeid');
  await page.getByLabel(/Feltlogg tekst/i).fill('Arkivlogg uten persondata.');
  await page.getByRole('button', { name: /Legg til feltlogg/i }).click();
  await page.getByRole('checkbox', { name: /Kontroller ventilasjon/i }).check();
  await openMissionDetails(page, /Avansert \/ dokumentasjon/i, 'Eksport');
  await page.getByLabel(/Erfaringsoppsummering/i).fill('Sanitert læring fra testarkiv.');
  await page.getByLabel(/Hva fungerte/i).fill('Lokal tavle og sjekkliste fungerte.');
  await page.getByRole('button', { name: /Fullfør og arkiver lokalt/i }).click();

  await expect(page.getByTestId('privacy-message')).toHaveText(/arkivert bare lokalt/i);
  await expect(page.getByRole('heading', { name: /Ingen aktiv lokal tavle/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Lokalt fullførte oppdrag/i })).toBeVisible();
  await expect(page.getByText(missionTitle)).toBeVisible();
  await expect(page.getByText(/Sanitert læring fra testarkiv/i)).toBeVisible();

  let counts = await readLocalDatabaseCounts(page);
  expect(counts.missions).toBe(0);
  expect(counts.archivedMissions).toBeGreaterThanOrEqual(1);
  expect(counts.checklistRuns).toBeGreaterThanOrEqual(1);

  await page.getByRole('button', { name: /^Slett lokale data$/i }).click();
  await expect(page.getByTestId('privacy-message')).toHaveText(/sletter bare data i denne nettleseren/i);
  await expect(page.getByText(missionTitle)).not.toBeVisible();
  await expect(page.getByText(/Ingen lokale arkivtreff/i)).toBeVisible();

  counts = await readLocalDatabaseCounts(page);
  expect(counts).toEqual({ missions: 0, archivedMissions: 0, checklistRuns: 0 });
});
