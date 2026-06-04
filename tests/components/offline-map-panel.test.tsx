import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { OfflineMapPanel } from '@/components/offline-map-panel';
import { OFFLINE_MAP_CACHE_STORAGE_KEY } from '@/lib/maps/offline-map';

afterEach(() => localStorage.clear());

it('renders a static offline map with attribution and local-only limitations', () => {
  render(<OfflineMapPanel />);

  expect(screen.getByRole('heading', { name: 'Kart' })).toBeInTheDocument();
  expect(screen.getAllByText(/Schematic local map package, not authoritative navigation/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Ingen eksterne kartfliser/i)).toBeInTheDocument();
  expect(screen.getByText(/ingen nettverksnedlasting/i)).toBeInTheDocument();
  expect(screen.getByText(/ingen backend sync/i)).toBeInTheDocument();
  expect(screen.getByTestId('map-performance-guard')).toHaveTextContent(/Ytelsesvern/i);
  expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Ingen kartpakke/i);
});

it('stores selected map package cache metadata in localStorage and can reset it', async () => {
  const user = userEvent.setup();
  render(<OfflineMapPanel />);

  await user.selectOptions(screen.getByRole('combobox', { name: /Velg lokal kartpakke/i }), 'trondelag-oversikt');
  expect(screen.getByText(/Cache-varsel: Trøndelag oversiktspakke.*42 MB/i)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }));
  await waitFor(() => {
    expect(localStorage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY)).toContain('trondelag-oversikt');
    expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Cachet lokalt: Trøndelag oversiktspakke/i);
  });

  await user.click(screen.getByRole('button', { name: /Tilbakestill kartcache/i }));
  await waitFor(() => {
    expect(localStorage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Ingen kartpakke/i);
  });
});

it('keeps rendered map marker count capped for the large district package', async () => {
  const user = userEvent.setup();
  render(<OfflineMapPanel />);

  await user.selectOptions(screen.getByRole('combobox', { name: /Velg lokal kartpakke/i }), 'trondelag-oversikt');
  expect(screen.getByTestId('map-performance-guard')).toHaveTextContent(/viser maks 12/i);
  expect(screen.getByTestId('map-performance-guard')).toHaveTextContent(/2 skjult/i);
});
