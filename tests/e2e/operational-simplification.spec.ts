import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, openMissionDetails, openMissionMode } from './helpers';

test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('home first viewport keeps triage to three primary actions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hva trenger du nå/i })).toBeVisible();
  const primaryActions = page.locator('[data-primary-actions="home"] a');
  await expect(primaryActions).toHaveCount(3);
  await expect(primaryActions.nth(0)).toContainText(/Fortsett\/start oppdrag/i);
  await expect(primaryActions.nth(1)).toContainText(/Finn kritisk tiltak/i);
  await expect(primaryActions.nth(2)).toContainText(/^Søk/i);
});

test('hurtigkort defaults to compact browsing rows with filters behind disclosure', async ({ page }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Kritisk nå/i })).toBeVisible();
  await expect(page.getByText(/Vis alle og filtrer/i)).toBeVisible();
  await expect(page.getByText(/Gjør først/i)).toHaveCount(0);
});

test('oppdrag opens on Nå and keeps export tools secondary', async ({ page }) => {
  await createLocalMission(page, {
    title: `Forenkling ${Date.now()}`,
    phase: 'under',
    scenario: 'flom',
    location: 'Mobil QA',
  });

  await expect(page.getByRole('heading', { name: /Situasjon og neste grep/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Gjør dette først/i })).toBeVisible();
  await expect(page.getByText('Avansert / dokumentasjon')).toHaveCount(0);
  await expect(page.getByText('Primært')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Kart og logg/i })).toHaveCount(0);
  await expect(page.getByText('RUH og velferd')).toHaveCount(0);
  await expect(page.getByText('MBK / materiellberedskap')).toHaveCount(0);

  await openMissionMode(page, 'Eksport');
  await expect(page.getByText('Avansert / dokumentasjon')).toBeVisible();
  await expect(page.locator('details').filter({ hasText: 'Avansert / dokumentasjon' })).not.toHaveAttribute('open', '');
  await expect(page.getByText('Primært', { exact: true })).toBeVisible();
  await expect(page.locator('details').filter({ hasText: /5-punktsordre/ })).not.toHaveAttribute('open', '');
});

test('oppdrag hash targets switch to the correct calmer mode', async ({ page }) => {
  await createLocalMission(page, {
    title: `Hashmodus ${Date.now()}`,
    phase: 'under',
    scenario: 'flom',
    location: 'Hash QA',
  });

  await page.goto('/oppdrag#etterrapport');
  await expect(page.getByRole('tab', { name: 'Eksport' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#etterrapport')).toBeVisible();
  await expect(page.locator('#etterrapport')).toBeInViewport();

  await page.goto('/oppdrag#sjekkliste');
  await expect(page.getByRole('tab', { name: 'Arbeid' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#sjekkliste')).toBeVisible();
  await expect(page.locator('#sjekkliste')).toBeInViewport();
});

test('export forms start staged and collapsed', async ({ page }) => {
  await createLocalMission(page, {
    title: `Staged export ${Date.now()}`,
    phase: 'under',
    scenario: 'flom',
    location: 'Eksport QA',
  });

  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');
  const orderForm = page.locator('form').filter({ has: page.getByRole('heading', { name: '5-punktsordre' }) });
  await expect(orderForm.getByRole('tab', { name: 'Mal' })).toHaveAttribute('aria-selected', 'true');
  await expect(orderForm.getByLabel('Situasjon')).toBeHidden();
  await expect(orderForm.locator('pre')).toHaveCount(0);

  await openMissionDetails(page, /RUH og velferd/i, 'Eksport');
  const ruhSection = page.locator('#ruh-velferd');
  await expect(ruhSection.getByRole('tab', { name: 'RUH' })).toHaveAttribute('aria-selected', 'true');
  await expect(ruhSection.getByLabel(/Fysisk belastning/i)).toBeHidden();
  await expect(ruhSection.getByText(/RUH\/velferd eksport/i)).toBeHidden();
});

test('mer keeps admin and release links out of the first operational viewport', async ({ page }) => {
  await page.goto('/mer');
  await expect(page.getByRole('heading', { name: 'Mer' })).toBeVisible();
  await expect(page.getByText('Utvikling og publisering')).toBeVisible();
  await expect(page.getByRole('link', { name: /Release readiness/i })).toHaveCount(0);
});
