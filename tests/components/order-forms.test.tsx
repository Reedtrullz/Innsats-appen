import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import MissionsPage from '@/app/(app)/oppdrag/page';
import { CommsPlanForm } from '@/components/forms/comms-plan-form';
import { FivePointOrderForm } from '@/components/forms/five-point-order-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

it('requires samband fields and renders exported markdown', async () => {
  render(<CommsPlanForm />);
  expect(screen.getByText(/lagres bare lokalt/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke legg inn persondata/i)).toBeInTheDocument();
  expect(screen.getByText(/eksporterte filer kan inneholde operasjonelt sensitiv informasjon/i)).toBeInTheDocument();
  const channel = screen.getByLabelText(/Kanal\/talegruppe/i);
  const callsign = screen.getByLabelText(/Kallesignal/i);
  const phone = screen.getByLabelText(/Telefon\/ISSI/i);
  expect(channel).toBeRequired();
  expect(callsign).toBeRequired();
  await userEvent.type(channel, 'Talegruppe Innsats-1');
  await userEvent.type(callsign, 'FIG Trondheim 01');
  await userEvent.type(phone, 'ISSI etter lokal plan');
  await userEvent.type(screen.getByLabelText(/Notes/i), 'Fallback avtales lokalt');
  await userEvent.click(screen.getByRole('button', { name: /Eksporter sambandsplan/i }));
  expect(screen.getByText(/# Sambandsplan/i)).toBeInTheDocument();
  expect(screen.getByText(/Talegruppe Innsats-1/i)).toBeInTheDocument();
  expect(screen.getByText(/src-kommunikasjons-og-sambandsdiagram/i)).toBeInTheDocument();
  expect(screen.getAllByText(/operasjonelt sensitiv informasjon/i).length).toBeGreaterThan(0);
});

it('mounts order and comms forms in the mission route', () => {
  render(<MissionsPage />);
  expect(screen.getByRole('heading', { name: /Ordre og samband/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Eksporter Markdown/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Eksporter sambandsplan/i })).toBeInTheDocument();
});
