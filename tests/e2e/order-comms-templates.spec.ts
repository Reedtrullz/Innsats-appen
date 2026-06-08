import { expect, test, type Locator, type Page } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission, openMissionDetails } from './helpers';

const templateIds = ['lagleder-lagforer', 'fig-leder', 'mfe', 'lia-liaison', 'beredskapsvakt'] as const;
const templateLabels = ['Lagleder/lagfører', 'FIG-leder', 'MFE', 'LIA/liaison', 'Beredskapsvakt'];

function formByHeading(page: Page, heading: string) {
  return page.locator('form').filter({ has: page.getByRole('heading', { name: heading }) });
}

async function fillFivePointOrder(form: Locator) {
  await form.getByRole('tab', { name: /Fem punkter/i }).click();
  await form.getByLabel('Situasjon').fill('Teststatus: vannstand stiger ved offentlig kai. Ingen persondata.');
  await form.getByLabel('Oppdrag').fill('Støtt lokal sikring og rapporter endringer til leder.');
  await form.getByLabel('Utførelse').fill('Prioriter sikker adkomst, logg tiltak og stopp ved uavklarte farer.');
  await form.getByLabel('Administrasjon/forsyning').fill('Behov: lys, pumpe, varme drikker og avløsning.');
  await form.getByLabel('Ledelse/samband').fill('Kontaktvei etter lokal plan, status hvert 30. minutt.');
  await form.getByLabel('Notes').fill('Kun sanitert testdata.');
}

async function fillCommsPlan(form: Locator) {
  await form.getByLabel(/Primær kanal\/talegruppe/i).fill('Primær etter lokal plan');
  await form.getByLabel(/Fallback kanal\/kontaktmetode/i).fill('Fallback etter lokal plan');
  await form.getByLabel(/^Kallesignal$/i).fill('FIG test');
  await form.getByLabel(/IL-KO kontakt/i).fill('IL-KO generisk kontaktpunkt');
  await form.getByLabel(/Distrikt\/beredskapsvakt kontakt/i).fill('Beredskapsvakt via lokal rutine');
  await form.getByLabel(/Innsjekkingsintervall/i).fill('Hver 30. minutt og ved endring');
  await form.getByLabel(/Prosedyre ved bortfall av samband/i).fill('Forsøk fallback, møt på avtalt punkt, logg lokalt.');
  await form.getByLabel(/Batteri-\/ladestatus/i).fill('Radio og reservebatteri kontrollert');
  await form.getByLabel('Notes').fill('Ikke ISSI-lister eller sensitive sambandstabeller.');
}

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('exports expanded 5-punktsordre templates after readback confirmation', async ({ page }) => {
  await createLocalMission(page, { title: `Ordre mal ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Ordre testområde' });
  await openMissionDetails(page, /5-punktsordre/i, 'Eksport');
  const form = formByHeading(page, '5-punktsordre');
  await expect(form.getByText(/Lokal beslutningsstøtte/i)).toBeVisible();
  await expect(form.getByRole('tab', { name: /Eksporter/i })).toBeDisabled();

  await fillFivePointOrder(form);
  await form.getByRole('tab', { name: /Bekreft/i }).click();
  await form.getByLabel(/Tilbakelesing\/forstått/i).check();
  await form.getByRole('tab', { name: /Eksporter/i }).click();
  await form.getByText(/Flere eksportformater/i).click();

  for (let index = 0; index < templateIds.length; index += 1) {
    await form.getByRole('tab', { name: /Mal/i }).click();
    await form.getByLabel(/Rolle\/mal for 5-punktsordre/i).selectOption(templateIds[index]);
    await expect(form.getByText(new RegExp(`Malveiledning: ${templateLabels[index].replace('/', '\\/')}`, 'i'))).toBeVisible();
    await form.getByRole('tab', { name: /Eksporter/i }).click();
    await form.getByRole('button', { name: /Eksporter JSON/i }).click();
    await form.getByText(/Vis forhåndsvisning/i).last().click();
    const exported = await form.locator('pre').last().textContent();
    expect(exported).toBeTruthy();
    const parsed = JSON.parse(exported ?? '{}') as { template?: { id?: string; label?: string }; warnings?: string[]; metadata?: { sourceIds?: string[] } };
    expect(parsed.template?.id).toBe(templateIds[index]);
    expect(parsed.template?.label).toBe(templateLabels[index]);
    expect(parsed.metadata?.sourceIds).toContain('src-5-punktsordre');
    expect(parsed.warnings?.join(' ')).toMatch(/persondata|pasientdata/i);
  }

  await form.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await form.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(form.locator('pre').last()).toContainText('# 5-punktsordre');
  await expect(form.locator('pre').last()).toContainText('Beredskapsvakt');
  await form.getByRole('button', { name: /Lag PDF-klar HTML/i }).click();
  await form.getByText(/Vis forhåndsvisning/i).last().click();
  await expect(form.locator('pre').last()).toContainText('<!doctype html>');
});

test('exports expanded sambandsplan templates with local-only warnings', async ({ page }) => {
  await createLocalMission(page, { title: `Samband mal ${Date.now()}`, phase: 'under', scenario: 'flom', location: 'Samband testområde' });
  await openMissionDetails(page, /Sambandsplan/i, 'Eksport');
  const form = formByHeading(page, 'Sambandsplan');
  await expect(form.getByText(/ikke legg inn persondata eller sensitive sambandstabeller/i)).toBeVisible();

  await fillCommsPlan(form);

  for (let index = 0; index < templateIds.length; index += 1) {
    await form.getByLabel(/Rolle\/mal for sambandsplan/i).selectOption(templateIds[index]);
    await expect(form.getByRole('region', { name: /Malveiledning sambandsplan/i })).toContainText(templateLabels[index]);
    await form.getByRole('button', { name: /Eksporter JSON/i }).click();
    const exported = await form.locator('pre').textContent();
    expect(exported).toBeTruthy();
    const parsed = JSON.parse(exported ?? '{}') as { template?: { id?: string; label?: string }; warnings?: string[]; metadata?: { sourceIds?: string[] } };
    expect(parsed.template?.id).toBe(templateIds[index]);
    expect(parsed.template?.label).toBe(templateLabels[index]);
    expect(parsed.metadata?.sourceIds).toContain('src-kommunikasjons-og-sambandsdiagram');
    expect(parsed.warnings?.join(' ')).toMatch(/sensitive|persondata/i);
  }

  await form.getByRole('button', { name: /Eksporter Markdown/i }).click();
  await expect(form.locator('pre')).toContainText('# Sambandsplan');
  await expect(form.locator('pre')).toContainText('Beredskapsvakt');
  await form.getByRole('button', { name: /Lag PDF-klar HTML/i }).click();
  await expect(form.locator('pre')).toContainText('<!doctype html>');
});
