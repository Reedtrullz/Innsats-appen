import { expect, test } from '@playwright/test';

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

  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  await page.getByLabel(/Søk lokalt/i).fill('tilfluktsrom');
  await page.getByLabel('Lokalt søk').getByRole('link', { name: /Klargjør.*tilfluktsrom/i }).click();
  await expect(page.getByRole('heading', { name: /Klargjør.*tilfluktsrom/i })).toBeVisible();
  await expect(page.getByText(/Researchbasert støtte, ikke offisiell ordre eller fullstendig oversikt/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kilder' })).toBeVisible();
  await expect(page.getByRole('link', { name: /SRC - Deep research tilfluktsrom.*unverified/i })).toBeVisible();

  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill(missionTitle);
  await page.getByLabel('Rolle').selectOption('beredskapsvakt');
  await page.getByLabel('Fase').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Trondheim sentrum');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByText(missionTitle)).toBeVisible();

  const checklistItem = page.getByLabel(/Kontroller ventilasjon/i);
  await checklistItem.check();
  await expect(checklistItem).toBeChecked();
  await checklistRunPersisted(page, missionTitle);

  await page.waitForFunction(() => 'serviceWorker' in navigator);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(missionTitle)).toBeVisible();
  await expect(page.getByLabel(/Kontroller ventilasjon/i)).toBeChecked();
});
