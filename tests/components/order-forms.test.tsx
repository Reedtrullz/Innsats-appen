import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import MissionsPage from '@/app/(app)/oppdrag/page';
import { CommsPlanForm } from '@/components/forms/comms-plan-form';
import { FivePointOrderForm } from '@/components/forms/five-point-order-form';
import { clearLocalMissionData, saveMission } from '@/lib/mission/local-store';
import { readLocalAuditLog } from '@/lib/privacy/local-profile';
import { buildMission } from '../helpers/mission-fixtures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(async () => {
  localStorage.clear();
  await clearLocalMissionData();
});

async function fillFivePointOrderFields() {
  await userEvent.click(screen.getByRole('tab', { name: /Fem punkter/i }));
  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    const field = screen.getByLabelText(new RegExp(label, 'i'));
    expect(field).toBeRequired();
    await userEvent.type(field, `${label} tekst`);
  }
}

async function confirmFivePointOrderReadback() {
  await userEvent.click(screen.getByRole('tab', { name: /Bekreft/i }));
  const readback = screen.getByLabelText(/tilbakelesing\/forstått er bekreftet/i);
  expect(readback).toBeRequired();
  await userEvent.click(readback);
  await userEvent.click(screen.getByRole('tab', { name: /Eksporter/i }));
  return readback;
}

async function openFivePointPreview() {
  const previewSummary = screen.getByText(/Vis forhåndsvisning/i);
  await userEvent.click(previewSummary);
}

function expectPreviewValue(label: RegExp, pattern: RegExp) {
  const field = screen.getAllByLabelText(label).find((element) => element.tagName === 'TEXTAREA') as HTMLTextAreaElement | undefined;
  expect(field?.value).toMatch(pattern);
}

function previewTextarea(id: string) {
  return document.querySelector<HTMLTextAreaElement>(`#${id}`);
}

it('requires all five order points and renders exported markdown', async () => {
  render(<FivePointOrderForm contentVersion="test-content-ui" />);
  expect(screen.getByText(/lokal beslutningsstøtte/i)).toBeInTheDocument();
  expect(screen.getByText(/unngå persondata/i)).toBeInTheDocument();
  const templateSelect = screen.getByLabelText(/rolle\/mal for 5-punktsordre/i);
  expect(templateSelect).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /lagleder\/lagfører/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /fig-leder/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /mfe/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /lia\/liaison/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /beredskapsvakt/i })).toBeInTheDocument();
  await userEvent.selectOptions(templateSelect, 'mfe');
  await userEvent.click(screen.getByText(/Malveiledning: MFE/i));
  expect(screen.getByText(/mobil forsterkningsenhet/i)).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Bekreft/i })).toBeDisabled();
  expect(screen.getByRole('tab', { name: /Eksporter/i })).toBeDisabled();
  expect(screen.getAllByText(/Låst/i).length).toBeGreaterThanOrEqual(2);
  await fillFivePointOrderFields();
  await userEvent.type(screen.getByLabelText(/Notes/i), 'lokal note');
  expect(screen.getByRole('tab', { name: /Eksporter/i })).toBeDisabled();
  expect(screen.getByRole('tab', { name: /Bekreft/i })).toBeEnabled();
  const readback = await confirmFivePointOrderReadback();
  const markdownButton = screen.getByRole('button', { name: /Eksporter Markdown/i });
  await userEvent.click(screen.getByText(/Flere eksportformater/i));
  const jsonButton = screen.getByRole('button', { name: /Eksporter JSON/i });
  const pdfButton = screen.getByRole('button', { name: /Lag PDF-klar HTML/i });
  expect(markdownButton).toBeEnabled();
  expect(jsonButton).toBeEnabled();
  expect(pdfButton).toBeEnabled();
  await userEvent.click(markdownButton);
  expect(readLocalAuditLog().some((entry) => entry.type === 'export-created' && entry.details.exportKind === 'five-point-order-markdown')).toBe(true);
  expect(screen.getByText(/Eksport er klar/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Kopier/i })).toBeInTheDocument();
  expect(screen.getAllByText(/Fullført/i).length).toBeGreaterThanOrEqual(3);
  expect((screen.getByText(/Vis forhåndsvisning/i).closest('details') as HTMLDetailsElement | null)?.open).toBe(false);
  await openFivePointPreview();
  expectPreviewValue(/Eksport/i, /# 5-punktsordre/i);
  expectPreviewValue(/Eksport/i, /src-5-punktsordre/i);
  expectPreviewValue(/Eksport/i, /operasjonelt sensitiv informasjon/i);
  expectPreviewValue(/Eksport/i, /Tilbakelesing\/forstått: Bekreftet/i);
  expectPreviewValue(/Eksport/i, /Innholdsversjon: test-content-ui/i);
  await userEvent.click(jsonButton);
  await openFivePointPreview();
  expectPreviewValue(/Eksport/i, /"schemaVersion": "five-point-order.v1"/i);
  await userEvent.click(pdfButton);
  expect(screen.getAllByText(/PDF-klar HTML/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Skriv ut.*Lagre som PDF/i).length).toBeGreaterThan(0);
});

