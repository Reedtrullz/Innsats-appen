import { expect, test } from '@playwright/test';
import { clearBrowserLocalState, openMissionDetails } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('help page starts a demo incident and routes into core practice flows', async ({ page }) => {
  await page.goto('/hjelp');
  await expect(page.getByRole('heading', { name: /Lær flytene i Innsats-appen/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Jeg står i innsats/i })).toHaveAttribute('href', '/under');
  await expect(page.getByRole('heading', { name: /Tre separate treningsflyter/i })).toBeVisible();

  await page.getByRole('link', { name: 'Lagfører', exact: true }).click();
  await expect(page).toHaveURL(/\/hjelp#tren-lagforer/);
  await expect(page.getByRole('heading', { name: /Treningsflyt for lagfører/i })).toBeVisible();
  await page.getByRole('link', { name: /Øv kart/i }).click();
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();

  await page.goto('/hjelp');
  await page.getByRole('button', { name: /Start demo/i }).click();
  await expect(page.getByRole('status')).toContainText(/Demohendelse er klar/i);

  await page.getByRole('link', { name: /Åpne demooppdrag/i }).click();
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(/DEMO: Flom ved idrettshall/i).first()).toBeVisible();
  await openMissionDetails(page, /Loggoversikt og lokale oppgaver/i, 'Arbeid');
  await expect(page.getByText(/Etabler møteplass/i).first()).toBeVisible();

  await page.goto('/hjelp');
  await page.getByRole('link', { name: /Søk etter flom/i }).click();
  await expect(page).toHaveURL(/\/sok\?q=flom/);
  await expect(page.getByRole('heading', { name: /Topptreff/i })).toBeVisible();

  await page.goto('/hjelp');
  await page.getByRole('link', { name: 'Åpne kart', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  await expect(page.getByTestId('operations-marker-list')).toContainText(/Lavpunkt nord/i);
});
