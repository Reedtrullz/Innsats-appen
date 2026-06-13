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

test('5-punktsordre one-screen form shows progress, never locks, and renders collapsed ExportReview', async ({ page }) => {
  await createLocalMission(page, { title: `Guided ordre ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Release QA' });
  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');
  const form = orderForm(page);

  // One-screen form: no wizard tabs, export disabled only while empty.
  await expect(form.getByRole('tab')).toHaveCount(0);
  await expect(form.getByRole('button', { name: /Eksporter Markdown/i })).toBeDisabled();

  await fillOrderPoints(form);
  await expect(form.getByRole('button', { name: /Eksporter Markdown/i })).toBeEnabled();
  await form.getByLabel(/Tilbakelesing\/forstått/i).check();

  await form.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await expectCollapsedReview(form, /Eksport er klar/i);
  await expect(form.locator('#five-point-order-preview')).toBeHidden();
  await form.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(form.locator('#five-point-order-preview')).toHaveValue(/# 5-punktsordre/);
});

test('generated exports use collapsed ExportReview pattern across mission export tools', async ({ page }) => {
  await createLocalMission(page, { title: `Export review ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Review QA' });

  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');
  const order = orderForm(page);
  await fillOrderPoints(order);
  await order.getByLabel(/Tilbakelesing\/forstått/i).check();
  await order.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await expectCollapsedReview(order, /Eksport er klar/i);
  await expect(order.locator('#five-point-order-preview')).toBeHidden();
  await order.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(order.locator('#five-point-order-preview')).toHaveValue(/# 5-punktsordre/);

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

  await openMissionDetails(page, /Lokal statusrapport/i, 'Eksport');
  const status = page.locator('#statusrapport');
  await status.getByRole('button', { name: /Lag lokal statusrapport/i }).click();
  await expectCollapsedReview(status, /Lokal statusrapport er klar/i);
  await expect(status.locator('#local-status-summary-markdown')).toBeHidden();

  await openMissionDetails(page, /MBK \/ materiellberedskap/i, 'Eksport');
  const mbk = page.locator('section').filter({ has: page.getByRole('heading', { name: /Materiellberedskap \/ MBK/i }) }).first();
  await mbk.getByRole('button', { name: /Lag MBK Markdown/i }).click();
  await expectCollapsedReview(mbk, /MBK materiellstatus Markdown er klar/i);
  await expect(mbk.locator('#mbk-equipment-markdown')).toBeHidden();
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
  await expect(page.locator('#sjekkliste')).toBeInViewport();

  await page.goto('/oppdrag#kart');
  await expect(page.getByRole('tab', { name: 'Arbeid' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#kart')).toBeVisible();
  await expect(page.locator('#kart')).toBeInViewport();

  await page.goto('/oppdrag#etterrapport');
  await expect(page.getByRole('tab', { name: 'Eksport' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#etterrapport')).toBeVisible();
  await expect(page.locator('#etterrapport')).toBeInViewport();

  await page.goto('/oppdrag#oppdragsmappe');
  await expect(page.getByRole('tab', { name: 'Eksport' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#oppdragsmappe')).toBeVisible();
  await expect(page.locator('#oppdragsmappe')).toBeInViewport();

  await openMissionMode(page, 'Nå');
  await expect(page.getByRole('tab', { name: 'Nå' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Primært')).toHaveCount(0);
});

test('warning discipline keeps privacy errors blocking and generic notices contained', async ({ page }) => {
  await createLocalMission(page, { title: `Warning discipline ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Warning QA' });

  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');
  const order = orderForm(page);
  await fillOrderPoints(order);
  await order.getByLabel(/Notater/i).fill('pasient Ola Nordmann');
  await order.getByLabel(/Tilbakelesing\/forstått/i).check();
  await order.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await expect(order.getByText(/Eksport blokkert/i)).toBeVisible();

  await openMissionDetails(page, /Feltlogg/i, 'Arbeid');
  const fieldLog = page.locator('#feltlogg');
  await fieldLog.getByLabel(/Feltlogg tekst/i).fill('pasient Ola Nordmann');
  await fieldLog.getByRole('button', { name: /Legg til feltlogg/i }).click();
  await expect(fieldLog.getByRole('alert', { name: /feltlogg personvern/i })).toBeVisible();

  await openMissionDetails(page, /RUH og velferd/i, 'Eksport');
  const ruh = page.locator('#ruh-velferd');
  await expect(ruh.getByText(/Ikke legg inn persondata eller pasientdata/i)).toHaveCount(1);

  await openMissionMode(page, 'Nå');
  await expect(page.getByRole('heading', { name: /Situasjon og neste grep/i })).toBeVisible();

  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByText(/Eksport blokkert|Lag .*Markdown|Lag .*JSON/i)).toHaveCount(0);
});
