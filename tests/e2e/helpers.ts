import { expect, type BrowserContext, type Page } from '@playwright/test';

export async function clearBrowserLocalState(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('beredskapsboka-local');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
}

export async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() => 'serviceWorker' in navigator);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

export async function createLocalMission(page: Page, options: {
  title: string;
  role?: string;
  phase?: string;
  scenario?: string;
  location?: string;
}) {
  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel').fill(options.title);
  await page.getByLabel('Rolle').selectOption(options.role ?? 'beredskapsvakt');
  await page.getByLabel('Fase').selectOption(options.phase ?? 'for');
  await page.getByLabel('Scenario').selectOption(options.scenario ?? 'tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill(options.location ?? 'Trondheim sentrum');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByRole('heading', { name: options.title })).toBeVisible();
}

export async function readLocalDatabaseCounts(page: Page) {
  return page.evaluate(async () => {
    const openRequest = indexedDB.open('beredskapsboka-local');
    const database = await new Promise<IDBDatabase | null>((resolve) => {
      openRequest.onerror = () => resolve(null);
      openRequest.onsuccess = () => resolve(openRequest.result);
    });
    if (!database) return { missions: 0, archivedMissions: 0, checklistRuns: 0 };
    const readStore = async (storeName: string) => {
      if (!database.objectStoreNames.contains(storeName)) return [];
      return new Promise<unknown[]>((resolve) => {
        const tx = database.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onerror = () => resolve([]);
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      });
    };
    try {
      const missions = await readStore('missions') as Array<{ archivedAt?: string | null }>;
      const checklistRuns = await readStore('checklistRuns');
      return {
        missions: missions.filter((mission) => !mission.archivedAt).length,
        archivedMissions: missions.filter((mission) => Boolean(mission.archivedAt)).length,
        checklistRuns: checklistRuns.length,
      };
    } finally {
      database.close();
    }
  });
}

export async function expectOfflineReloadPreservesMission(page: Page, context: BrowserContext, missionTitle: string) {
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: missionTitle })).toBeVisible();
  await context.setOffline(false);
}
