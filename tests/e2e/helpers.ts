import { expect, type BrowserContext, type Page } from '@playwright/test';

const LOCAL_DB_NAME = 'beredskapsboka-local';

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

export async function clearBrowserLocalState(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (databaseName) => {
    localStorage.clear();
    sessionStorage.clear();

    const databases = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
    const exists = databases.some((database) => database.name === databaseName);
    if (!exists) return;

    const openRequest = indexedDB.open(databaseName);
    const database = await new Promise<IDBDatabase | null>((resolve, reject) => {
      openRequest.onerror = () => reject(openRequest.error ?? new Error(`Failed to open ${databaseName} IndexedDB for cleanup.`));
      openRequest.onsuccess = () => resolve(openRequest.result);
    });
    if (!database) return;

    try {
      const storeNames = Array.from(database.objectStoreNames);
      if (storeNames.length === 0) return;
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(storeNames, 'readwrite');
        transaction.onerror = () => reject(transaction.error ?? new Error(`Failed to clear ${databaseName} IndexedDB.`));
        transaction.onabort = () => reject(transaction.error ?? new Error(`Clearing ${databaseName} IndexedDB was aborted.`));
        transaction.oncomplete = () => resolve();
        for (const storeName of storeNames) {
          transaction.objectStore(storeName).clear();
        }
      });
    } finally {
      database.close();
    }
  }, LOCAL_DB_NAME);

  await expect.poll(async () => readLocalDatabaseCounts(page), { timeout: 5_000 }).toEqual({ missions: 0, archivedMissions: 0, checklistRuns: 0 });
}

export async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() => 'serviceWorker' in navigator, undefined, { timeout: 5_000 });
  await page.evaluate(async () => {
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Timed out waiting for service worker readiness.')), 30_000);
    });
    const registration = await Promise.race([navigator.serviceWorker.ready, timeout]);
    if (!navigator.serviceWorker.controller && !registration.active) {
      throw new Error('Service worker registered but no active worker/controller is available.');
    }
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
  const missionLocation = options.location ?? 'Trondheim sentrum';
  await page.getByLabel('Sted/lokasjon').fill(missionLocation);
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`${escapeRegex(options.title)}\\s*·\\s*${escapeRegex(missionLocation)}`, 'i'))).toBeVisible();
}

export async function readLocalDatabaseCounts(page: Page) {
  return page.evaluate(async (databaseName) => {
    const databases = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
    const exists = databases.some((database) => database.name === databaseName);
    if (!exists) return { missions: 0, archivedMissions: 0, checklistRuns: 0 };

    const openRequest = indexedDB.open(databaseName);
    const database = await new Promise<IDBDatabase | null>((resolve) => {
      openRequest.onerror = () => resolve(null);
      openRequest.onsuccess = () => resolve(openRequest.result);
    });
    if (!database) return { missions: 0, archivedMissions: 0, checklistRuns: 0 };
    const readStore = async (storeName: string) => {
      if (!database.objectStoreNames.contains(storeName)) return [];
      return new Promise<unknown[]>((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).getAll();
        request.onerror = () => reject(request.error ?? new Error(`Failed to read ${storeName}.`));
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
  }, LOCAL_DB_NAME);
}

export async function expectOfflineReloadPreservesMission(page: Page, context: BrowserContext, missionTitle: string) {
  await waitForServiceWorker(page);
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`${escapeRegex(missionTitle)}\\s*·`, 'i'))).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
}
