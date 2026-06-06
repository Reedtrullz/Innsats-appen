import { render, screen, within } from '@testing-library/react';
import { ContextSignalPanel, markStoredContextSignalsStale } from '@/components/context-signal-panel';
import type { ExternalContextSignal } from '@/lib/integrations/types';

const freshSignal: ExternalContextSignal = {
  source: 'met',
  kind: 'weather',
  severity: 'info',
  title: 'Vær',
  summary: 'Siste værdata',
  validFrom: null,
  validTo: null,
  fetchedAt: '2026-06-02T20:00:00.000Z',
  staleness: 'fresh',
  upstreamHash: 'abc123',
  rawRef: 'met:locationforecast',
};

it('shows stale, unavailable, last-success and separation warnings', () => {
  const storedStaleSignals = markStoredContextSignalsStale([freshSignal]);
  render(<ContextSignalPanel signals={storedStaleSignals} unavailableSources={['nve']} />);

  const panel = screen.getByRole('region', { name: /offentlig kontekst/i });
  expect(within(panel).getAllByText(/stale/i).length).toBeGreaterThan(0);
  expect(within(panel).getByText(/nve.*utilgjengelig/i)).toBeInTheDocument();
  expect(within(panel).getByText(/erstatter ikke offisielle ordre/i)).toBeInTheDocument();
  expect(within(panel).getAllByText(/sist vellykkede/i).length).toBeGreaterThan(0);
  expect(within(panel).queryByText(/Tiltak:/i)).not.toBeInTheDocument();
  expect(within(panel).queryByText(/steps/i)).not.toBeInTheDocument();
});

it('shows an unavailable-source empty state when no context signals exist', () => {
  render(<ContextSignalPanel signals={[]} unavailableSources={['met', 'nve']} />);

  const panel = screen.getByRole('region', { name: /offentlig kontekst/i });
  expect(within(panel).getByText(/ingen ferske offentlige kontekstsignaler/i)).toBeInTheDocument();
  expect(within(panel).getByText(/met.*utilgjengelig eller avslått lokalt/i)).toBeInTheDocument();
  expect(within(panel).getByText(/nve.*utilgjengelig eller avslått lokalt/i)).toBeInTheDocument();
});

it('shows severity and validity without exposing raw upstream references', () => {
  render(<ContextSignalPanel signals={[{
    ...freshSignal,
    severity: 'orange',
    validFrom: '2026-06-02T07:00:00Z',
    validTo: '2026-06-03T07:00:00Z',
    upstreamId: 'nve:5001:secret-warning-id',
    rawRef: 'nve:flood-warning',
  }]} />);

  const panel = screen.getByRole('region', { name: /offentlig kontekst/i });
  expect(within(panel).getByText(/alvorlighet:\s*orange/i)).toBeInTheDocument();
  expect(within(panel).getByText(/gyldighet: 2026-06-02T07:00:00Z .* 2026-06-03T07:00:00Z/i)).toBeInTheDocument();
  expect(within(panel).queryByText(/secret-warning-id/i)).not.toBeInTheDocument();
  expect(within(panel).queryByText(/nve:flood-warning/i)).not.toBeInTheDocument();
  expect(within(panel).queryByText(/abc123/i)).not.toBeInTheDocument();
});

it('marks last successful local mission signals stale after a failed refresh', () => {
  const staleSignals = markStoredContextSignalsStale([freshSignal]);
  expect(staleSignals[0]?.staleness).toBe('stale');
  expect(staleSignals[0]?.title).toBe('Vær');
});
