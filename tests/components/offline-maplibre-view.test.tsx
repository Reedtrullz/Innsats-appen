import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalMapPackageManifest } from '@/lib/maps/offline-map-package-manifest';
import { resetPmtilesRuntimeForTests } from '@/lib/maps/maplibre-runtime';
import { OfflineMapLibreView } from '@/components/maps/offline-maplibre-view';

const maplibreMocks = vi.hoisted(() => ({
  addProtocol: vi.fn(),
  mapConstructor: vi.fn(),
  mapRemove: vi.fn(),
  mapOn: vi.fn(),
  protocolTile: vi.fn(),
  protocolConstructor: vi.fn(),
  errorHandler: undefined as undefined | (() => void),
}));

vi.mock('maplibre-gl', () => ({
  default: {
    addProtocol: maplibreMocks.addProtocol,
    Map: maplibreMocks.mapConstructor,
    NavigationControl: vi.fn(),
  },
}));

vi.mock('pmtiles', () => ({ Protocol: maplibreMocks.protocolConstructor }));

const demoPackage: LocalMapPackageManifest = {
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
};

beforeEach(() => {
  resetPmtilesRuntimeForTests();
  maplibreMocks.errorHandler = undefined;
  maplibreMocks.addProtocol.mockReset();
  maplibreMocks.mapRemove.mockReset();
  maplibreMocks.mapOn.mockReset();
  maplibreMocks.mapOn.mockImplementation((event: string, handler: () => void) => {
    if (event === 'error') maplibreMocks.errorHandler = handler;
  });
  maplibreMocks.mapConstructor.mockReset();
  maplibreMocks.mapConstructor.mockImplementation(function MapMock() {
    return {
      remove: maplibreMocks.mapRemove,
      on: maplibreMocks.mapOn,
      addControl: vi.fn(),
    };
  });
  maplibreMocks.protocolTile.mockReset();
  maplibreMocks.protocolConstructor.mockReset();
  maplibreMocks.protocolConstructor.mockImplementation(function ProtocolMock() {
    return { tile: maplibreMocks.protocolTile };
  });
});

describe('OfflineMapLibreView', () => {
  it('renders disabled fallback copy when no approved local package is selected', () => {
    render(<OfflineMapLibreView packageManifest={undefined} />);
    expect(screen.getByText(/Skjematisk kart er aktiv fallback/i)).toBeInTheDocument();
  });

  it('creates a local MapLibre map with approved package options and removes it on unmount', async () => {
    const { unmount } = render(<OfflineMapLibreView packageManifest={demoPackage} />);

    expect(screen.getByTestId('offline-maplibre-container')).toBeInTheDocument();
    expect(screen.getByText('Demo attribution')).toBeInTheDocument();

    await waitFor(() => expect(maplibreMocks.mapConstructor).toHaveBeenCalledTimes(1));
    expect(maplibreMocks.addProtocol).toHaveBeenCalledWith('pmtiles', maplibreMocks.protocolTile);
    expect(maplibreMocks.mapConstructor.mock.calls[0][0]).toMatchObject({
      style: '/map-packages/demo-style.json',
      center: [10.4, 63.4],
      zoom: 10,
      minZoom: 8,
      maxZoom: 14,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });

    unmount();
    expect(maplibreMocks.mapRemove).toHaveBeenCalledTimes(1);
  });

  it('renders the supplied schematic fallback when MapLibre reports a load error', async () => {
    render(
      <OfflineMapLibreView
        packageManifest={demoPackage}
        fallback={<div data-testid="schematic-fallback">Skjematisk fallback-rendering</div>}
      />,
    );

    await waitFor(() => expect(maplibreMocks.mapOn).toHaveBeenCalledWith('error', expect.any(Function)));

    act(() => {
      maplibreMocks.errorHandler?.();
    });

    expect(screen.getByText(/Kunne ikke åpne lokal kartpakke/i)).toBeInTheDocument();
    expect(screen.getByTestId('schematic-fallback')).toBeInTheDocument();
  });
});
