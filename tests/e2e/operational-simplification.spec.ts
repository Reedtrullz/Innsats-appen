import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, openMissionDetails, openMissionMode } from './helpers';

test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('home first viewport keeps triage to two state-aware primary actions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hva trenger du nå/i })).toBeVisible();
  const primaryActions = page.locator('[data-primary-actions="home"] a');
  await expect(primaryActions).toHaveCount(2);
  await expect(primaryActions.nth(0)).toContainText(/Start oppdrag/i);
  await expect(primaryActions.nth(1)).toContainText(/Finn tiltak/i);
});

test('hurtigkort defaults to compact browsing rows with filters behind disclosure', async ({ page }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Kritiske tiltak/i })).toBeVisible();
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

  await expect(page.getByRole('heading', { name: /Neste handling/i })).toBeVisible();
  // The guided runbook is the default Nå experience (replaced the old
  // "Gjør dette først" card).
  await expect(page.getByText(/Anbefalt rekkefølge — ikke en kommando/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Sjekkliste og verktøy/i })).toBeVisible();
  await expect(page.getByText('Oppdragsverktøy', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Avslutt oppdrag/i })).toBeVisible();

  await openMissionMode(page, 'Eksport');
  await expect(page.getByText('Avansert / dokumentasjon')).toBeVisible();
  await expect(page.locator('details').filter({ hasText: 'Avansert / dokumentasjon' })).not.toHaveAttribute('open', '');
  await expect(page.getByText('Primært', { exact: true })).toBeVisible();
  await expect(page.locator('details').filter({ has: page.getByText('5-punktsordre', { exact: true }) }).last()).not.toHaveAttribute('open', '');
});

test('oppdrag hash targets resolve within the continuous mission spine', async ({ page }) => {
  await createLocalMission(page, {
    title: `Hashmodus ${Date.now()}`,
    phase: 'under',
    scenario: 'flom',
    location: 'Hash QA',
  });

  await page.goto('/oppdrag#etterrapport');
  await expect(page.getByRole('heading', { name: /Avslutt oppdrag/i })).toBeVisible();
  await expect(page.locator('#etterrapport')).toBeVisible();
  await expect(page.locator('#etterrapport')).toBeInViewport();

  await page.goto('/oppdrag#sjekkliste');
  await expect(page.getByRole('heading', { name: /Sjekkliste og verktøy/i })).toBeVisible();
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
  // Un-gated order form: no wizard tabs, all points visible immediately, and
  // export stays disabled only while the form is empty (no preview yet).
  await expect(orderForm.getByRole('tab')).toHaveCount(0);
  await expect(orderForm.getByLabel('Situasjon')).toBeVisible();
  await expect(orderForm.getByRole('button', { name: /Eksporter Markdown/i })).toBeDisabled();
  await expect(orderForm.locator('pre')).toHaveCount(0);

  await openMissionDetails(page, /RUH og velferd/i, 'Eksport');
  const ruhSection = page.locator('#ruh-velferd');
  await expect(ruhSection.getByRole('tab', { name: 'RUH' })).toHaveAttribute('aria-selected', 'true');
  await expect(ruhSection.getByLabel(/Fysisk belastning/i)).toBeHidden();
  await expect(ruhSection.getByText(/RUH\/velferd eksport/i)).toBeHidden();
  await expect(ruhSection.getByLabel(/Hva skjedde/i)).toBeVisible();
  await ruhSection.getByRole('tab', { name: 'Velferd' }).click();
  await expect(ruhSection.getByLabel(/Fysisk belastning/i)).toBeVisible();
  await expect(ruhSection.getByLabel(/Hva skjedde/i)).toBeHidden();
  await ruhSection.getByRole('tab', { name: 'Eksport' }).click();
  await expect(ruhSection.getByText(/RUH\/velferd eksport/i)).toBeVisible();
  await expect(ruhSection.getByLabel(/Hva skjedde/i)).toBeHidden();
  await expect(ruhSection.getByLabel(/Fysisk belastning/i)).toBeHidden();
});

test('mer keeps admin and release links out of the first operational viewport', async ({ page }) => {
  await page.goto('/mer');
  await expect(page.getByRole('heading', { name: 'Mer' })).toBeVisible();
  await expect(page.getByText('Utvikling og publisering')).toBeVisible();
  await expect(page.getByRole('link', { name: /Release readiness/i })).toHaveCount(0);
});
