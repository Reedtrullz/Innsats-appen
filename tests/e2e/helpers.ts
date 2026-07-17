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
  await page.locator('select[name="role"]').selectOption(options.role ?? 'beredskapsvakt');
  await page.getByLabel('Hvor i oppdraget er du nå?').selectOption(options.phase ?? 'for');
  await page.getByLabel('Scenario').selectOption(options.scenario ?? 'tilfluktsrom');
  const missionLocation = options.location ?? 'Trondheim sentrum';
  await page.getByLabel('Sted/lokasjon').fill(missionLocation);
  await page.getByRole('button', { name: /Lagre oppdrag/i }).click();
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`${escapeRegex(options.title)}\\s*·\\s*${escapeRegex(missionLocation)}`, 'i'))).toBeVisible();
}

export async function openMissionMode(page: Page, label: 'Nå' | 'Arbeid' | 'Eksport') {
  const linkLabel = label === 'Nå' ? 'Neste' : label === 'Arbeid' ? 'Sjekkliste' : 'Avslutt';
  const flowNavigation = page.getByRole('navigation', { name: /Oppdragsflyt/i });
  await flowNavigation.getByRole('link', { name: linkLabel, exact: true }).click();
  const target = label === 'Nå' ? '#mission-now-panel' : label === 'Arbeid' ? '#sjekkliste' : '#mission-export-panel';
  await expect(page.locator(target)).toBeInViewport();
}

export async function openMissionDetails(page: Page, summary: string | RegExp, mode?: 'Nå' | 'Arbeid' | 'Eksport') {
  if (mode) await openMissionMode(page, mode);
  const summaryLocator = page.locator('details > summary').filter({ hasText: summary }).first();
  const detailChain: import('@playwright/test').Locator[] = [];
  let currentDetails = summaryLocator.locator('..');
  while (await currentDetails.count()) {
    detailChain.push(currentDetails);
    currentDetails = currentDetails.locator('xpath=ancestor::details[1]');
  }
  for (const details of detailChain.reverse()) {
    if (await details.getAttribute('open') === null) {
      await details.locator(':scope > summary').click();
    }
    await expect(details).toHaveAttribute('open', '');
  }
  await expect(summaryLocator).toBeVisible();
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

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgba {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return { r: 255, g: 255, b: 255, a: 1 };
  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  const [r = 0, g = 0, b = 0, a = 1] = parts;
  return { r, g, b, a: Number.isFinite(a) ? a : 1 };
}

// src-over compositing: `src` painted on top of `dst`.
function over(src: Rgba, dst: Rgba): Rgba {
  const a = src.a + dst.a * (1 - src.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const blend = (s: number, d: number) => (s * src.a + d * dst.a * (1 - src.a)) / a;
  return { r: blend(src.r, dst.r), g: blend(src.g, dst.g), b: blend(src.b, dst.b), a };
}

function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgba, b: Rgba): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Computed-style contrast ratio for the text in `locator` against its effective
 * background — walks ancestors and composites every layer over the page base so
 * opacity-suffix surfaces (`bg-red-50/70`) are measured as actually rendered.
 * Locks the dark-mode contrast bug class (P0-2): light text on light surfaces.
 */
export async function getTextContrastRatio(page: Page, locator: import('@playwright/test').Locator): Promise<number> {
  const { color, backgrounds, baseBackground } = await locator.evaluate((element) => {
    const backgroundStack: string[] = [];
    let node: HTMLElement | null = element as HTMLElement;
    while (node) {
      backgroundStack.push(getComputedStyle(node).backgroundColor);
      node = node.parentElement;
    }
    return {
      color: getComputedStyle(element as HTMLElement).color,
      backgrounds: backgroundStack,
      baseBackground: getComputedStyle(document.documentElement).backgroundColor,
    };
  });

  // Composite from the page base upward; element background is painted last (on top).
  const base = parseColor(baseBackground);
  let surface: Rgba = base.a === 0 ? { r: 255, g: 255, b: 255, a: 1 } : base;
  for (let i = backgrounds.length - 1; i >= 0; i -= 1) {
    surface = over(parseColor(backgrounds[i]), surface);
  }
  const text = over(parseColor(color), surface);
  return contrastRatio(text, surface);
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
