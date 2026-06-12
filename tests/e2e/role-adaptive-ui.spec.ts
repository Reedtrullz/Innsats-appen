import { expect, test } from '@playwright/test';

const PROFILE_KEY = 'beredskapsboka-local-profile-v1';

// Navigation is deliberately identical for every role: spatial memory matters
// more in the field than per-role ranking. Role adapts page content only.
const STABLE_NAV = ['Hjem', 'Søk', 'Oppdrag', 'Kort', 'Mer'];

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

test('default home shows Hva trenger du nå and the stable nav order', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Hva trenger du nå/i })).toBeVisible();
  expect(await navLabels(page)).toEqual(STABLE_NAV);
});

test('leder role adapts home content but keeps the same nav order', async ({ page }) => {
  await setProfileRole(page, 'leder');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Lederoversikt/i })).toBeVisible();
  expect(await navLabels(page)).toEqual(STABLE_NAV);
});

test('mannskap role shows simplified hero and keeps the same nav order', async ({ page }) => {
  await setProfileRole(page, 'mannskap');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Enkel tilgang/i })).toBeVisible();
  await expect(page.getByText(/Hurtigkort/i).first()).toBeVisible();
  expect(await navLabels(page)).toEqual(STABLE_NAV);
});

test('the home role lens is the single role picker and switches content without reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // The header has no role selector; the lens on home is the only picker.
  await expect(page.getByTestId('role-selector')).toHaveCount(0);
  const lens = page.getByRole('radiogroup', { name: 'Rollevisning' });
  await expect(lens).toBeVisible();
  // Retry the first click: one landing before React hydration is lost.
  await expect(async () => {
    await lens.getByText('Lagfører', { exact: true }).click();
    await expect(lens.getByRole('radio', { name: 'Lagfører' })).toBeChecked({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  // Lagfører keeps the default hero title; content adapts via hero buttons.
  await expect(page.getByRole('heading', { name: /Hva trenger du nå/i })).toBeVisible();
  expect(await navLabels(page)).toEqual(STABLE_NAV);
});
