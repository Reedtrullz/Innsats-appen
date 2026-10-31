import assert from 'node:assert/strict';

async function controlled(page) {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}

async function setManifest(page, body) {
  await page.evaluate(async body => {
    const cache = await caches.open('beredskapsboka-v7');
    await cache.put('/generated-content/manifest.json', new Response(body, { headers: { 'Content-Type': 'application/json' } }));
  }, body);
}

async function activateWaiting(page) {
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) throw new Error('No waiting worker');
    await new Promise(resolve => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      registration.waiting.postMessage({ type: 'BEREDSKAPSBOKA_SKIP_WAITING' });
    });
  });
}

export async function exerciseAdverse({ page, context, fixture, measure }) {
  const routeStart = measure ? performance.now() : null;
  await controlled(page);
  await page.getByRole('heading', { name: 'Hva trenger du nå', exact: true }).waitFor();
  const routeMs = routeStart === null ? null : performance.now() - routeStart;
  const interactionStart = measure ? performance.now() : null;
  await page.locator('a[href="/sok"]:visible').first().click();
  await page.getByRole('heading', { name: 'Søk i tiltak, kilder og moduler', exact: true }).waitFor();
  const interactionMs = interactionStart === null ? null : performance.now() - interactionStart;
  let offlineMs = null;
  assert(fixture.state.optionalChunks.size > 0, 'No source-admitted optional chunks');
  await page.goto('/data-pa-enheten');
  await page.getByLabel('Velg lokal kartpakke', { exact: true }).selectOption('trondheim-osm');
  await page.getByRole('button', { name: 'Lagre valgt kartpakke lokalt', exact: true }).click();
  await page.getByTestId('offline-map-cache-status').filter({ hasText: 'Lagret lokalt: Trondheim lokal' }).waitFor();
  await page.evaluate(async chunks => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const url of chunks) await cache.delete(url);
    }
  }, [...fixture.state.optionalChunks]);
  await page.waitForLoadState('networkidle');
  const cacheControl = await context.newCDPSession(page);
  try { await cacheControl.send('Network.clearBrowserCache'); }
  finally { await cacheControl.detach(); }
  fixture.state.mode = 'chunk-failure';
  await page.goto('/kart');
  await page.getByLabel('Skjematisk kartfallback', { exact: true }).waitFor();
  assert(fixture.state.requests.some(row => row.fault === 'chunk-failure'), 'Chunk failure was never reached');
  fixture.state.mode = 'current';

  const denied = await context.newPage();
  try {
    await denied.addInitScript(() => {
      Cache.prototype.put = () => Promise.reject(new DOMException('Authored storage write denial', 'QuotaExceededError'));
    });
    await denied.goto('/data-pa-enheten');
    await denied.getByRole('button', { name: 'Tilbakestill kartcache', exact: true }).click();
    await denied.getByLabel('Velg lokal kartpakke', { exact: true }).selectOption('trondheim-osm');
    await denied.getByRole('button', { name: 'Lagre valgt kartpakke lokalt', exact: true }).click();
    await denied.getByText('Kartpakken kunne ikke forhåndscaches; skjematisk fallback brukes offline.', { exact: true }).waitFor();
    assert((await denied.getByTestId('offline-map-cache-status').innerText()).includes('Ingen kartpakke'), 'Denied storage claimed saved package');
  } finally { await denied.close(); }

  await controlled(page);
  const original = await page.evaluate(async () => {
    const response = await fetch('/generated-content/manifest.json');
    if (!response.ok) throw new Error('Missing actual source manifest');
    return response.text();
  });
  for (const body of ['{', JSON.stringify({ ...JSON.parse(original), generatedAt: '2000-01-01T00:00:00.000Z' })]) {
    await setManifest(page, body);
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    try {
      const offlineStart = measure ? performance.now() : null;
      await page.goto('/hurtigkort');
      await page.getByRole('heading', { name: 'Hurtigkort', exact: true }).waitFor();
      if (offlineMs === null && offlineStart !== null) offlineMs = performance.now() - offlineStart;
      await page.getByTestId('content-cache-stale-warning').first().waitFor();
      const observed = await page.evaluate(async () => {
        const response = await fetch('/generated-content/manifest.json');
        return { body: await response.text(), stale: response.headers.get('x-beredskapsboka-generated-stale'),
          fallback: response.headers.get('x-beredskapsboka-cache-fallback') };
      });
      assert.equal(observed.body, body);
      assert.equal(observed.stale, '1');
      assert.equal(observed.fallback, '1');
    } finally { await context.setOffline(false); }
  }
  await setManifest(page, original);

  // Authored previous-version fixture changes only the real SW's cache-version literal.
  fixture.state.mode = 'previous-version';
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); if (!registration) throw new Error('No SW'); await registration.update(); });
  await activateWaiting(page);
  await page.goto('/oppdrag/ny');
  await page.getByLabel('Tittel', { exact: true }).fill('O24 authored local mission');
  await page.locator('select[name="role"]').selectOption('beredskapsvakt');
  await page.getByLabel('Hvor i oppdraget er du nå?').selectOption('for');
  await page.getByLabel('Scenario', { exact: true }).selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Authored schematic fixture');
  await page.getByRole('button', { name: 'Lagre oppdrag', exact: true }).click();
  await page.getByRole('heading', { name: 'Oppdrag', exact: true }).waitFor();
  fixture.state.mode = 'interrupted-update';
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); if (!registration) throw new Error('No SW'); await registration.update(); });
  await page.waitForFunction(async () => !(await navigator.serviceWorker.getRegistration())?.installing);
  assert(fixture.state.requests.some(row => row.fault === 'interrupted-update'), 'Update interruption was never reached');
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  try {
    await page.goto('/oppdrag');
    await page.getByRole('heading', { name: 'Lokale oppdrag', exact: true }).waitFor();
    await page.getByText('O24 authored local mission', { exact: true }).first().waitFor();
    assert((await page.evaluate(() => caches.keys())).includes('beredskapsboka-o24-authored-previous'), 'Interrupted update removed active cache');
  } finally { await context.setOffline(false); fixture.state.mode = 'current'; }
  await activateWaiting(page);
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated');
  await page.goto('/oppdrag');
  await page.getByText('O24 authored local mission', { exact: true }).first().waitFor();
  const keys = await page.evaluate(() => caches.keys());
  assert(keys.includes('beredskapsboka-v7'));
  assert(!keys.includes('beredskapsboka-o24-authored-previous'), 'Completed update retained old cache');
  await page.waitForLoadState('networkidle');
  return { routeMs, interactionMs, offlineMs, semantics: { optionalChunkFallback: true, storageWriteDenied: true, corruptManifestStaleWarning: true,
    staleSourceManifestWarning: true, interruptedUpdatePreservesActiveCache: true,
    completedUpdateRetiresPreviousCache: true, authoredMissionPreserved: true } };
}
