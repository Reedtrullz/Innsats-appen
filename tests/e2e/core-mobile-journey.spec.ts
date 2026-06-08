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
  await expect(page.getByRole('link', { name: /Fortsett\/start oppdrag/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Søk/i }).first()).toHaveAttribute('href', '/sok');
  await expect(page.getByRole('link', { name: /Release readiness/i })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: /Hovednavigasjon/i }).getByRole('link', { name: 'Søk' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveCSS('overflow-x', 'scroll');
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');

  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  await page.getByLabel(/Søk lokalt/i).fill('tilfluktsrom');
  await page.getByLabel('Lokalt søk').getByRole('link', { name: /Klargjør.*tilfluktsrom/i }).click();
  await expect(page.getByRole('heading', { name: /Klargjør.*tilfluktsrom/i })).toBeVisible();
  await expect(page.getByText('Ikke offisiell ordre eller fullstendig oversikt. Bruk bare godkjent informasjon; ikke publiser private eller skjermede tilfluktsromdata.')).toBeVisible();
  await expect(page.getByText('Ikke publiser private eller skjermede tilfluktsromdata i appen.')).toBeVisible();
  await expect(page.getByText(/Ikke kildegodkjent for pilot/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Kilder' })).toBeVisible();
  const sourceLink = page.getByRole('link', { name: /SRC - Operativt konsept for Sivilforsvaret/i });
  await expect(sourceLink).toBeVisible();
  await expect(sourceLink).toContainText(/·\s*verified/i);
  await expect(sourceLink).toContainText(/Høy kilde-risiko/i);
  await expect(sourceLink).not.toContainText(/unverified/i);

  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill(missionTitle);
  await page.getByLabel('Rolle').selectOption('beredskapsvakt');
  await page.getByLabel('Fase').selectOption('for');
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
