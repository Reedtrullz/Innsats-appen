import { expect, test } from '@playwright/test';

const criticalQueries = [
  'jod-tablett',
  'dekontaminering',
  'mobil forsterkningsenhet',
  'nødnett',
  'frammøtested',
  'doserate',
  'fempunktsordre',
  'il-ko',
  'innsatsleder',
  'vakthavende',
  'lensepumpe',
  'livreddende førstehjelp',
  'defusing',
  'materiellberedskap',
];

const synonymQueries = ['radiac', 'MFE', 'sektor', 'ATV', 'CBRNE'];

test('critical operational search terms return local results', async ({ page }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeVisible();

  const search = page.getByLabel(/Søk lokalt/i);
  for (const query of criticalQueries) {
    await search.fill(query);
    await expect(page.getByLabel('Lokalt søk').getByRole('link').first()).toBeVisible();
    await expect(page.getByText(/Ingen treff/i)).toHaveCount(0);
  }
});

test('search typo with no direct hit suggests canonical operational query and follows the suggestion', async ({ page }) => {
  await page.goto('/hurtigkort');
  const search = page.getByLabel(/Søk lokalt/i);
  await search.fill('jodddttabl');
  await expect(page.getByText(/Ingen treff/i)).toBeVisible();
  const suggestion = page.getByRole('link', { name: /^jod$/i });
  await expect(suggestion).toHaveAttribute('href', '/hurtigkort?q=jod');
  await suggestion.click();
  await expect(search).toHaveValue('jod');
  await expect(page.getByText(/Ingen treff/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Jodtabletter/i }).first()).toBeVisible();
});

test('search tab opens first-class operational search', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/sok');
  await expect(page.getByRole('heading', { name: /Søk i tiltak, kilder og moduler/i })).toBeVisible();
  await page.getByRole('searchbox').fill('pumpe');
  await expect(page.getByText(/Søkeord:/i).first()).toBeVisible();
  await expect(page.getByText(/Kilde:/i).first()).toBeVisible();
  const order = await page.getByLabel('Lokalt søk').evaluate((section) => {
    const firstResult = section.querySelector('a');
    const filters = section.querySelector('fieldset');
    return Boolean(firstResult && filters && (firstResult.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(order).toBe(true);
});

test('search explains when filters hide otherwise matching results', async ({ page }) => {
  await page.goto('/sok');
  const search = page.getByRole('searchbox');
  await search.fill('dekontaminering');
  await expect(page.getByLabel('Lokalt søk').getByRole('link').first()).toBeVisible();

  await page.getByRole('button', { name: /Fase: Før/i }).click();

  await expect(page.getByText(/treff skjult av filtre/i)).toBeVisible();
  await expect(page.getByText(/Ingen treff\. Prøv et kjent fagord/i)).toHaveCount(0);
  const reset = page.getByRole('link', { name: /Nullstill filtre/i });
  await expect(reset).toHaveAttribute('href', '/sok?q=dekontaminering');

  await reset.click();

  await expect(page).toHaveURL(/\/sok\?q=dekontaminering$/);
  await expect(search).toHaveValue('dekontaminering');
  await expect(page.getByLabel('Lokalt søk').getByRole('link').first()).toBeVisible();
  await expect(page.getByText(/treff skjult av filtre/i)).toHaveCount(0);
});

test('synonym queries all return results on the dedicated search page', async ({ page }) => {
  await page.goto('/sok');
  const search = page.getByRole('searchbox');
  for (const query of synonymQueries) {
    await search.fill(query);
    await expect(page.getByLabel('Lokalt søk').getByRole('link').first(), `query "${query}" returned no results`).toBeVisible();
  }
});

test('offline search returns results without network', async ({ page, context: browserContext }) => {
  await page.goto('/sok');
  const search = page.getByRole('searchbox');
  await search.fill('brann');
  await expect(page.getByLabel('Lokalt søk').getByRole('link').first()).toBeVisible();

  await browserContext.setOffline(true);
  await search.fill('samband');
  await expect(page.getByLabel('Lokalt søk').getByRole('link').first()).toBeVisible();
  // "Frakoblet – bufret innhold kan brukes" in the shell status line is the
  // visible offline indication (same wording offline.spec.ts asserts on).
  await expect(page.getByText(/nettverk|offline|internett|frakoblet/i).first()).toBeVisible();

  await browserContext.setOffline(false);
  await search.fill('radiac');
  await expect(page.getByLabel('Lokalt søk').getByRole('link').first()).toBeVisible();

  await browserContext.setOffline(true);
  await search.fill('sektor');
  await expect(page.getByLabel('Lokalt søk').getByRole('link').first()).toBeVisible();
});
