import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission } from './helpers';

test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth, `document overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  expect(overflow.bodyWidth, `body overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('critical mobile routes have no automated WCAG A/AA accessibility violations', async ({ page }) => {
  for (const route of ['/hurtigkort', '/kort/tilfluktsrom-klargjoring', '/oppdrag/ny', '/oppdrag', '/kart', '/feltmodus']) {
    await page.goto(route);
    await expect(page.getByRole('navigation', { name: /Hovednavigasjon/i })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, `${route} accessibility violations: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
  }
});

test('mobile layout has no horizontal overflow and nav touch targets are large enough', async ({ page }) => {
  for (const route of ['/hurtigkort', '/kort/tilfluktsrom-klargjoring', '/oppdrag/ny', '/moduler/tilfluktsrom']) {
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  }

  await page.goto('/hurtigkort');
  const navLinks = page.getByRole('navigation', { name: /Hovednavigasjon/i }).getByRole('link');
  const count = await navLinks.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await navLinks.nth(index).boundingBox();
    expect(box, `missing nav link bounding box at index ${index}`).not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('warning banners remain visible in card detail', async ({ page }) => {
  await page.goto('/kort/tilfluktsrom-klargjoring');
  await expect(page.getByRole('heading', { name: /Klargjør.*tilfluktsrom/i })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: /Researchbasert støtte/i })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: /Kontroller alltid mot gjeldende offisielt planverk/i }).first()).toBeVisible();
});

test('keyboard can search and open a quick card', async ({ page }) => {
  await page.goto('/hurtigkort');
  const search = page.getByLabel(/Søk lokalt/i);
  await search.focus();
  await page.keyboard.type('tilfluktsrom');
  const result = page.getByLabel('Lokalt søk').getByRole('link', { name: /Klargjør.*tilfluktsrom/i });
  await expect(result).toBeVisible();
  await result.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Klargjør.*tilfluktsrom/i })).toBeVisible();
});

test('keyboard can use persistent bottom navigation and submit a new mission form', async ({ page }) => {
  const missionTitle = `Keyboard øvelse ${Date.now()}`;
  await page.goto('/hurtigkort');
  const bottomNav = page.getByRole('navigation', { name: /Hovednavigasjon/i });
  await bottomNav.getByRole('link', { name: /Oppdrag/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Lokale oppdrag/i })).toBeVisible();

  await page.getByRole('link', { name: /Nytt oppdrag/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Opprett lokalt oppdrag/i })).toBeVisible();
  await page.getByLabel('Tittel').fill(missionTitle);
  await page.getByLabel('Rolle').selectOption('beredskapsvakt');
  await page.getByLabel('Fase').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Keyboard testområde');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: missionTitle })).toBeVisible();
});

test('mission and local export form controls have accessible labels', async ({ page }) => {
  await page.goto('/oppdrag/ny');
  for (const label of ['Tittel', 'Rolle', 'Fase', 'Scenario', 'Sted/lokasjon']) {
    await expect(page.getByLabel(label)).toBeVisible();
  }

  await page.goto('/oppdrag');
  const orderForm = page.locator('form').filter({ has: page.getByRole('heading', { name: '5-punktsordre' }) });
  for (const label of ['Rolle/mal for 5-punktsordre', 'Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband', 'Notes']) {
    await expect(orderForm.getByLabel(new RegExp(label.replace('/', '\\/'), 'i'))).toBeVisible();
  }
  await expect(orderForm.getByLabel(/Tilbakelesing\/forstått er bekreftet/i)).toBeVisible();

  const commsForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Sambandsplan' }) });
  for (const label of [
    'Rolle/mal for sambandsplan',
    'Primær kanal/talegruppe',
    'Fallback kanal/kontaktmetode',
    'Kallesignal',
    'IL-KO kontakt',
    'Distrikt/beredskapsvakt kontakt',
    'Innsjekkingsintervall',
    'Prosedyre ved bortfall av samband',
    'Batteri-/ladestatus',
    'Notes',
  ]) {
    await expect(commsForm.getByLabel(new RegExp(label.replaceAll('/', '\\/'), 'i'))).toBeVisible();
  }
});

test('map and field-mode controls expose screen-reader labels', async ({ page }) => {
  await page.goto('/kart');
  await expect(page.getByRole('region', { name: /Lokale kartpakker/i }).getByRole('combobox', { name: /Velg lokal kartpakke/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tilbakestill kartcache/i })).toBeVisible();

  const markerRegion = page.getByRole('region', { name: /Lokale markører og lag/i });
  await expect(markerRegion.getByRole('combobox', { name: /Markørtype/i })).toBeVisible();
  await expect(markerRegion.getByRole('textbox', { name: /Etikett/i })).toBeVisible();
  await expect(markerRegion.getByRole('spinbutton', { name: /X 0-100/i })).toBeVisible();
  await expect(markerRegion.getByRole('spinbutton', { name: /Y 0-100/i })).toBeVisible();
  await expect(markerRegion.getByRole('textbox', { name: /Notat uten persondata/i })).toBeVisible();

  const drawingRegion = page.getByRole('region', { name: /Tegneverktøy og sektorer/i });
  await expect(drawingRegion.getByRole('combobox', { name: /Tegnetype/i })).toBeVisible();
  await expect(drawingRegion.getByRole('textbox', { name: /Tegnekoordinater/i })).toBeVisible();

  const exportRegion = page.getByRole('region', { name: /Kart eksport og import/i });
  await expect(exportRegion.getByRole('button', { name: /Lag kartbilde/i })).toBeVisible();
  await expect(exportRegion.getByRole('button', { name: /Lag GeoJSON eksport/i })).toBeVisible();
  await expect(exportRegion.getByRole('textbox', { name: /Importer GeoJSON/i })).toBeVisible();

  await page.goto('/feltmodus');
  await expect(page.getByLabel(/Slå på feltmodus/i)).toBeVisible();
  await expect(page.getByLabel(/Hanskemodus/i)).toBeVisible();
  await expect(page.getByRole('group', { name: /Lysmodus/i })).toBeVisible();
  await expect(page.getByLabel(/Dag \/ utendørs/i)).toBeVisible();
  await expect(page.getByLabel(/^Natt/i)).toBeVisible();
  await expect(page.getByLabel(/Redusert blått lys/i)).toBeVisible();
  await expect(page.getByLabel(/Utendørs lesbarhet er vurdert/i)).toBeVisible();
  await expect(page.getByLabel(/Jeg forstår at diktering er valgfritt/i)).toBeVisible();
  await expect(page.getByLabel(/Lokal notatkladd/i)).toBeVisible();
  await expect(page.getByLabel(/Testforhold/i)).toBeVisible();
  await expect(page.getByLabel(/Hva fungerte \/ hva ble observert/i)).toBeVisible();
  await expect(page.getByLabel(/Blokkere eller feiltrykk/i)).toBeVisible();
  await expect(page.getByLabel(/Forslag til endring/i)).toBeVisible();
  await expect(page.getByLabel(/Tilbakemeldingen er anonymisert/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Lagre lokal feedback/i })).toBeVisible();
});

test('screen-reader labels remain available on active mission operational controls', async ({ page }) => {
  await createLocalMission(page, {
    title: `Label øvelse ${Date.now()}`,
    phase: 'for',
    scenario: 'tilfluktsrom',
    location: 'Label testområde',
  });

  for (const label of [
    'Ny lokal oppgave',
    'Oppgavestatus',
    'Ressurstype',
    'Mengde eller behov',
    'Kort merknad',
    'Feltlogg tidspunkt',
    'Feltlogg lokasjon',
    'Feltlogg kategori',
    'Feltlogg tekst',
    'Søk i feltlogg',
    'Filtrer feltloggkategori',
    'RUH tidspunkt',
    'RUH kategori',
    'Hva skjedde',
    'Umiddelbart tiltak',
    'RUH risiko',
    'Fysisk belastning',
    'Mental belastning',
    'Velferdsnotat',
    'Lokal ordretekst',
    'Lokalt samband',
    'Lokal logg',
    'Erfaringsoppsummering',
  ]) {
    await expect(page.getByLabel(new RegExp(label.replaceAll('/', '\\/'), 'i')).first()).toBeVisible();
  }
});
