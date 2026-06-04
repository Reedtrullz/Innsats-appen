import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { OfflineMapPanel } from '@/components/offline-map-panel';
import { OFFLINE_MAP_CACHE_STORAGE_KEY } from '@/lib/maps/offline-map';
import { OPERATIONS_MAP_STORAGE_KEY, SCHEMATIC_GEOJSON_COORDINATE_SYSTEM } from '@/lib/maps/operations-map';
import { readLocalAuditLog } from '@/lib/privacy/local-profile';

afterEach(() => localStorage.clear());

it('renders a static offline map with attribution and local-only limitations', () => {
  render(<OfflineMapPanel />);

  expect(screen.getByRole('heading', { name: 'Kart' })).toBeInTheDocument();
  expect(screen.getAllByText(/Schematic local map package, not authoritative navigation/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Ingen eksterne kartfliser/i)).toBeInTheDocument();
  expect(screen.getByText(/ingen nettverksnedlasting/i)).toBeInTheDocument();
  expect(screen.getAllByText(/ingen backend sync/i).length).toBeGreaterThan(0);
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

it('adds local operational markers, toggles layers, and resets local sectors', async () => {
  const user = userEvent.setup();
  render(<OfflineMapPanel />);

  await user.selectOptions(screen.getByRole('combobox', { name: /Markørtype/i }), 'hazard');
  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Fareområde');
  await user.clear(screen.getByRole('spinbutton', { name: /X 0-100/i }));
  await user.type(screen.getByRole('spinbutton', { name: /X 0-100/i }), '31');
  await user.clear(screen.getByRole('spinbutton', { name: /Y 0-100/i }));
  await user.type(screen.getByRole('spinbutton', { name: /Y 0-100/i }), '44');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));

  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Fare — Fareområde/i);
  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toContain('hazard');

  await user.click(screen.getByLabelText('Fare'));
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Ingen synlige markører/i);

  await user.click(screen.getByRole('button', { name: /Nullstill lokale sektorer/i }));
  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toBeNull();
});

it('adds a local sector, measures it, and creates sanitized SVG and GeoJSON exports', async () => {
  const user = userEvent.setup();
  render(<OfflineMapPanel />);

  await user.click(screen.getByRole('button', { name: /Lagre lokal tegning\/sektor/i }));
  expect(screen.getByTestId('map-measurement-readout')).toHaveTextContent(/Sektor\/teig: avstand/i);
  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toContain('sector');

  await user.click(screen.getByRole('button', { name: /Lag kartbilde/i }));
  expect((screen.getByLabelText(/Kartbilde SVG/i) as HTMLTextAreaElement).value).toContain('aria-label="Sanitert lokalt kartbilde"');
  expect(readLocalAuditLog().some((entry) => entry.details.exportKind === 'map-svg')).toBe(true);

  await user.click(screen.getByRole('button', { name: /Lag GeoJSON eksport/i }));
  expect((screen.getByLabelText(/GeoJSON eksport/i) as HTMLTextAreaElement).value).toContain('schematic-0-100-local-only');
  expect(readLocalAuditLog().some((entry) => entry.details.exportKind === 'map-geojson')).toBe(true);
  expect(screen.getAllByText(/Lokale kartmarkører og sektorer kan røpe/i).length).toBeGreaterThan(0);
});

it('imports supported schematic GeoJSON and documents KML and blue-force as post-MVP', async () => {
  const user = userEvent.setup();
  render(<OfflineMapPanel />);

  fireEvent.change(screen.getByRole('textbox', { name: /Importer GeoJSON/i }), { target: { value: JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'il-ko', label: 'KO lokal', secret: 'drop' } },
    ],
  }) } });
  await user.click(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i }));

  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/IL-KO — KO lokal/i);
  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toContain('il-ko');
  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).not.toContain('drop');
  expect(screen.getByText(/KML-import er ikke implementert i MVP/i)).toBeInTheDocument();
  expect(screen.getByText(/Delt live posisjon\/blue-force tracking skal ikke bygges i MVP/i)).toBeInTheDocument();
});
