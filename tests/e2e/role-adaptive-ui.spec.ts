import { expect, test } from '@playwright/test';

const PROFILE_KEY = 'beredskapsboka-local-profile-v1';

function setProfileRole(page: import('@playwright/test').Page, role: string) {
  return page.addInitScript(([key, r]) => {
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      profileEnabled: true,
      displayName: 'Test',
      callsign: 'TEST',
      preferredRole: r,
      updatedAt: new Date().toISOString(),
    }));
  }, [PROFILE_KEY, role] as const);
}

async function navLabels(page: import('@playwright/test').Page) {
  const nav = page.getByRole('navigation', { name: 'Hovednavigasjon' });
  const items = nav.getByRole('listitem');
  const count = await items.count();
  const labels: string[] = [];
  for (let i = 0; i < count; i += 1) {
    labels.push((await items.nth(i).textContent())?.trim() ?? '');
  }
  return labels;
}

test('default home shows Hva trenger du nå and default nav order', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Hva trenger du nå/i })).toBeVisible();
  expect(await navLabels(page)).toEqual(['Hjem', 'Søk', 'Oppdrag', 'Kort', 'Mer']);
});

test('leder role shows Lederoversikt and leder nav order', async ({ page }) => {
  await setProfileRole(page, 'leder');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Lederoversikt/i })).toBeVisible();
  expect(await navLabels(page)).toEqual(['Hjem', 'Oppdrag', 'Søk', 'Kort', 'Mer']);
});

test('lagforer role shows lagforer nav order', async ({ page }) => {
  await setProfileRole(page, 'lagforer');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('role-selector').getByRole('button').first()).toContainText('Lagfører', { timeout: 5000 });
  expect(await navLabels(page)).toEqual(['Oppdrag', 'Kort', 'Hjem', 'Søk', 'Mer']);
});

test('mannskap role shows simplified hero and mannskap nav order', async ({ page }) => {
  await setProfileRole(page, 'mannskap');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Enkel tilgang/i })).toBeVisible();
  await expect(page.getByText(/Hurtigkort/i).first()).toBeVisible();
  expect(await navLabels(page)).toEqual(['Kort', 'Søk', 'Oppdrag', 'Hjem', 'Mer']);
});

test('role selector switches and reorders nav without page reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const selector = page.getByTestId('role-selector');
  // Retry opening the dropdown: a click landing before React hydration is lost,
  // so keep clicking the trigger until the option is actually visible.
  await expect(async () => {
    await selector.getByRole('button', { name: /Rolle: Ingen/ }).click();
    await expect(page.getByRole('button', { name: 'Lagfører' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await page.getByRole('button', { name: 'Lagfører' }).click();
  await expect(page.getByTestId('role-selector').getByRole('button').first()).toContainText('Lagfører');
  // Nav reorders on the client after the role context updates; poll so the
  // assertion waits for the re-render instead of racing it (one-shot read flakes).
  await expect.poll(() => navLabels(page)).toEqual(['Oppdrag', 'Kort', 'Hjem', 'Søk', 'Mer']);
});
