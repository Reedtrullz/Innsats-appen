import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, getTextContrastRatio, openMissionDetails, openMissionMode } from './helpers';

const WCAG_AA_NORMAL_TEXT = 4.5;

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('direct route load applies system dark mode before visiting Mer', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  await expectDarkMode(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.themePreference)).toBe('system');
  await expect(page.getByRole('heading', { name: /Hva trenger du nå/i })).toBeVisible();
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
  await expect(page.getByRole('navigation', { name: /Oppdragsflyt/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Neste handling/i })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: /Sjekkliste og verktøy/i })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: /Avslutt oppdrag/i })).toBeVisible();
  const afterAction = page.locator('#etterrapport');
  await expect(afterAction).toBeVisible();
  await afterAction.getByRole('button', { name: /Bygg etterrapport/i }).click();
  await expect(afterAction.getByText(/Etteraksjonsrapport Markdown er klar/i)).toBeVisible();
  await expect(afterAction.getByText(/Vis forhåndsvisning/i)).toBeVisible();
  await expect(afterAction.getByLabel(/Etteraksjonsrapport Markdown/i)).toBeHidden();
  await afterAction.getByText(/Vis forhåndsvisning/i).click();
  await expect(afterAction.getByLabel(/Etteraksjonsrapport Markdown/i)).toBeVisible();
});

test('dark-mode priority surfaces meet WCAG AA contrast (regression lock for P0-1)', async ({ page }) => {
  await chooseTheme(page, 'Mørk');

  // High-priority quick card: title on the red surface. This is the surface that
  // silently broke when `.dark` flipped the text light but missed the gradient/
  // opacity background — the original bug class this test locks.
  await page.goto('/hurtigkort');
  await expectDarkMode(page);
  const criticalSection = page.locator('section[aria-labelledby="hurtigkort-critical-heading"]');
  await expect(criticalSection).toBeVisible();
  const criticalTitle = criticalSection.locator('a .font-black').first();
  await expect(criticalTitle).toBeVisible();
  expect(await getTextContrastRatio(page, criticalTitle)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);

  // Search result title on the priority surface. Priority metadata is no longer
  // repeated in the compact row, but the surface still conveys urgency.
  await page.getByRole('searchbox').first().fill('tilfluktsrom');
  const highPriorityResult = page.getByLabel('Lokalt søk').locator('article').first().getByRole('link').first();
  await expect(highPriorityResult).toBeVisible();
  expect(await getTextContrastRatio(page, highPriorityResult)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);

  // Required checklist item (amber surface) in the work view.
  await createLocalMission(page, { title: `Kontrast ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Kontrast QA' });
  await openMissionMode(page, 'Arbeid');
  const requiredItem = page.locator('li', { has: page.getByText('Påkrevd', { exact: true }) }).first();
  await expect(requiredItem).toBeVisible();
  expect(await getTextContrastRatio(page, requiredItem.locator('label').first())).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
});

test('light-mode priority surfaces also meet WCAG AA contrast', async ({ page }) => {
  // Same priority surfaces as the dark regression lock, asserted in light mode so
  // a future palette change cannot regress either theme silently.
  await chooseTheme(page, 'Lys');

  await page.goto('/hurtigkort');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
  const criticalSection = page.locator('section[aria-labelledby="hurtigkort-critical-heading"]');
  await expect(criticalSection).toBeVisible();
  const criticalTitle = criticalSection.locator('a .font-black').first();
  await expect(criticalTitle).toBeVisible();
  expect(await getTextContrastRatio(page, criticalTitle)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);

  await page.getByRole('searchbox').first().fill('tilfluktsrom');
  const highPriorityResult = page.getByLabel('Lokalt søk').locator('article').first().getByRole('link').first();
  await expect(highPriorityResult).toBeVisible();
  expect(await getTextContrastRatio(page, highPriorityResult)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);

  await createLocalMission(page, { title: `Kontrast lys ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Kontrast lys QA' });
  await openMissionMode(page, 'Arbeid');
  const requiredItem = page.locator('li', { has: page.getByText('Påkrevd', { exact: true }) }).first();
  await expect(requiredItem).toBeVisible();
  expect(await getTextContrastRatio(page, requiredItem.locator('label').first())).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
});

test('feltmodus header toggle stays WCAG-legible when active in dark mode', async ({ page }) => {
  // The active "Felt" pill is a saturated emerald surface in the navy header.
  // It previously carried text-emerald-950, which `.dark` flips light → light
  // text on bright green. Locks the mid-tone-surface variant of the bug class.
  await chooseTheme(page, 'Mørk');
  await page.goto('/');
  await expectDarkMode(page);

  // Scope to the shell-header toggle via its "(snarvei i toppmeny)" suffix —
  // the home quick-toggle exposes a bare "Feltmodus av" name that would clash.
  const feltToggle = page.getByRole('button', { name: /Feltmodus av \(snarvei i toppmeny\)/i });
  await expect(feltToggle).toBeVisible();
  await feltToggle.click();

  const activePill = page.getByRole('button', { name: /Feltmodus på \(snarvei i toppmeny\)/i });
  await expect(activePill).toBeVisible();
  expect(await getTextContrastRatio(page, activePill)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
});

test('5-punktsordre stays readable and privacy alert remains visible in dark mode', async ({ page }) => {
  await chooseTheme(page, 'Mørk');
  await createLocalMission(page, { title: `Dark warning ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Warning Dark QA' });
  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');

  const form = page.locator('form').filter({ has: page.getByRole('heading', { name: '5-punktsordre' }) });
  // Un-gated form: no locked wizard steps. The local-support notice and the
  // export-blocking privacy alert must stay legible in dark mode.
  await expect(form.getByRole('tab')).toHaveCount(0);
  await expect(form.getByText(/Lokal beslutningsstøtte/i)).toBeVisible();

  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    await form.getByLabel(label).fill(`${label} sanitert test`);
  }
  await form.getByLabel(/Notater/i).fill('pasient Ola Nordmann');
  await form.getByLabel(/Tilbakelesing\/forstått/i).check();
  await form.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await expect(form.getByText(/Eksport blokkert/i)).toBeVisible();
});
