import { expect, test, type Locator, type Page } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, openMissionDetails, openMissionMode } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

function orderForm(page: Page) {
  return page.locator('form').filter({ has: page.getByRole('heading', { name: '5-punktsordre' }) });
}

async function fillOrderPoints(form: Locator) {
  await form.getByRole('tab', { name: /Fem punkter/i }).click();
  await expect(form.getByText(/0\/5 punkter fylt ut/i)).toBeVisible();
  const labels = ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband'];
  for (let index = 0; index < labels.length; index += 1) {
    await form.getByLabel(labels[index]).fill(`${labels[index]} sanitert test`);
    await expect(form.getByText(new RegExp(`${index + 1}/5 punkter fylt ut`, 'i'))).toBeVisible();
  }
}

async function expectCollapsedReview(section: Locator, title: RegExp) {
  await expect(section.getByText(title)).toBeVisible();
  await expect(section.getByRole('button', { name: /Kopier/i }).first()).toBeVisible();
  const preview = section.getByText(/Vis forhåndsvisning/i).last();
  await expect(preview).toBeVisible();
  await expect(preview.locator('xpath=ancestor::details[1]')).not.toHaveAttribute('open', '');
}

test('5-punktsordre guided steps stay locked, show progress and render collapsed ExportReview', async ({ page }) => {
  await createLocalMission(page, { title: `Guided ordre ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Release QA' });
  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');
  const form = orderForm(page);

  await expect(form.getByRole('tab', { name: /Mal/i })).toContainText(/Fullført/i);
  await expect(form.getByRole('tab', { name: /Bekreft/i })).toBeDisabled();
  await expect(form.getByRole('tab', { name: /Bekreft/i })).toContainText(/Låst/i);
  await expect(form.getByRole('tab', { name: /Eksporter/i })).toBeDisabled();
  await expect(form.getByRole('tab', { name: /Eksporter/i })).toContainText(/Låst/i);

  await fillOrderPoints(form);
  await expect(form.getByRole('tab', { name: /Bekreft/i })).toBeEnabled();
  await expect(form.getByRole('tab', { name: /Bekreft/i })).toContainText(/Klar/i);
  await expect(form.getByRole('tab', { name: /Eksporter/i })).toBeDisabled();

  await form.getByRole('tab', { name: /Bekreft/i }).click();
  await expect(form.getByRole('tab', { name: /Eksporter/i })).toBeDisabled();
  await form.getByLabel(/Tilbakelesing\/forstått/i).check();
  await expect(form.getByRole('tab', { name: /Bekreft/i })).toContainText(/Fullført/i);
  await expect(form.getByRole('tab', { name: /Eksporter/i })).toBeEnabled();

  await form.getByRole('tab', { name: /Eksporter/i }).click();
  await form.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await expectCollapsedReview(form, /Eksport er klar/i);
  await expect(form.locator('#five-point-order-preview')).toBeHidden();
  await form.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(form.locator('#five-point-order-preview')).toHaveValue(/# 5-punktsordre/);
});

test('generated exports use collapsed ExportReview pattern across mission export tools', async ({ page }) => {
  await createLocalMission(page, { title: `Export review ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Review QA' });

  await openMissionDetails(page, /Sambandsplan/i, 'Eksport');
  const comms = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Sambandsplan' }) });
  await comms.getByLabel(/Primær kanal\/talegruppe/i).fill('Primær etter lokal plan');
  await comms.getByLabel(/Fallback kanal\/kontaktmetode/i).fill('Fallback etter lokal plan');
  await comms.getByLabel(/^Kallesignal$/i).fill('FIG test');
  await comms.getByLabel(/IL-KO kontakt/i).fill('IL-KO generisk');
  await comms.getByLabel(/Distrikt\/beredskapsvakt kontakt/i).fill('Beredskapsvakt generisk');
  await comms.getByLabel(/Innsjekkingsintervall/i).fill('Hver 30. minutt');
  await comms.getByLabel(/Prosedyre ved bortfall av samband/i).fill('Fallback og logg lokalt.');
  await comms.getByLabel(/Batteri-\/ladestatus/i).fill('Fulladet');
  await comms.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await expectCollapsedReview(comms, /Sambandsplan er klar/i);
  await expect(comms.getByLabel(/Sambandsplan/i).last()).toBeHidden();

  await openMissionDetails(page, /Etterrapport/i, 'Eksport');
  const afterAction = page.locator('#etterrapport');
  await afterAction.getByRole('button', { name: /Bygg etterrapport/i }).click();
  await expectCollapsedReview(afterAction, /Etteraksjonsrapport Markdown er klar/i);
  await expect(afterAction.getByLabel(/Etteraksjonsrapport Markdown/i)).toBeHidden();

  await openMissionDetails(page, /RUH og velferd/i, 'Eksport');
  const ruh = page.locator('#ruh-velferd');
  await ruh.getByRole('tab', { name: 'Eksport' }).click();
  await ruh.getByRole('button', { name: /Lag RUH Markdown/i }).click();
  await expectCollapsedReview(ruh, /RUH Markdown er klar/i);
  await expect(ruh.getByLabel(/RUH Markdown/i)).toBeHidden();

  await openMissionDetails(page, /Samlet lokal oppdragsmappe/i, 'Eksport');
  const folder = page.locator('#oppdragsmappe');
  await folder.getByRole('button', { name: /Bygg oppdragsmappe/i }).click();
  await expectCollapsedReview(folder, /Oppdragsmappe Markdown er klar/i);
  await expect(folder.getByLabel(/Oppdragsmappe Markdown/i)).toBeHidden();
});

test('oppdrag mode routing remains stable for default and hash targets', async ({ page }) => {
  await createLocalMission(page, { title: `Hash release ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Hash release QA' });

  await page.goto('/oppdrag');
  await expect(page.getByRole('tab', { name: 'Nå' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: /Situasjon og neste grep/i })).toBeVisible();
  await expect(page.getByText('Primært')).toHaveCount(0);
  await expect(page.getByText('RUH og velferd')).toHaveCount(0);

  await page.goto('/oppdrag#sjekkliste');
  await expect(page.getByRole('tab', { name: 'Arbeid' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#sjekkliste')).toBeVisible();

  await page.goto('/oppdrag#etterrapport');
  await expect(page.getByRole('tab', { name: 'Eksport' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#etterrapport')).toBeVisible();

  await page.goto('/oppdrag#oppdragsmappe');
  await expect(page.getByRole('tab', { name: 'Eksport' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#oppdragsmappe')).toBeVisible();

  await openMissionMode(page, 'Nå');
  await expect(page.getByRole('tab', { name: 'Nå' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Primært')).toHaveCount(0);
});
