import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, expectOfflineReloadPreservesMission, openMissionDetails, openMissionMode } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('runs a full Før-Under-Etter local mission journey with real curated data', async ({ page, context }) => {
  const missionTitle = `Full lokal øvelse ${Date.now()}`;

  await page.goto('/for');
  await expect(page.getByRole('heading', { name: 'Før innsats', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /FIG før innsats/i }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Før utrykning samlet kontroll/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Start lokalt oppdrag/i })).toHaveAttribute('href', '/oppdrag/ny');
  await expect(page.getByRole('link', { name: /Klargjør offline kart/i })).toHaveAttribute('href', '/kart');
  await expect(page.getByRole('link', { name: /Test Feltmodus/i })).toHaveAttribute('href', '/feltmodus');

  await page.goto('/under');
  await expect(page.getByRole('heading', { name: 'Under innsats', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /FIG under innsats/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /5-punktsordre/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Åpne kart/i })).toHaveAttribute('href', '/kart');
  await expect(page.getByRole('link', { name: /Hurtiglogg/i })).toHaveAttribute('href', '/oppdrag#hurtiglogg');

  await page.goto('/etter');
  await expect(page.getByRole('heading', { name: 'Etter innsats', exact: true })).toBeVisible();
  await expect(page.getByText(/Sjekkliste etter innsats/i).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Åpne etterrapport/i })).toHaveAttribute('href', '/oppdrag#etterrapport');
  await expect(page.getByRole('link', { name: /RUH og velferd/i })).toHaveAttribute('href', '/oppdrag#ruh-velferd');
  await expect(page.getByRole('link', { name: /Oppdragsmappe/i })).toHaveAttribute('href', '/oppdrag#oppdragsmappe');

  await createLocalMission(page, {
    title: missionTitle,
    role: 'beredskapsvakt',
    phase: 'for',
    scenario: 'tilfluktsrom',
    location: 'Trondheim sentrum testområde',
  });

  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();

  await page.goto('/under');
  await page.getByRole('link', { name: /Hurtiglogg/i }).click();
  await expect(page).toHaveURL(/\/oppdrag#hurtiglogg$/);
  await expect(page.locator('#hurtiglogg').getByText(/Hurtiglogg · Oppdragstavle/i)).toBeVisible();
  await expect(page.locator('#hurtiglogg')).toBeInViewport();

  await page.goto('/feltmodus');
  const fieldModeQuickActions = page.getByRole('region', { name: /Én trykkflate til operativt arbeid/i });
  await expect(fieldModeQuickActions.getByRole('link', { name: 'Kart' })).toHaveAttribute('href', '/kart');
  await expect(fieldModeQuickActions.getByRole('link', { name: 'Hurtiglogg' })).toHaveAttribute('href', '/oppdrag#hurtiglogg');
  await fieldModeQuickActions.getByRole('link', { name: 'Hurtiglogg' }).click();
  await expect(page).toHaveURL(/\/oppdrag#hurtiglogg$/);
  await expect(page.locator('#hurtiglogg')).toBeInViewport();

  await page.goto('/etter');
  await page.getByRole('link', { name: /Åpne etterrapport/i }).click();
  await expect(page).toHaveURL(/\/oppdrag#etterrapport$/);
  await expect(page.locator('#etterrapport').getByRole('heading', { name: /Etteraksjonsrapport/i })).toBeVisible();
  await expect(page.locator('#etterrapport')).toBeInViewport();

  await page.goto('/etter');
  await page.getByRole('link', { name: /RUH og velferd/i }).click();
  await expect(page).toHaveURL(/\/oppdrag#ruh-velferd$/);
  await expect(page.locator('#ruh-velferd').getByRole('heading', { name: /RUH og velferd/i })).toBeVisible();
  await expect(page.locator('#ruh-velferd')).toBeInViewport();

  await page.goto('/etter');
  await page.getByRole('link', { name: /Oppdragsmappe/i }).click();
  await expect(page).toHaveURL(/\/oppdrag#oppdragsmappe$/);
  await expect(page.locator('#oppdragsmappe').getByRole('heading', { name: /Lokal oppdragsmappe/i })).toBeVisible();
  await expect(page.locator('#oppdragsmappe')).toBeInViewport();

  await page.goto('/oppdrag');
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await openMissionDetails(page, /Loggoversikt og lokale oppgaver/i, 'Arbeid');
  await page.getByLabel(/Ny lokal oppgave/i).fill('Kontroller inngang uten persondata');
  await page.getByLabel(/Oppgavestatus/i).selectOption('in-progress');
  await page.getByRole('button', { name: /Legg til oppgave/i }).click();
  await expect(page.getByText(/Kontroller inngang uten persondata/i)).toBeVisible();

  await page.getByRole('button', { name: /På posisjon/i }).click();
  await expect(page.getByText(/På posisjon/i).last()).toBeVisible();
  await page.getByLabel(/Ressurstype/i).selectOption('equipment');
  await page.getByLabel(/Mengde eller behov/i).fill('2 lykter og sperrebånd');
  await page.getByLabel(/Kort merknad/i).fill('Generelt testbehov');
  await page.getByRole('button', { name: /Registrer ressursbehov/i }).click();
  await expect(page.locator('form').filter({ has: page.getByRole('heading', { name: /Ressursbehov/i }) }).locator('li', { hasText: /^Utstyr$/ })).toBeVisible();

  const checklistItem = page.getByRole('checkbox', { name: /Kontroller ventilasjon/i });
  await checklistItem.check();
  await expect(checklistItem).toBeChecked();

  await openMissionDetails(page, /Feltlogg/i, 'Arbeid');
  await page.getByLabel(/Feltlogg lokasjon/i).fill('Testområde A');
  await page.getByLabel(/Feltlogg kategori/i).selectOption('hms-avvik');
  await page.getByLabel(/Feltlogg tekst/i).fill('Våt terskel observert og merket med sperrebånd.');
  await page.getByLabel(/Kritisk observasjon/i).check();
  await page.getByLabel(/Må videresendes/i).check();
  await page.getByRole('button', { name: /Legg til feltlogg/i }).click();
  await expect(page.locator('#feltlogg').getByText(/Våt terskel observert/i).first()).toBeVisible();
  await page.getByLabel(/Søk i feltlogg/i).fill('terskel');
  await expect(page.getByText(/1\/1 treff/i)).toBeVisible();
  await page.getByRole('button', { name: /Lag feltlogg Markdown/i }).click();
  await expect(page.getByLabel(/Feltlogg Markdown/i)).toHaveValue(/Våt terskel observert/);
  await page.getByRole('button', { name: /Lag feltlogg JSON/i }).click();
  await expect(page.getByLabel(/Feltlogg JSON/i)).toHaveValue(/"category": "hms-avvik"/);
  await page.getByRole('button', { name: /Lag PDF-klar feltlogg/i }).click();
  await expect(page.getByLabel(/PDF-klar feltlogg HTML/i)).toHaveValue(/<!doctype html>/i);

  await openMissionDetails(page, /RUH og velferd/i, 'Eksport');
  const ruhSection = page.locator('#ruh-velferd');
  await expect(ruhSection.getByRole('heading', { name: /RUH og velferd/i })).toBeVisible();
  await expect(ruhSection.getByText(/Lokal registrering og eksport/i).first()).toBeVisible();
  await page.getByLabel(/RUH kategori/i).selectOption('nestenulykke');
  await page.getByLabel(/Hva skjedde/i).fill('Nestenulykke ved glatt terskel uten personskade.');
  await page.getByLabel(/Umiddelbart tiltak/i).fill('Tørket område og satt ut varsling.');
  await page.getByLabel(/RUH risiko/i).selectOption('hoy');
  await page.getByLabel(/RUH trenger videre tiltak/i).check();
  await page.getByRole('button', { name: /Legg til RUH/i }).click();
  await expect(page.getByText(/Nestenulykke ved glatt terskel/i).first()).toBeVisible();
  await ruhSection.getByRole('tab', { name: 'Eksport' }).click();
  await ruhSection.getByRole('button', { name: /Lag RUH Markdown/i }).click();
  await ruhSection.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(ruhSection.getByLabel(/RUH Markdown/i)).toHaveValue(/Lokal forenklet RUH/);
  await ruhSection.getByText(/JSON eksport/i).click();
  await ruhSection.getByRole('button', { name: /Lag RUH JSON/i }).click();
  await ruhSection.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(ruhSection.getByLabel(/RUH JSON/i)).toHaveValue(/nestenulykke/);

  await ruhSection.getByRole('tab', { name: 'Velferd' }).click();
  await ruhSection.getByLabel(/Fysisk belastning/i).selectOption('moderat');
  await ruhSection.getByLabel(/Mental belastning/i).selectOption('moderat');
  await ruhSection.getByLabel(/Trenger hvile/i).check();
  await ruhSection.getByLabel(/Vann påminnelse/i).check();
  await ruhSection.getByLabel(/Velferdsnotat/i).fill('Rotasjon vurderes etter 30 minutter.');
  await ruhSection.getByRole('button', { name: /Lagre velferdssjekk/i }).click();
  await ruhSection.getByRole('tab', { name: 'Eksport' }).click();
  await ruhSection.getByRole('button', { name: /Lag velferd Markdown/i }).click();
  await ruhSection.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(ruhSection.getByLabel(/Velferd Markdown/i)).toHaveValue(/Rotasjon vurderes/);
  await ruhSection.getByText(/JSON eksport/i).click();
  await ruhSection.getByRole('button', { name: /Lag velferd JSON/i }).click();
  await ruhSection.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(ruhSection.getByLabel(/Velferd JSON/i)).toHaveValue(/needsRest/);

  await openMissionDetails(page, /Etterrapport/i, 'Eksport');
  const afterActionSection = page.locator('#etterrapport');
  await afterActionSection.getByText(/Legg til notater/i).click();
  await afterActionSection.getByLabel(/Lokal ordretekst/i).fill('Lokal ordre test uten persondata.');
  await afterActionSection.getByLabel(/Lokalt samband/i).fill('Samband etter lokal plan.');
  await afterActionSection.getByLabel(/Lokal logg/i).fill('Terskel merket. Ventilasjon kontrollert.');
  await afterActionSection.getByRole('button', { name: /Bygg etterrapport/i }).click();
  await afterActionSection.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(afterActionSection.getByLabel(/Etteraksjonsrapport Markdown/i)).toHaveValue(/Lokal ordre test/);
  await afterActionSection.getByText('Eksporter / kopier').click();
  await afterActionSection.getByRole('button', { name: /Lag JSON/i }).click();
  await afterActionSection.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(afterActionSection.getByLabel(/Etteraksjonsrapport JSON/i)).toHaveValue(new RegExp(missionTitle));
  await afterActionSection.getByRole('button', { name: /Lag PDF-klar HTML/i }).click();
  await afterActionSection.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(afterActionSection.getByLabel(/PDF-klar etteraksjonsrapport HTML/i)).toHaveValue(/<!doctype html>/i);

  await expectOfflineReloadPreservesMission(page, context, missionTitle);
  await openMissionMode(page, 'Arbeid');
  await expect(page.getByRole('checkbox', { name: /Kontroller ventilasjon/i })).toBeChecked();
  await openMissionDetails(page, /Feltlogg/i);
  await expect(page.locator('#feltlogg').getByText(/Våt terskel observert/i).first()).toBeVisible();
});
