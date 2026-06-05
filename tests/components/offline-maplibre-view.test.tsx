import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfflineMapLibreView } from '@/components/maps/offline-maplibre-view';

vi.mock('maplibre-gl', () => ({
  default: {
    addProtocol: vi.fn(),
    Map: vi.fn(() => ({ remove: vi.fn(), on: vi.fn(), addControl: vi.fn() })),
    NavigationControl: vi.fn(),
  },
}));

vi.mock('pmtiles', () => ({ Protocol: vi.fn(() => ({ tile: vi.fn() })) }));

it('renders disabled fallback copy when no approved local package is selected', () => {
  render(<OfflineMapLibreView packageManifest={undefined} />);
  expect(screen.getByText(/Skjematisk kart er aktiv fallback/i)).toBeInTheDocument();
});

it('renders a local-package container and attribution for an approved package', () => {
  render(<OfflineMapLibreView packageManifest={{
    id: 'demo',
    title: 'Demo PMTiles',
    provider: 'training-demo',
    runtimeFormat: 'pmtiles',
    sourceFormat: 'pmtiles',
    url: '/map-packages/demo.pmtiles',
    styleUrl: '/map-packages/demo-style.json',
    attribution: 'Demo attribution',
    version: '2026.06-a',
    updatedAt: '2026-06-05',
    estimatedSizeMb: 12,
    bounds: [10, 63, 11, 64],
    center: [10.4, 63.4],
    minZoom: 8,
    maxZoom: 14,
    approvedForOfflineUse: true,
    provenance: 'Demo local package for tests',
  }} />);

  expect(screen.getByTestId('offline-maplibre-container')).toBeInTheDocument();
  expect(screen.getByText('Demo attribution')).toBeInTheDocument();
});
