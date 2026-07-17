import { expect, test } from '@playwright/test';
import { openMissionMode } from './helpers';

async function checklistRunPersisted(page: import('@playwright/test').Page, missionTitle: string) {
  await page.waitForFunction(async (title) => {
    const openRequest = indexedDB.open('beredskapsboka-local');
    const database = await new Promise<IDBDatabase | null>((resolve) => {
      openRequest.onerror = () => resolve(null);
      openRequest.onsuccess = () => resolve(openRequest.result);
    });
    if (!database) return false;
    try {
      const missions = await new Promise<any[]>((resolve) => {
        const tx = database.transaction('missions', 'readonly');
        const request = tx.objectStore('missions').getAll();
        request.onerror = () => resolve([]);
        request.onsuccess = () => resolve(request.result);
      });
      const mission = missions.find((item) => item.title === title);
      if (!mission) return false;
      const runs = await new Promise<any[]>((resolve) => {
        const tx = database.transaction('checklistRuns', 'readonly');
        const request = tx.objectStore('checklistRuns').getAll();
        request.onerror = () => resolve([]);
        request.onsuccess = () => resolve(request.result);
      });
      return runs.some((run) => run.missionId === mission.id && run.templateSlug === 'tilfluktsrom-teknisk-status' && run.checkedItemIds.includes('ventilasjon'));
    } finally {
      database.close();
    }
  }, missionTitle, { timeout: 5_000 });
}

test('mobile user can search, open source-backed card, create mission, run checklist, and reopen offline', async ({ page, context }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const missionTitle = `Mobil øvelse tilfluktsrom ${Date.now()}`;

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hva trenger du nå/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Start oppdrag/i })).toHaveAttribute('href', '/oppdrag/ny');
  await expect(page.getByRole('link', { name: /Finn tiltak/i })).toHaveAttribute('href', '/sok?intent=action');
  await expect(page.getByRole('link', { name: /Release readiness/i })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: /Hovednavigasjon/i }).getByRole('link', { name: 'Søk' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveCSS('overflow-x', 'scroll');
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');

  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  await page.getByLabel(/Søk lokalt/i).fill('tilfluktsrom');
  await page.getByLabel('Lokalt søk').getByRole('link', { name: /Klargjør.*tilfluktsrom/i }).click();
  await expect(page.getByRole('heading', { name: /Klargjør.*tilfluktsrom/i })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: 'Ikke offisiell ordre eller fullstendig oversikt' })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: 'skjermede tilfluktsromdata' })).toBeVisible();
  await expect(page.getByText(/Ikke kildegodkjent for pilot/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Kilder' })).toBeVisible();
  const sourceLink = page.getByRole('link', { name: /SRC - Operativt konsept for Sivilforsvaret/i });
  await expect(sourceLink).toBeVisible();
  await expect(sourceLink).toContainText(/·\s*verified/i);
  await expect(sourceLink).toContainText(/Høy kilde-risiko/i);
  await expect(sourceLink).not.toContainText(/unverified/i);

  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill(missionTitle);
  await page.locator('select[name="role"]').selectOption('beredskapsvakt');
  await page.getByLabel('Hvor i oppdraget er du nå?').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Trondheim sentrum');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`${missionTitle}\\s*·\\s*Trondheim sentrum`, 'i'))).toBeVisible();

  await openMissionMode(page, 'Arbeid');
  const checklistItem = page.getByRole('checkbox', { name: /Kontroller ventilasjon/i });
  await checklistItem.check();
  await expect(checklistItem).toBeChecked();
  await checklistRunPersisted(page, missionTitle);

  await page.waitForFunction(() => 'serviceWorker' in navigator);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`${missionTitle}\\s*·\\s*Trondheim sentrum`, 'i'))).toBeVisible();
    await openMissionMode(page, 'Arbeid');
    await expect(page.getByRole('checkbox', { name: /Kontroller ventilasjon/i })).toBeChecked();
  } finally {
    await context.setOffline(false);
  }
});

test('approved illustrations render on the card detail (P1-1)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/kort/flom-pumpe-start');

  // The 7 approved pump images render as figures (linked to a Tiltak step via
  // the P2-2 object-form imageIds; placement is inline under the step).
  const figures = page.locator('figure img[src^="/content-assets/"]');
  await expect(figures).toHaveCount(7);
  for (let i = 0; i < 7; i += 1) {
    const image = figures.nth(i);
    await expect(image).toHaveAttribute('alt', /.+/);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }

  // A card with no approved illustrations renders no card-asset images at all.
  await page.goto('/kort/oppdragsanalyse');
  await expect(page.getByRole('heading', { name: 'Tiltak' })).toBeVisible();
  await expect(page.locator('figure img[src^="/content-assets/"]')).toHaveCount(0);
});
