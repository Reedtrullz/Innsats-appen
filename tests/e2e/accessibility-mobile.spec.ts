import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, openMissionDetails, openMissionMode } from './helpers';

test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

const mobileLayoutRoutes = ['/', '/sok', '/oppdrag', '/hurtigkort', '/mer', '/hjelp', '/kort/tilfluktsrom-klargjoring', '/oppdrag/ny', '/kart', '/under', '/etter', '/feltmodus', '/moduler/tilfluktsrom', '/release'];

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth, `document overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  expect(overflow.bodyWidth, `body overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

async function expectVisibleControlsHaveTouchTargets(page: import('@playwright/test').Page, route: string) {
  const failures = await page.locator('button, a, input, select, textarea').evaluateAll((elements) => elements.flatMap((element, index) => {
    if (element.closest('[hidden], [aria-hidden="true"]')) return [];
    if ('disabled' in element && element.disabled) return [];
    const style = window.getComputedStyle(element);
    const controlBox = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || controlBox.width === 0 || controlBox.height === 0) return [];
    const input = element instanceof HTMLInputElement ? element : null;
    const label = input && (input.type === 'checkbox' || input.type === 'radio') ? input.closest('label') : null;
    const box = label?.getBoundingClientRect() ?? controlBox;
    if (box.width >= 44 && box.height >= 44) return [];
    const labelText = label?.textContent ?? element.getAttribute('aria-label') ?? element.textContent ?? element.getAttribute('name') ?? element.tagName;
    const labelSummary = labelText.replace(/\s+/g, ' ').trim().slice(0, 80);
    return [`${index}: ${element.tagName.toLowerCase()} "${labelSummary}" ${Math.round(box.width)}x${Math.round(box.height)}`];
  }));
  expect(failures, `${route} touch-target failures`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('critical mobile routes have no automated WCAG A/AA accessibility violations', async ({ page }) => {
  for (const route of ['/', '/sok', '/oppdrag', '/hurtigkort', '/mer', '/hjelp', '/kort/tilfluktsrom-klargjoring', '/oppdrag/ny', '/kart', '/feltmodus', '/release']) {
    await page.goto(route);
    if (route === '/release') {
      await expect(page.getByRole('heading', { name: /Pilotklar sjekkliste/i })).toBeVisible();
    } else {
      await expect(page.getByRole('navigation', { name: /Hovednavigasjon/i })).toBeVisible();
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, `${route} accessibility violations: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
  }
});

test('release route has no hydration mismatch console errors', async ({ page }) => {
  const hydrationMessages: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/hydration|server rendered html|did not match/i.test(text)) hydrationMessages.push(text);
  });
  page.on('pageerror', (error) => {
    const text = error.message;
    if (/hydration|server rendered html|did not match/i.test(text)) hydrationMessages.push(text);
  });

  await page.goto('/release');
  await expect(page.getByRole('heading', { name: /Pilotklar sjekkliste/i })).toBeVisible();
  expect(hydrationMessages).toEqual([]);
});

test('mobile layout has no horizontal overflow and visible controls have large enough touch targets', async ({ page }) => {
  for (const route of mobileLayoutRoutes) {
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
    await expectVisibleControlsHaveTouchTargets(page, route);
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

test('card-level warning stays visible; source warnings live in the governance panel', async ({ page }) => {
  await page.goto('/kort/tilfluktsrom-klargjoring');
  await expect(page.getByRole('heading', { name: /Klargjør.*tilfluktsrom/i })).toBeVisible();
  // The card's own safety warning must be read before acting and stays a
  // visible banner above the steps.
  await expect(page.getByRole('note').filter({ hasText: /Ikke offisiell ordre eller fullstendig oversikt/i })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: /private eller skjermede tilfluktsromdata/i })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: /Ikke kildegodkjent for pilot/i })).toHaveCount(0);
  // Source-derived boilerplate moved into the collapsed governance panel so
  // the steps lead; the panel verdict is always visible and expanding it
  // reveals the source warnings.
  const governance = page.locator('details').filter({ hasText: /Kildestatus/ }).first();
  await expect(governance.locator('summary')).toBeVisible();
  if (!(await governance.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await governance.locator('summary').click();
  }
  await expect(governance.getByText(/Kontroller alltid mot gjeldende offisielt planverk/i).first()).toBeVisible();
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
  await page.locator('select[name="role"]').selectOption('beredskapsvakt');
  await page.getByLabel('Fase').selectOption('for');
  await page.getByLabel('Scenario').selectOption('tilfluktsrom');
  await page.getByLabel('Sted/lokasjon').fill('Keyboard testområde');
  await page.getByRole('button', { name: /Lagre oppdrag/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Oppdrag', exact: true })).toBeVisible();
  await expect(page.getByText(new RegExp(`${missionTitle}\\s*·\\s*Keyboard testområde`, 'i'))).toBeVisible();
});

test('mission and local export form controls have accessible labels', async ({ page }) => {
  await page.goto('/oppdrag/ny');
  for (const label of ['Tittel', 'Fase', 'Scenario', 'Sted/lokasjon']) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await expect(page.locator('select[name="role"]')).toBeVisible();

  await createLocalMission(page, {
    title: `Formlabel øvelse ${Date.now()}`,
    phase: 'under',
    scenario: 'flom',
    location: 'Formlabel testområde',
  });
  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');
  const orderForm = page.locator('form').filter({ has: page.getByRole('heading', { name: '5-punktsordre' }) });
  await expect(orderForm.getByLabel(/Rolle\/mal for 5-punktsordre/i)).toBeVisible();
  await orderForm.getByRole('tab', { name: /Fem punkter/i }).click();
  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband', 'Notes']) {
    await expect(orderForm.getByLabel(new RegExp(label.replace('/', '\\/'), 'i'))).toBeVisible();
  }
  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    await orderForm.getByLabel(new RegExp(label.replace('/', '\\/'), 'i')).fill(`${label} test`);
  }
  await orderForm.getByRole('tab', { name: /Bekreft/i }).click();
  await expect(orderForm.getByLabel(/Tilbakelesing\/forstått er bekreftet/i)).toBeVisible();

  await openMissionDetails(page, /Sambandsplan/i, 'Eksport');
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
  const mapPackageRegion = page.getByRole('region', { name: /Lokale kartpakker/i });
  await expect(mapPackageRegion.getByRole('combobox', { name: /Velg skjematisk kartpakke/i })).toBeVisible();
  await expect(mapPackageRegion.getByText(/Ingen godkjente lokale kartpakker er tilgjengelige/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Tilbakestill kartcache/i })).toHaveCount(0);

  const markerRegion = page.getByRole('region', { name: /Lokale markører og lag/i });
  await expect(markerRegion.getByRole('combobox', { name: /Markørtype/i })).toBeVisible();
  await expect(markerRegion.getByRole('textbox', { name: /Etikett/i })).toBeVisible();
  await expect(markerRegion.getByRole('spinbutton', { name: /X 0-100/i })).toBeVisible();
  await expect(markerRegion.getByRole('spinbutton', { name: /Y 0-100/i })).toBeVisible();
  await expect(markerRegion.getByRole('textbox', { name: /Notat uten persondata/i })).toBeVisible();
  const mapLogRegion = page.getByRole('region', { name: /Logg fra kartpunkt/i });
  await expect(mapLogRegion.getByLabel(/Loggtekst fra kartpunkt/i)).toBeVisible();
  await expect(mapLogRegion.getByRole('button', { name: /Logg fra nyeste synlige markør/i })).toBeVisible();

  const drawingRegion = page.getByRole('region', { name: /Tegneverktøy og sektorer/i });
  await expect(drawingRegion.getByRole('combobox', { name: /Tegnetype/i })).toBeVisible();
  await expect(drawingRegion.getByRole('textbox', { name: /Tegnekoordinater/i })).toBeVisible();

  const exportRegion = page.getByRole('region', { name: /Kart eksport og import/i });
  await expect(exportRegion.getByRole('button', { name: /Lag kartbilde/i })).toBeVisible();
  await expect(exportRegion.getByRole('button', { name: /Lag GeoJSON eksport/i })).toBeVisible();
  await expect(exportRegion.getByRole('textbox', { name: /Importer GeoJSON/i })).toBeVisible();

  await page.goto('/feltmodus');
  const fieldQuickActions = page.getByRole('region', { name: /Én trykkflate til operativt arbeid/i });
  for (const [name, href] of [
    ['Kart', '/kart'],
    ['Hurtiglogg', '/oppdrag#hurtiglogg'],
    ['Aktivt oppdrag', '/oppdrag'],
    ['Kjør sjekkliste', '/oppdrag#sjekkliste'],
    ['5-punktsordre', '/oppdrag#5-punktsordre'],
    ['Sambandsplan', '/oppdrag#sambandsplan'],
    ['Eksporter status', '/oppdrag#statusrapport'],
    ['Søk', '/sok#stress-search'],
  ] as const) {
    await expect(fieldQuickActions.getByRole('link', { name })).toHaveAttribute('href', href);
  }
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

  await openMissionMode(page, 'Arbeid');
  await expect(page.getByRole('heading', { name: /Kart og logg/i })).toBeVisible();
  await openMissionDetails(page, /Loggoversikt og lokale oppgaver/i);
  await openMissionDetails(page, /Feltlogg/i);

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
  ]) {
    await expect(page.getByLabel(new RegExp(label.replaceAll('/', '\\/'), 'i')).first()).toBeVisible();
  }

  await openMissionDetails(page, /RUH og velferd/i, 'Eksport');
  for (const label of [
    'RUH tidspunkt',
    'RUH kategori',
    'Hva skjedde',
    'Umiddelbart tiltak',
    'RUH risiko',
  ]) {
    await expect(page.getByLabel(new RegExp(label.replaceAll('/', '\\/'), 'i')).first()).toBeVisible();
  }

  await page.locator('#ruh-velferd').getByRole('tab', { name: 'Velferd' }).click();
  for (const label of [
    'Fysisk belastning',
    'Mental belastning',
    'Velferdsnotat',
  ]) {
    await expect(page.getByLabel(new RegExp(label.replaceAll('/', '\\/'), 'i')).first()).toBeVisible();
  }

  await openMissionDetails(page, /Etterrapport/i, 'Eksport');
  await page.locator('#etterrapport').getByText(/Legg til notater/i).click();
  for (const label of [
    'Lokal ordretekst',
    'Lokalt samband',
    'Lokal logg',
  ]) {
    await expect(page.getByLabel(new RegExp(label.replaceAll('/', '\\/'), 'i')).first()).toBeVisible();
  }

  await openMissionDetails(page, /Samlet lokal oppdragsmappe/i, 'Eksport');
  await expect(page.getByRole('region', { name: /Oppdragsmappe/i })).toBeVisible();

  await openMissionDetails(page, /Avansert \/ dokumentasjon/i, 'Eksport');
  for (const label of [
    'Erfaringsoppsummering',
  ]) {
    await expect(page.getByLabel(new RegExp(label.replaceAll('/', '\\/'), 'i')).first()).toBeVisible();
  }
});

test('mission quick actions resolve to real dashboard targets', async ({ page }) => {
  await createLocalMission(page, {
    title: `Hurtighandling øvelse ${Date.now()}`,
    phase: 'under',
    scenario: 'flom',
    location: 'Ankertest',
  });

  for (const [label, targetId, mode] of [
    ['Hurtiglogg', 'hurtiglogg', false],
    ['Sjekkliste', 'sjekkliste', 'Arbeid'],
    ['5-punktsordre', '5-punktsordre', 'Eksport'],
    ['Sambandsplan', 'sambandsplan', 'Eksport'],
    ['Kart', 'kart', 'Arbeid'],
    ['RUH/velferd', 'ruh-velferd', 'Eksport'],
    ['Etterrapport', 'etterrapport', 'Eksport'],
    ['Oppdragsmappe', 'oppdragsmappe', 'Eksport'],
  ] as const) {
    await page.goto(`/oppdrag#${targetId}`);
    await expect(page).toHaveURL(new RegExp(`#${targetId}$`));

    const target = page.locator(`[id="${targetId}"]`);
    await expect(target, `${label} should resolve to #${targetId}`).toHaveCount(1);
    await expect(target).toBeVisible();
    await expect(target).toBeInViewport();

    const modeControl = page.getByRole('tablist', { name: /Oppdragsmodus/i });
    await expect(modeControl.getByRole('tab', { name: mode || 'Nå' })).toHaveAttribute('aria-selected', 'true');

    await page.evaluate(() => window.scrollTo(0, 0));
  }
});
