import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, openMissionDetails } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

async function chooseTheme(page: import('@playwright/test').Page, label: 'System' | 'Lys' | 'Mørk') {
  await page.goto('/mer');
  const themeGroup = page.getByRole('radiogroup', { name: /Fargemodus/i });
  await expect(themeGroup).toBeVisible();
  await themeGroup.getByRole('radio', { name: new RegExp(label, 'i') }).click();
}

async function expectDarkMode(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.themeResolved)).toBe('dark');
}

test('theme selector switches light, dark and system with local persistence', async ({ page }) => {
  await chooseTheme(page, 'Mørk');
  await expectDarkMode(page);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('innsats-theme'))).toBe('dark');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectDarkMode(page);
  await expect(page.getByRole('radio', { name: /Mørk/i })).toHaveAttribute('aria-checked', 'true');

  await chooseTheme(page, 'Lys');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('innsats-theme'))).toBe('light');

  await chooseTheme(page, 'System');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.themePreference)).toBe('system');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('innsats-theme'))).toBe('system');
});

test('core dark-mode surfaces remain coherent on home, bottom nav and Oppdrag Nå', async ({ page }) => {
  await chooseTheme(page, 'Mørk');

  await page.goto('/');
  await expectDarkMode(page);
  await expect(page.getByRole('link', { name: /Beredskapsboka/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /Hovednavigasjon/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Hjem/i })).toHaveCSS('color', 'rgb(255, 255, 255)');

  await createLocalMission(page, { title: `Dark mode ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Dark QA' });
  await expectDarkMode(page);
  await expect(page.getByRole('tab', { name: 'Nå' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: /Situasjon og neste grep/i })).toBeVisible();
  await expect(page.locator('#hurtiglogg')).toBeVisible();
  await expect(page.getByLabel(/Kompakt fremdrift/i)).toBeVisible();
});

test('dark mode keeps quick cards, map and field log controls usable', async ({ page }) => {
  await chooseTheme(page, 'Mørk');

  await page.goto('/hurtigkort');
  await expectDarkMode(page);
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  await expect(page.getByText(/Vis alle og filtrer/i)).toBeVisible();

  await page.goto('/kart');
  await expectDarkMode(page);
  await expect(page.getByRole('heading', { name: 'Kart', exact: true })).toBeVisible();
  await expect(page.getByText(/Lokal kartflate for innsatsstøtte/i)).toBeVisible();

  await createLocalMission(page, { title: `Dark field log ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Field Log Dark QA' });
  await page.goto('/oppdrag#feltlogg');
  await expectDarkMode(page);
  await expect(page.getByRole('tab', { name: 'Arbeid' })).toHaveAttribute('aria-selected', 'true');
  const fieldLog = page.locator('#feltlogg');
  await expect(fieldLog).toBeVisible();
  await expect(fieldLog.getByLabel(/Feltlogg tekst/i)).toBeVisible();
  await expect(fieldLog.getByRole('button', { name: /Legg til feltlogg/i })).toBeVisible();
});

test('dark mode preserves export review and hash-routed export workflow readability', async ({ page }) => {
  await chooseTheme(page, 'Mørk');
  await createLocalMission(page, { title: `Dark export ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Export Dark QA' });

  await page.goto('/oppdrag#etterrapport');
  await expectDarkMode(page);
  await expect(page.getByRole('tab', { name: 'Eksport' })).toHaveAttribute('aria-selected', 'true');
  const afterAction = page.locator('#etterrapport');
  await expect(afterAction).toBeVisible();
  await afterAction.getByRole('button', { name: /Bygg etterrapport/i }).click();
  await expect(afterAction.getByText(/Etteraksjonsrapport Markdown er klar/i)).toBeVisible();
  await expect(afterAction.getByText(/Vis forhåndsvisning/i)).toBeVisible();
  await expect(afterAction.getByLabel(/Etteraksjonsrapport Markdown/i)).toBeHidden();
  await afterAction.getByText(/Vis forhåndsvisning/i).click();
  await expect(afterAction.getByLabel(/Etteraksjonsrapport Markdown/i)).toBeVisible();
});

test('5-punktsordre locked steps and privacy alert remain visible in dark mode', async ({ page }) => {
  await chooseTheme(page, 'Mørk');
  await createLocalMission(page, { title: `Dark warning ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Warning Dark QA' });
  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');

  const form = page.locator('form').filter({ has: page.getByRole('heading', { name: '5-punktsordre' }) });
  await expect(form.getByRole('tab', { name: /Bekreft/i })).toContainText(/Låst/i);
  await expect(form.getByRole('tab', { name: /Eksporter/i })).toContainText(/Låst/i);

  await form.getByRole('tab', { name: /Fem punkter/i }).click();
  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    await form.getByLabel(label).fill(`${label} sanitert test`);
  }
  await form.getByLabel(/Notes/i).fill('pasient Ola Nordmann');
  await form.getByRole('tab', { name: /Bekreft/i }).click();
  await form.getByLabel(/Tilbakelesing\/forstått/i).check();
  await form.getByRole('tab', { name: /Eksporter/i }).click();
  await form.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await expect(form.getByText(/Eksport blokkert/i)).toBeVisible();
});
