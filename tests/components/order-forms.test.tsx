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
  render(<FivePointOrderForm />);
  for (const label of ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband']) {
    const field = screen.getByLabelText(new RegExp(label, 'i'));
    expect(field).toBeRequired();
    await userEvent.type(field, `${label} tekst`);
  }
  await userEvent.type(screen.getByLabelText(/Notes/i), 'lokal note');
  await userEvent.click(screen.getByRole('button', { name: /Eksporter 5-punktsordre/i }));
  expect(screen.getByText(/# 5-punktsordre/i)).toBeInTheDocument();
  expect(screen.getByText(/src-5-punktsordre/i)).toBeInTheDocument();
});

it('requires samband fields and renders exported markdown', async () => {
  render(<CommsPlanForm />);
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
});

it('mounts order and comms forms in the mission route', () => {
  render(<MissionsPage />);
  expect(screen.getByRole('heading', { name: /Ordre og samband/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Eksporter 5-punktsordre/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Eksporter sambandsplan/i })).toBeInTheDocument();
});
