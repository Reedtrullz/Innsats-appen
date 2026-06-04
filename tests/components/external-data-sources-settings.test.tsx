import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { ExternalDataSourcesSettings } from '@/components/external-data-sources-settings';
import {
  EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY,
  activeSignalsForExternalDataSourceSettings,
  displaySignalsForExternalDataSourceSettings,
  parseExternalDataSourceSettings,
  readExternalDataSourceSettings,
  writeExternalDataSourceSettings,
} from '@/lib/integrations/source-settings';
import type { ExternalContextSignal } from '@/lib/integrations/types';

const signal: ExternalContextSignal = {
  source: 'met',
  kind: 'weather',
  severity: 'info',
  title: 'Vær',
  summary: 'OK',
  validFrom: null,
  validTo: null,
  fetchedAt: '2026-06-02T20:00:00.000Z',
  staleness: 'fresh',
  upstreamHash: 'abc123',
  rawRef: 'met:locationforecast',
};

afterEach(() => localStorage.clear());

it('stores Kartverket, MET and NVE source toggles only in localStorage', async () => {
  render(<ExternalDataSourcesSettings />);

  expect(await screen.findByRole('heading', { name: /Eksterne datakilder/i })).toBeInTheDocument();
  expect(screen.getByText(/lagres bare i localStorage/i)).toBeInTheDocument();
  expect(screen.getByText(/synkroniseres ikke til backend/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('checkbox', { name: /Kartverket aktivert/i }));
  await userEvent.click(screen.getByRole('checkbox', { name: /MET Norway aktivert/i }));
  await userEvent.click(screen.getByRole('checkbox', { name: /NVE \/ Varsom aktivert/i }));

  await waitFor(() => {
    const stored = localStorage.getItem(EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY) ?? '';
    expect(stored).toContain('"kartverket":false');
    expect(stored).toContain('"met":false');
    expect(stored).toContain('"nve":false');
  });
  expect(screen.getByTestId('external-source-status')).toHaveTextContent(/Avslått lokalt: Kartverket, MET Norway, NVE \/ Varsom/i);

  await userEvent.click(screen.getByRole('button', { name: /Tilbakestill datakilder/i }));
  expect(parseExternalDataSourceSettings(localStorage.getItem(EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY))).toEqual({ kartverket: true, met: true, nve: true });
});

it('filters active signals for disabled sources but keeps last-known-good stale display context', () => {
  const settings = { kartverket: true, met: false, nve: true };
  expect(activeSignalsForExternalDataSourceSettings([signal], settings)).toEqual([]);
  expect(displaySignalsForExternalDataSourceSettings([signal], settings)[0]).toMatchObject({ source: 'met', staleness: 'stale', title: 'Vær' });
  expect(displaySignalsForExternalDataSourceSettings([{ ...signal, staleness: 'stale' }], settings)[0]?.staleness).toBe('stale');
});

it('falls back safely when browser storage is restricted', () => {
  const throwingStorage = {
    getItem: () => { throw new Error('storage blocked'); },
    setItem: () => { throw new Error('storage blocked'); },
  };
  expect(readExternalDataSourceSettings(throwingStorage)).toEqual({ kartverket: true, met: true, nve: true });
  expect(writeExternalDataSourceSettings({ kartverket: false, met: true, nve: false }, throwingStorage)).toEqual({ kartverket: false, met: true, nve: false });
});

it('falls back safely when the localStorage accessor itself is blocked', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => { throw new Error('blocked accessor'); },
  });
  try {
    expect(readExternalDataSourceSettings()).toEqual({ kartverket: true, met: true, nve: true });
    expect(writeExternalDataSourceSettings({ kartverket: false, met: true, nve: false })).toEqual({ kartverket: false, met: true, nve: false });
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  }
});
