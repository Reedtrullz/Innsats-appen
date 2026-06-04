import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import MissionsPage from '@/app/(app)/oppdrag/page';
import { CommsPlanForm } from '@/components/forms/comms-plan-form';
import { FivePointOrderForm } from '@/components/forms/five-point-order-form';
import { readLocalAuditLog } from '@/lib/privacy/local-profile';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  localStorage.clear();
});

it('requires all five order points and renders exported markdown', async () => {
  render(<FivePointOrderForm contentVersion="test-content-ui" />);
  expect(screen.getByText(/lagres bare lokalt/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke legg inn persondata/i)).toBeInTheDocument();
  expect(screen.getByText(/eksporterte filer kan inneholde operasjonelt sensitiv informasjon/i)).toBeInTheDocument();
  const templateSelect = screen.getByLabelText(/rolle\/mal for 5-punktsordre/i);
  expect(templateSelect).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /lagleder\/lagfører/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /fig-leder/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /mfe/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /lia\/liaison/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /beredskapsvakt/i })).toBeInTheDocument();
  await userEvent.selectOptions(templateSelect, 'mfe');
  expect(screen.getByRole('heading', { name: /malveiledning: mfe/i })).toBeInTheDocument();
  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    const field = screen.getByLabelText(new RegExp(label, 'i'));
    expect(field).toBeRequired();
    await userEvent.type(field, `${label} tekst`);
  }
  await userEvent.type(screen.getByLabelText(/Notes/i), 'lokal note');
  const markdownButton = screen.getByRole('button', { name: /Eksporter Markdown/i });
  const jsonButton = screen.getByRole('button', { name: /Eksporter JSON/i });
  const pdfButton = screen.getByRole('button', { name: /Lag PDF-klar HTML/i });
  expect(markdownButton).toBeDisabled();
  expect(jsonButton).toBeDisabled();
  expect(pdfButton).toBeDisabled();
  const readback = screen.getByLabelText(/tilbakelesing\/forstått er bekreftet/i);
  expect(readback).toBeRequired();
  await userEvent.click(readback);
  expect(markdownButton).toBeEnabled();
  expect(jsonButton).toBeEnabled();
  expect(pdfButton).toBeEnabled();
  await userEvent.click(markdownButton);
  expect(readLocalAuditLog().some((entry) => entry.type === 'export-created' && entry.details.exportKind === 'five-point-order-markdown')).toBe(true);
  expect(screen.getByText(/# 5-punktsordre/i)).toBeInTheDocument();
  expect(screen.getByText(/src-5-punktsordre/i)).toBeInTheDocument();
  expect(screen.getAllByText(/operasjonelt sensitiv informasjon/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Tilbakelesing\/forstått: Bekreftet/i)).toBeInTheDocument();
  expect(screen.getByText(/Innholdsversjon: test-content-ui/i)).toBeInTheDocument();
  await userEvent.click(jsonButton);
  expect(screen.getByText(/"schemaVersion": "five-point-order.v1"/i)).toBeInTheDocument();
  await userEvent.click(pdfButton);
  expect(screen.getAllByText(/PDF-klar HTML/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Skriv ut.*Lagre som PDF/i).length).toBeGreaterThan(0);
});

it('clears stale 5-punktsordre export preview when order text changes', async () => {
  render(<FivePointOrderForm contentVersion="test-content-ui" />);

  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    await userEvent.type(screen.getByLabelText(new RegExp(label, 'i')), `${label} første`);
  }
  await userEvent.click(screen.getByLabelText(/tilbakelesing\/forstått er bekreftet/i));
  await userEvent.click(screen.getByRole('button', { name: /Eksporter Markdown/i }));

  expect(screen.getByText(/# 5-punktsordre/i)).toBeInTheDocument();
  expect(screen.getByText(/Situasjon første/i)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/Situasjon/i), ' oppdatert');

  expect(screen.queryByText(/# 5-punktsordre/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Situasjon første/i)).not.toBeInTheDocument();
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
  expect(screen.getByText(/# Sambandsplan/i)).toBeInTheDocument();
  expect(screen.getByText(/Talegruppe etter lokal plan/i)).toBeInTheDocument();
  expect(screen.getByText(/Innholdsversjon: test-content-ui-comms/i)).toBeInTheDocument();
  expect(screen.getByText(/src-kommunikasjons-og-sambandsdiagram/i)).toBeInTheDocument();
  expect(screen.getAllByText(/operasjonelt sensitiv informasjon/i).length).toBeGreaterThan(0);
  await userEvent.click(jsonButton);
  expect(screen.getByText(/"schemaVersion": "sambandsplan.v1"/i)).toBeInTheDocument();
  await userEvent.click(pdfButton);
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

  expect(screen.getByText(/# Sambandsplan/i)).toBeInTheDocument();
  expect(screen.getByText(/Primær første/i)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/Primær kanal\/talegruppe/i), ' oppdatert');

  expect(screen.queryByText(/# Sambandsplan/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Primær første/i)).not.toBeInTheDocument();
});

it('mounts order and comms forms in the mission route', () => {
  render(<MissionsPage />);
  expect(screen.getByRole('heading', { name: /Ordre og samband/i })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Eksporter Markdown/i }).length).toBeGreaterThanOrEqual(2);
  expect(screen.getByLabelText(/rolle\/mal for sambandsplan/i)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Eksporter JSON/i }).length).toBeGreaterThanOrEqual(2);
});
