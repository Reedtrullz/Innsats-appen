import { expect, test } from '@playwright/test';

test('creates and reopens a local mission offline', async ({ page, context }) => {
  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill('Øvelse tilfluktsrom');
  await page.locator('select[name="role"]').selectOption('beredskapsvakt');
  await page.getByLabel('Hvor i oppdraget er du nå?').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Trondheim sentrum');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(/Øvelse tilfluktsrom\s*·\s*Trondheim sentrum/i)).toBeVisible();
  await expect(page.getByTestId('privacy-message')).toContainText(/Lagres bare lokalt/i);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
    await expect(page.getByText(/Øvelse tilfluktsrom\s*·\s*Trondheim sentrum/i)).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('advances Før → Under by confirmation and preserves per-phase progress when stepping back', async ({ page }) => {
  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill('Øvelse faseflyt');
  await page.locator('select[name="role"]').selectOption('leder');
  await page.getByLabel('Hvor i oppdraget er du nå?').selectOption('for');
  await page.getByLabel('Scenario').selectOption('brann');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();

  // Resolve every step of the 'for' phase via the guided Nå runbook (6 items —
  // the CTA only appears once no step is current, i.e. the optional one too).
  for (let done = 1; done <= 6; done += 1) {
    await page.getByRole('button', { name: /Gjort · neste/i }).first().click();
    await expect(page.getByText(new RegExp(`${done} gjort`))).toBeVisible();
  }

  // One-tap confirmation appears only once required steps are resolved.
  const advance = page.getByRole('button', { name: /Gå til Under/i });
  await expect(advance).toBeVisible();
  await advance.click();

  // Phase swapped: the runbook now reflects the 'under' checklist.
  await expect(page.getByText('Brann/skogbrann under innsats')).toBeVisible();

  // Free navigation back to 'for' must keep its checkmarks (own ChecklistRun).
  await page.getByRole('navigation', { name: 'Faser' }).getByRole('button', { name: /Før/ }).click();
  await expect(page.getByText('Alle anbefalte steg er gjort')).toBeVisible();
});
