import { expect, test, type Locator, type Page } from '@playwright/test';

import { waitForServiceWorker } from './helpers';

const routeHeadings: Record<string, RegExp> = {
  '/': /Hva står du i nå/i,
  '/ma-leses': /Må leses/i,
  '/mer': /^Mer$/i,
  '/begrensninger': /Operative grenser/i,
  '/kjente-begrensninger': /Kjente begrensninger/i,
  '/data-pa-enheten': /Data lagret på denne enheten/i,
  '/oppdrag/ny': /Opprett lokalt oppdrag/i,
  '/sok': /Søk i tiltak, kilder og moduler/i,
  '/for': /^Før$/i,
  '/under': /^Under$/i,
  '/etter': /^Etter$/i,
  '/kilder': /^Kilder$/i,
  '/kort/alvorlig-ulykke-dod-eget-personell': /Alvorlig ulykke eller død blant eget personell/i,
  '/kort/psykologisk-forstehjelp-sekvens': /Psykologisk førstehjelp steg for steg/i,
  '/kort/sambandsplan-start': /Start sambandsplan/i,
  '/oppdrag': /Lokale oppdrag/i,
  '/hurtigkort': /Hurtigkort/i,
  '/laering': /Opplæring/i,
  '/kart': /^Kart$/i,
  '/feltmodus': /Feltmodus/i,
  '/personvern': /Lokal profil og personvern/i,
  '/release': /Innsats-app pilot/i,
  '/kildegjennomgang': /Kildegjennomgang/i,
  '/datakilder': /Eksterne datakilder/i,
  '/endringer': /Endringslogg/i,
};

async function visibleInternalRoutes(locator: Locator) {
  return locator.evaluateAll((links) => Array.from(new Set(links
    .map((link) => link.getAttribute('href')?.split('#')[0].split('?')[0] ?? '')
    .filter((href) => href.startsWith('/')))));
}

async function expectOfflineRoute(page: Page, route: string) {
  const heading = routeHeadings[route];
  expect(heading, `missing offline heading expectation for visible route ${route}`).toBeDefined();
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  if (route !== '/release') await expect(page.getByRole('navigation', { name: /Hovednavigasjon/i })).toBeVisible();
}

async function expectVisibleRoutesWorkOffline(page: Page, routes: string[], sourceLabel: string) {
  const missingExpectations = routes.filter((route) => !routeHeadings[route]);
  expect(missingExpectations, `${sourceLabel} has visible routes without offline heading expectations`).toEqual([]);
  for (const route of routes) {
    await expectOfflineRoute(page, route);
  }
}

test('visible app-shell and boundary links load offline after service-worker warmup', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hva står du i nå/i })).toBeVisible();
  await waitForServiceWorker(page);

  await context.setOffline(true);
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const homeRoutes = await visibleInternalRoutes(page.locator('a[href^="/"]'));
    await expectVisibleRoutesWorkOffline(page, homeRoutes, 'home page');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const decisionNoticeRoutes = await visibleInternalRoutes(page.locator('section[aria-label="Operativ grense og lokal datalagring"] a[href^="/"]'));
    expect(decisionNoticeRoutes).toEqual(['/begrensninger', '/kjente-begrensninger', '/data-pa-enheten']);
    await expectVisibleRoutesWorkOffline(page, decisionNoticeRoutes, 'decision-support notice');

    await page.goto('/mer', { waitUntil: 'domcontentloaded' });
    const moreRoutes = await visibleInternalRoutes(page.locator('a[href^="/"]'));
    await expectVisibleRoutesWorkOffline(page, moreRoutes, 'More page');
  } finally {
    await context.setOffline(false);
  }
});

test('serves shell and generated content offline with stale label', async ({ page, context }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  const version = await page.getByTestId('content-version').textContent();
  expect(version).toBeTruthy();

  await waitForServiceWorker(page);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Beredskapsboka' })).toBeVisible();
    await expect(page.getByTestId('content-version')).toHaveText(version ?? '');
    await expect(page.getByTestId('offline-status')).toContainText(/offline|frakoblet|stale/i);
    await expect(page.getByText(/5-punktsordre/i)).toBeVisible();

    await page.locator('a[href="/kort/tilfluktsrom-klargjoring"]').first().click();
    await expect(page.getByRole('heading', { name: /Klargjør offentlig tilfluktsrom/i })).toBeVisible();
    await page.locator('a[href="/kilder/src-operativt-konsept-for-sivilforsvaret#excerpt"]').first().click();
    await expect(page.getByRole('heading', { name: /SRC - Operativt konsept for Sivilforsvaret/i })).toBeVisible();

    await page.goto('/kort/tilfluktsrom-klargjoring', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Tilfluktsrom/i }).first()).toBeVisible();
    await expect(page.getByText(/Kildereferanse|Kilder/i).first()).toBeVisible();

    await page.goto('/kilder/src-5-punktsordre', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /SRC - 5-punktsordre/i })).toBeVisible();
    await expect(page.getByText('Kildereferanse: source-extracts/SRC - 5-punktsordre.md')).toBeVisible();

    await page.goto('/moduler/tilfluktsrom', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Tilfluktsrom', exact: true })).toBeVisible();

    await page.goto('/laering', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Opplæring', exact: true })).toBeVisible();

    const apiOk = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/context/weather?lat=abc&lon=10');
        return res.ok;
      } catch {
        return false;
      }
    });
    expect(apiOk).toBe(false);
  } finally {
    await context.setOffline(false);
  }
});

test('serves generated-content fallback when cache entry is corrupted or missing offline', async ({ page, context }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();
  await waitForServiceWorker(page);

  const deleted = await page.evaluate(async () => {
    const keys = await caches.keys();
    const matches = await Promise.all(keys.map(async (key) => {
      const cache = await caches.open(key);
      return cache.delete('/generated-content/manifest.json');
    }));
    return matches.some(Boolean);
  });
  expect(deleted).toBe(true);

  await context.setOffline(true);
  try {
    const fallback = await page.evaluate(async () => {
      const response = await fetch('/generated-content/manifest.json');
      const body = await response.json();
      return {
        ok: response.ok,
        generatedFallback: response.headers.get('x-beredskapsboka-generated-fallback'),
        cacheVersion: response.headers.get('x-beredskapsboka-cache-version'),
        body,
      };
    });

    expect(fallback.ok).toBe(true);
    expect(fallback.generatedFallback).toBe('1');
    expect(fallback.cacheVersion).toBeTruthy();
    expect(fallback.body).toMatchObject({ contentVersion: 'offline-fallback', fallback: true });
  } finally {
    await context.setOffline(false);
  }
});
