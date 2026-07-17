import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, openMissionDetails, openMissionMode, readLocalDatabaseCounts } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('exports local app data and imports it back to restore mission and checklist state', async ({ page }) => {
  const missionTitle = `Backup roundtrip ${Date.now()}`;

  await createLocalMission(page, {
    title: missionTitle,
    phase: 'for',
    scenario: 'tilfluktsrom',
    location: 'Roundtrip testområde',
  });
  await openMissionMode(page, 'Arbeid');
  await page.getByRole('checkbox', { name: /Kontroller ventilasjon/i }).check();
  await openMissionDetails(page, /^Feltlogg$/i, 'Arbeid');
  await page.getByLabel(/Feltlogg tekst/i).fill('Roundtrip feltlogg uten persondata.');
  await page.getByRole('button', { name: /Legg til feltlogg/i }).click();
  await openMissionDetails(page, /Loggoversikt og lokale oppgaver/i, 'Arbeid');
  await expect(page.getByLabel('Synlige lokale feltlogginnslag').getByText(/Roundtrip feltlogg/i)).toBeVisible();

  await page.goto('/data-pa-enheten');
  await expect(page.getByRole('heading', { name: /Data lagret på denne enheten/i })).toBeVisible();
  await page.getByRole('combobox', { name: /Velg skjematisk kartpakke/i }).selectOption('trondelag-oversikt');
  await page.getByRole('button', { name: /Lag lokal JSON-backup/i }).click();
  await expect(page.getByTestId('local-data-backup-message')).toHaveText(/JSON-backup generert/i);
  const backupText = await page.getByLabel(/^Lokal JSON backup$/i).inputValue();
  const backup = JSON.parse(backupText) as {
    kind?: string;
    schemaVersion?: number;
    app?: { dbName?: string };
    indexedDb?: { missions?: unknown[]; checklistRuns?: unknown[] };
  };
  expect(backup.kind).toBe('beredskapsboka-local-data-export');
  expect(backup.schemaVersion).toBe(1);
  expect(backup.app?.dbName).toBe('beredskapsboka-local');
  expect(backup.indexedDb?.missions?.length ?? 0).toBeGreaterThanOrEqual(1);
  expect(backup.indexedDb?.checklistRuns?.length ?? 0).toBeGreaterThanOrEqual(1);

  await page.goto('/oppdrag');
  await page.getByText('Personvern og sletting').click();
  await page.getByRole('button', { name: /^Slett lokale data$/i }).click();
  await expect(page.getByText(missionTitle)).toHaveCount(0);
  expect(await readLocalDatabaseCounts(page)).toEqual({ missions: 0, archivedMissions: 0, checklistRuns: 0 });

  await page.goto('/data-pa-enheten');
  await page.getByLabel(/Importer lokal JSON backup/i).fill(backupText);
  await page.getByRole('button', { name: /Sjekk schema/i }).click();
  await expect(page.getByTestId('local-data-backup-message')).toHaveText(/Import klar: schema v1/i);
  await expect(page.getByRole('button', { name: /Importer JSON lokalt/i })).toBeDisabled();
  await page.getByLabel(/Jeg bekrefter at importen er en manuell lokal JSON-fil/i).check();
  await expect(page.getByRole('button', { name: /Importer JSON lokalt/i })).toBeDisabled();
  await page.getByLabel(/Jeg forstår at importen erstatter eksisterende lokale appdata/i).check();
  await page.getByRole('button', { name: /Importer JSON lokalt/i }).click();
  await expect(page.getByTestId('local-data-backup-message')).toHaveText(/Import fullført lokalt/i);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('beredskapsboka-map-package-selection-v1') ?? '')).toContain('trondelag-oversikt');

  await page.goto('/oppdrag');
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`${missionTitle}\\s*·\\s*Roundtrip testområde`, 'i'))).toBeVisible();
  await openMissionMode(page, 'Arbeid');
  await openMissionDetails(page, /Loggoversikt og lokale oppgaver/i, 'Arbeid');
  await expect(page.getByLabel('Synlige lokale feltlogginnslag').getByText(/Roundtrip feltlogg/i)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Kontroller ventilasjon/i })).toBeChecked();
});
