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
});
