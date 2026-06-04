import { expect, test } from '@playwright/test';

import { waitForServiceWorker } from './helpers';

test('operational app shell routes load offline after service-worker warmup', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hva står du i nå/i })).toBeVisible();
  await waitForServiceWorker(page);

  const operationalRoutes = [
    { route: '/', heading: /Hva står du i nå/i },
    { route: '/sok', heading: /Søk i tiltak, kilder og moduler/i },
    { route: '/mer', heading: /^Mer$/i },
  ];

  await context.setOffline(true);
  try {
    for (const { route, heading } of operationalRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
      await expect(page.getByRole('navigation', { name: /Hovednavigasjon/i })).toBeVisible();
    }
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
    await page.locator('a[href="/kilder/src-deep-research-tilfluktsrom#excerpt"]').first().click();
    await expect(page.getByRole('heading', { name: /SRC - Deep Research Tilfluktsrom/i })).toBeVisible();

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
