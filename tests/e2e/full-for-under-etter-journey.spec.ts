import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, expectOfflineReloadPreservesMission } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('runs a full Før-Under-Etter local mission journey with real curated data', async ({ page, context }) => {
  const missionTitle = `Full lokal øvelse ${Date.now()}`;

  await page.goto('/for');
  await expect(page.getByRole('heading', { name: 'Før', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /FIG før innsats/i }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Før utrykning samlet kontroll/i }).first()).toBeVisible();

  await page.goto('/under');
  await expect(page.getByRole('heading', { name: 'Under', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /FIG under innsats/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /5-punktsordre/i }).first()).toBeVisible();

  await page.goto('/etter');
  await expect(page.getByRole('heading', { name: 'Etter', exact: true })).toBeVisible();
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

  await expect(page.getByRole('heading', { name: /Situasjonsoversikt nå/i })).toBeVisible();

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
  await expect(page.getByRole('heading', { name: /Situasjonsoversikt nå/i })).toBeVisible();
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

  await expect(page.getByRole('heading', { name: /RUH og velferd/i })).toBeVisible();
  await expect(page.getByText(/ikke offisiell HMS\/RUH-innsending/i)).toBeVisible();
  await page.getByLabel(/RUH kategori/i).selectOption('nestenulykke');
  await page.getByLabel(/Hva skjedde/i).fill('Nestenulykke ved glatt terskel uten personskade.');
  await page.getByLabel(/Umiddelbart tiltak/i).fill('Tørket område og satt ut varsling.');
  await page.getByLabel(/RUH risiko/i).selectOption('hoy');
  await page.getByLabel(/RUH trenger videre tiltak/i).check();
  await page.getByRole('button', { name: /Legg til RUH/i }).click();
  await expect(page.getByText(/Nestenulykke ved glatt terskel/i)).toBeVisible();
  await page.getByRole('button', { name: /Lag RUH Markdown/i }).click();
  await expect(page.getByLabel(/RUH Markdown/i)).toHaveValue(/Lokal forenklet RUH/);
  await page.getByRole('button', { name: /Lag RUH JSON/i }).click();
  await expect(page.getByLabel(/RUH JSON/i)).toHaveValue(/nestenulykke/);

  await page.getByLabel(/Fysisk belastning/i).selectOption('moderat');
  await page.getByLabel(/Mental belastning/i).selectOption('moderat');
  await page.getByLabel(/Trenger hvile/i).check();
  await page.getByLabel(/Vann påminnelse/i).check();
  await page.getByLabel(/Velferdsnotat/i).fill('Rotasjon vurderes etter 30 minutter.');
  await page.getByRole('button', { name: /Lagre velferdssjekk/i }).click();
  await page.getByRole('button', { name: /Lag velferd Markdown/i }).click();
  await expect(page.getByLabel(/Velferd Markdown/i)).toHaveValue(/Rotasjon vurderes/);
  await page.getByRole('button', { name: /Lag velferd JSON/i }).click();
  await expect(page.getByLabel(/Velferd JSON/i)).toHaveValue(/needsRest/);

  await page.getByLabel(/Lokal ordretekst/i).fill('Lokal ordre test uten persondata.');
  await page.getByLabel(/Lokalt samband/i).fill('Samband etter lokal plan.');
  await page.getByLabel(/Lokal logg/i).fill('Terskel merket. Ventilasjon kontrollert.');
  await page.getByRole('button', { name: /Lag etteraksjonsrapport Markdown/i }).click();
  await expect(page.getByLabel(/Etteraksjonsrapport Markdown/i)).toHaveValue(/Lokal ordre test/);
  await page.getByRole('button', { name: /Lag etteraksjonsrapport JSON/i }).click();
  await expect(page.getByLabel(/Etteraksjonsrapport JSON/i)).toHaveValue(new RegExp(missionTitle));
  await page.getByRole('button', { name: /Lag PDF-klar etteraksjonsrapport/i }).click();
  await expect(page.getByLabel(/PDF-klar etteraksjonsrapport HTML/i)).toHaveValue(/<!doctype html>/i);

  await expectOfflineReloadPreservesMission(page, context, missionTitle);
  await expect(page.getByRole('checkbox', { name: /Kontroller ventilasjon/i })).toBeChecked();
  await expect(page.locator('#feltlogg').getByText(/Våt terskel observert/i).first()).toBeVisible();
});