it('clears stale 5-punktsordre export preview when order text changes', async () => {
  render(<FivePointOrderForm contentVersion="test-content-ui" />);

  await userEvent.click(screen.getByRole('tab', { name: /Fem punkter/i }));
  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    await userEvent.type(screen.getByLabelText(new RegExp(label, 'i')), `${label} første`);
  }
  await confirmFivePointOrderReadback();
  await userEvent.click(screen.getByRole('button', { name: /Eksporter Markdown/i }));
  await openFivePointPreview();

  expectPreviewValue(/Eksport/i, /# 5-punktsordre/i);
  expect(screen.getAllByText(/Situasjon første/i).length).toBeGreaterThan(1);

  await userEvent.type(screen.getByLabelText(/Situasjon/i), ' oppdatert');

  expect(previewTextarea('five-point-order-preview')).not.toBeInTheDocument();
});

it('blocks 5-punktsordre preview when sensitive text is entered', async () => {
  render(<FivePointOrderForm contentVersion="test-content-ui" />);

  await fillFivePointOrderFields();
  await userEvent.type(screen.getByLabelText(/Notes/i), 'Pasient Ola Nordmann skal følges opp');
  await confirmFivePointOrderReadback();
  await userEvent.click(screen.getByRole('button', { name: /Eksporter Markdown/i }));

  expect(await screen.findByText(/Eksport blokkert/i)).toBeInTheDocument();
  expect(previewTextarea('five-point-order-preview')).not.toBeInTheDocument();
});

it('requires expanded sambandsplan fields and renders Markdown/JSON/PDF-ready previews', async () => {
  render(<CommsPlanForm contentVersion="test-content-ui-comms" />);
  expect(screen.getByText(/lagres bare lokalt/i)).toBeInTheDocument();
  expect(screen.getAllByText(/ikke legg inn persondata/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/eksporterte filer kan inneholde operasjonelt sensitiv informasjon/i)).toBeInTheDocument();
  expect(screen.getAllByText(/PDF-klar HTML/i).length).toBeGreaterThan(0);

  const templateSelect = screen.getByLabelText(/rolle\/mal for sambandsplan/i);
  expect(templateSelect).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /lagleder\/lagfører/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /fig-leder/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /mfe/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /lia\/liaison/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /beredskapsvakt/i })).toBeInTheDocument();
  await userEvent.selectOptions(templateSelect, 'beredskapsvakt');
  expect(screen.getByRole('heading', { name: /malveiledning: beredskapsvakt/i })).toBeInTheDocument();

  const channel = screen.getByLabelText(/Primær kanal\/talegruppe/i);
  const fallback = screen.getByLabelText(/Fallback kanal\/kontaktmetode/i);
  const callsign = screen.getByLabelText(/Kallesignal/i);
  const ilKoContact = screen.getByLabelText(/IL-KO kontakt/i);
  const districtContact = screen.getByLabelText(/Distrikt\/beredskapsvakt kontakt/i);
  const checkInInterval = screen.getByLabelText(/Innsjekkingsintervall/i);
  const lostCommsProcedure = screen.getByLabelText(/Prosedyre ved bortfall av samband/i);
  const batteryStatus = screen.getByLabelText(/Batteri-\/ladestatus/i);
  expect(channel).toBeRequired();
  expect(fallback).toBeRequired();
  expect(callsign).toBeRequired();
  expect(ilKoContact).toBeRequired();
  expect(districtContact).toBeRequired();
  expect(checkInInterval).toBeRequired();
  expect(lostCommsProcedure).toBeRequired();
  expect(batteryStatus).toBeRequired();
  await userEvent.type(channel, 'Talegruppe etter lokal plan');
  await userEvent.type(fallback, 'Fallback kontaktmetode etter lokal plan');
  await userEvent.type(callsign, 'FIG Trondheim 01');
  await userEvent.type(ilKoContact, 'IL-KO kontaktpunkt');
  await userEvent.type(districtContact, 'Beredskapsvakt kontaktpunkt');
  await userEvent.type(checkInInterval, 'Hver 30. minutt');
  await userEvent.type(lostCommsProcedure, 'Bruk fallback, returner til møtepunkt');
  await userEvent.type(batteryStatus, 'Fulladet og reservebatteri klart');
  await userEvent.type(screen.getByLabelText(/Notes/i), 'Fallback avtales lokalt');

  const markdownButton = screen.getByRole('button', { name: /Eksporter Markdown/i });
  const jsonButton = screen.getByRole('button', { name: /Eksporter JSON/i });
  const pdfButton = screen.getByRole('button', { name: /Lag PDF-klar HTML/i });
  await userEvent.click(markdownButton);
  expect(screen.getByText(/Sambandsplan er klar/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Kopier/i })).toBeInTheDocument();
  expect((screen.getByText(/Vis forhåndsvisning/i).closest('details') as HTMLDetailsElement | null)?.open).toBe(false);
  await userEvent.click(screen.getByText(/Vis forhåndsvisning/i));
  expectPreviewValue(/Sambandsplan/i, /# Sambandsplan/i);
  expectPreviewValue(/Sambandsplan/i, /Talegruppe etter lokal plan/i);
  expectPreviewValue(/Sambandsplan/i, /Innholdsversjon: test-content-ui-comms/i);
  expectPreviewValue(/Sambandsplan/i, /src-kommunikasjons-og-sambandsdiagram/i);
  expectPreviewValue(/Sambandsplan/i, /operasjonelt sensitiv informasjon/i);
  await userEvent.click(jsonButton);
  await userEvent.click(screen.getByText(/Vis forhåndsvisning/i));
  expectPreviewValue(/Sambandsplan/i, /"schemaVersion": "sambandsplan.v1"/i);
  await userEvent.click(pdfButton);
  await userEvent.click(screen.getByText(/Vis forhåndsvisning/i));
  expect(screen.getAllByText(/PDF-klar HTML/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Skriv ut.*Lagre som PDF/i).length).toBeGreaterThan(0);
});

it('clears stale sambandsplan export preview when fields change', async () => {
  render(<CommsPlanForm contentVersion="test-content-ui-comms" />);
  await userEvent.type(screen.getByLabelText(/Primær kanal\/talegruppe/i), 'Primær første');
  await userEvent.type(screen.getByLabelText(/Fallback kanal\/kontaktmetode/i), 'Fallback første');
  await userEvent.type(screen.getByLabelText(/Kallesignal/i), 'Kallesignal første');
  await userEvent.type(screen.getByLabelText(/IL-KO kontakt/i), 'IL første');
  await userEvent.type(screen.getByLabelText(/Distrikt\/beredskapsvakt kontakt/i), 'Distrikt første');
  await userEvent.type(screen.getByLabelText(/Innsjekkingsintervall/i), '30 min');
  await userEvent.type(screen.getByLabelText(/Prosedyre ved bortfall av samband/i), 'Fallback først');
  await userEvent.type(screen.getByLabelText(/Batteri-\/ladestatus/i), 'Fulladet');
  await userEvent.click(screen.getByRole('button', { name: /Eksporter Markdown/i }));
  await userEvent.click(screen.getByText(/Vis forhåndsvisning/i));

  expectPreviewValue(/Sambandsplan/i, /# Sambandsplan/i);
  expectPreviewValue(/Sambandsplan/i, /Primær første/i);

  await userEvent.type(screen.getByLabelText(/Primær kanal\/talegruppe/i), ' oppdatert');

  expect(previewTextarea('comms-plan-preview')).not.toBeInTheDocument();
  expect(screen.queryByText(/Primær første/i)).not.toBeInTheDocument();
});

it('blocks sambandsplan preview when sensitive contact text is entered', async () => {
  render(<CommsPlanForm contentVersion="test-content-ui-comms" />);
  await userEvent.type(screen.getByLabelText(/Primær kanal\/talegruppe/i), 'Primær etter lokal plan');
  await userEvent.type(screen.getByLabelText(/Fallback kanal\/kontaktmetode/i), 'Fallback etter lokal plan');
  await userEvent.type(screen.getByLabelText(/Kallesignal/i), 'FIG Leder');
  await userEvent.type(screen.getByLabelText(/IL-KO kontakt/i), '+47 99999999');
  await userEvent.type(screen.getByLabelText(/Distrikt\/beredskapsvakt kontakt/i), 'Distrikt kontaktpunkt');
  await userEvent.type(screen.getByLabelText(/Innsjekkingsintervall/i), '30 min');
  await userEvent.type(screen.getByLabelText(/Prosedyre ved bortfall av samband/i), 'Fallback først');
  await userEvent.type(screen.getByLabelText(/Batteri-\/ladestatus/i), 'Fulladet');
  await userEvent.click(screen.getByRole('button', { name: /Eksporter Markdown/i }));

  expect(await screen.findByText(/Eksport blokkert/i)).toBeInTheDocument();
  expect(screen.queryByText(/# Sambandsplan/i)).not.toBeInTheDocument();
});

it('mounts order and comms forms in the mission route', async () => {
  await saveMission(buildMission({ id: 'mission-order-route', title: 'Ordre route' }));
  render(<MissionsPage />);
  await userEvent.click(await screen.findByRole('tab', { name: 'Eksport' }));
  expect(screen.getByText(/Ordre, samband og status/i)).toBeInTheDocument();
  await userEvent.click((screen.getAllByText(/^5-punktsordre$/i)[0]));
  await userEvent.click((screen.getAllByText(/^Sambandsplan$/i)[0]));
  expect(screen.getAllByRole('button', { name: /Eksporter Markdown/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByLabelText(/rolle\/mal for sambandsplan/i)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Eksporter JSON/i }).length).toBeGreaterThanOrEqual(1);
});
