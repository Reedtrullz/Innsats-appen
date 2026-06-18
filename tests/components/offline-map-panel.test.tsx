import { act, fireEvent, render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import { FIELD_MODE_STORAGE_EVENT, FIELD_MODE_STORAGE_KEY } from '@/lib/field-mode/field-mode';
import { saveSelectedActiveMissionId } from '@/lib/mission/active-mission-selection';
import { clearLocalMissionData, getMission, saveMission } from '@/lib/mission/local-store';
import { OFFLINE_MAP_CACHE_STORAGE_KEY, offlineMapQuotaCopy } from '@/lib/maps/offline-map';
import type { LocalMapPackageManifest } from '@/lib/maps/offline-map-package-manifest';
import {
  OPERATIONS_MAP_STORAGE_KEY,
  SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
  createMissionMapDrawing,
  createMissionMapMarker,
  readMissionMapState,
  writeMissionMapState,
} from '@/lib/maps/operations-map';
import { readLocalAuditLog } from '@/lib/privacy/local-profile';
import type { FieldLogEntry, MissionContext } from '@/lib/mission/schemas';
import { buildMission } from '../helpers/mission-fixtures';
import { flushAsyncEffects } from '../helpers/react-effects';

const approvedPmtilesPackage = Object.freeze({
  id: 'trondheim-demo-pmtiles',
  title: 'Trondheim demo PMTiles',
  provider: 'training-demo',
  runtimeFormat: 'pmtiles',
  sourceFormat: 'pmtiles',
  url: '/map-packages/trondheim-demo.pmtiles',
  styleUrl: '/map-packages/trondheim-demo-style.json',
  attribution: 'Beredskapsboka test fixture attribution',
  version: '2026.06-a',
  updatedAt: '2026-06-05',
  estimatedSizeMb: 12,
  bounds: [10.2, 63.2, 10.6, 63.6] as [number, number, number, number],
  center: [10.4, 63.4] as [number, number],
  minZoom: 8,
  maxZoom: 14,
  approvedForOfflineUse: true,
  provenance: 'Test-only approved PMTiles package fixture for offline map selection coverage.',
} as const);

const alternateApprovedPmtilesPackage = Object.freeze({
  ...approvedPmtilesPackage,
  id: 'stjordal-demo-pmtiles',
  title: 'Stjørdal demo PMTiles',
  url: '/map-packages/stjordal-demo.pmtiles',
  styleUrl: '/map-packages/stjordal-demo-style.json',
  provenance: 'Second test-only approved PMTiles package fixture for package-change coverage.',
} as const);

function mockApprovedLocalMapPackages(packages: readonly LocalMapPackageManifest[] = [approvedPmtilesPackage]) {
  vi.resetModules();
  vi.doMock('@/lib/maps/offline-map-package-manifest', () => ({
    approvedLocalMapPackages: Object.freeze(packages),
    localMapPackageForId: (id: string | null | undefined) => packages.find((mapPackage) => mapPackage.id === id),
  }));
}

function mockMapPackageCache(result: { cached: number } | Promise<{ cached: number }> | Error = { cached: 2 }) {
  const cacheLocalMapPackageAssets = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  vi.doMock('@/lib/maps/map-package-cache', () => ({
    MAP_PACKAGE_CACHE_NAME: 'beredskapsboka-map-packages',
    cacheLocalMapPackageAssets,
  }));
  return cacheLocalMapPackageAssets;
}

const originalNavigatorStorageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'storage');

afterEach(async () => {
  await act(async () => {
    localStorage.clear();
    if (originalNavigatorStorageDescriptor) {
      Object.defineProperty(navigator, 'storage', originalNavigatorStorageDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'storage');
    }
    vi.doUnmock('@/lib/maps/offline-map-package-manifest');
    vi.doUnmock('@/lib/maps/map-package-cache');
    vi.resetModules();
    await clearLocalMissionData();
  });
});

const activeMission: MissionContext = buildMission({
  id: 'mission-map-log',
  title: 'Kartlogg test',
  createdAt: '2026-06-04T09:00:00.000Z',
  updatedAt: '2026-06-04T09:00:00.000Z',
  phase: 'under',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Innsatsområde kart',
  externalSignals: [],
  externalSignalHistory: [],
  activeChecklistIds: [],
  notes: '',
  tasks: [],
  statusLog: [],
  resourceRequests: [],
  fieldLogEntries: [],
  ruhReports: [],
  welfareChecks: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
});

const otherMission: MissionContext = buildMission({
  id: 'mission-other-map-log',
  title: 'Annet kartoppdrag',
  createdAt: '2026-06-04T08:00:00.000Z',
  updatedAt: '2026-06-04T08:00:00.000Z',
  phase: 'under',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Annet innsatsområde',
  externalSignals: [],
  externalSignalHistory: [],
  activeChecklistIds: [],
  notes: '',
  tasks: [],
  statusLog: [],
  resourceRequests: [],
  fieldLogEntries: [],
  ruhReports: [],
  welfareChecks: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
});

function mission(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    ...activeMission,
    fieldLogEntries: [],
    ...overrides,
  };
}


async function renderOfflineMapPanel(): Promise<RenderResult> {
  const { OfflineMapPanel } = await import('@/components/offline-map-panel');
  const result = render(<OfflineMapPanel />);
  await flushAsyncEffects();
  return result;
}

async function seedMissions(missions: MissionContext[]) {
  for (const item of missions) {
    await saveMission(item);
  }
}

it('renders a static offline map with attribution and local-only limitations', async () => {
  await renderOfflineMapPanel();

  expect(screen.getByRole('heading', { name: 'Kart' })).toBeInTheDocument();
  expect(screen.getAllByText(/Schematic local map package, not authoritative navigation/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Kart, markører og logger blir på enheten/i)).toBeInTheDocument();
  expect(screen.getByText(/Ingen kart deles med oppdrag eller andre enheter/i)).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/backend sync|backend-sync|CacheStorage|post-MVP|MVP/i);
  expect(screen.getByTestId('map-performance-guard')).toHaveTextContent(/Ytelsesvern/i);
  expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Ingen kartpakke/i);
});

it('shows map work actions before advanced local map package controls', async () => {
  await renderOfflineMapPanel();

  const markerButton = screen.getByRole('button', { name: /Legg til lokal markør/i });
  const packageRegion = screen.getByRole('region', { name: /Lokale kartpakker/i });
  expect(Boolean(markerButton.compareDocumentPosition(packageRegion) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
});

it('uses larger map controls when field glove mode is enabled', async () => {
  mockApprovedLocalMapPackages();
  localStorage.setItem(FIELD_MODE_STORAGE_KEY, JSON.stringify({ enabled: true, gloveMode: true, theme: 'day', outdoorReadabilityReviewed: true }));
  await renderOfflineMapPanel();

  expect(await screen.findByText(/Feltmodus aktiv/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Legg til lokal markør/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Lagre lokal tegning\/sektor/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Logg fra nyeste synlige markør/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Lag kartbilde/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Lag GeoJSON eksport/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i })).not.toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i })).not.toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Tilbakestill kartcache/i })).not.toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Nullstill lokale sektorer/i })).not.toHaveClass('min-h-16');
});

it('keeps marker and drawing row actions at or above 44px touch targets', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [createMissionMapMarker({ kind: 'hazard', missionId: activeMission.id, label: 'Kort', x: 20, y: 30 }, new Date('2026-06-05T10:00:00Z'))],
    drawings: [createMissionMapDrawing({ kind: 'sector', missionId: activeMission.id, label: 'Teig kort', coordinates: '10,10 20,10 15,20' }, new Date('2026-06-05T10:01:00Z'))],
  });

  await renderOfflineMapPanel();

  for (const button of [
    screen.getByRole('button', { name: /Logg herfra Kort/i }),
    screen.getByRole('button', { name: /Rediger Kort/i }),
    screen.getByRole('button', { name: /Slett Kort/i }),
    screen.getByRole('button', { name: /Logg herfra Teig kort/i }),
    screen.getByRole('button', { name: /Rediger Teig kort/i }),
    screen.getByRole('button', { name: /Slett Teig kort/i }),
  ]) {
    expect(button).toHaveClass('min-h-11');
  }

  await user.click(screen.getByRole('button', { name: /Rediger Kort/i }));
  expect(screen.getByRole('button', { name: /Lagre markørendring/i })).toHaveClass('min-h-11');
  expect(screen.getByRole('button', { name: /Avbryt/i })).toHaveClass('min-h-11');

  await user.click(screen.getByRole('button', { name: /Avbryt/i }));
  await user.click(screen.getByRole('button', { name: /Rediger Teig kort/i }));
  expect(screen.getByRole('button', { name: /Lagre sektorendring/i })).toHaveClass('min-h-11');
  expect(screen.getByRole('button', { name: /Avbryt/i })).toHaveClass('min-h-11');
});

it('wraps marker and drawing action rows for long mobile labels', async () => {
  const longMarkerLabel = 'Sanitert-lokal-etikett-med-ekstra-lang-fritekst-for-iPhone-428px-rad';
  const longDrawingLabel = 'Lang-sanitert-teig-etikett-med-ekstra-mobiltekst-for-428px-visning';
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [createMissionMapMarker({ kind: 'hazard', missionId: activeMission.id, label: longMarkerLabel, x: 20, y: 30 }, new Date('2026-06-05T10:00:00Z'))],
    drawings: [createMissionMapDrawing({ kind: 'sector', missionId: activeMission.id, label: longDrawingLabel, coordinates: '10,10 20,10 15,20' }, new Date('2026-06-05T10:01:00Z'))],
  });

  await renderOfflineMapPanel();

  const markerRow = screen.getByTestId('operations-marker-action-row');
  const drawingRow = screen.getByTestId('operations-drawing-action-row');
  const markerSummary = markerRow.querySelector('span');
  const drawingSummary = drawingRow.querySelector('span');

  expect(markerRow).toHaveClass('flex', 'min-w-0', 'flex-col', 'items-start', 'gap-2', 'sm:flex-row', 'sm:items-center', 'sm:justify-between');
  expect(drawingRow).toHaveClass('flex', 'min-w-0', 'flex-col', 'items-start', 'gap-2', 'sm:flex-row', 'sm:items-center', 'sm:justify-between');
  expect(markerSummary).toHaveClass('min-w-0', 'max-w-full', 'break-words');
  expect(drawingSummary).toHaveClass('min-w-0', 'max-w-full', 'break-words');

  for (const group of [screen.getByTestId('operations-marker-action-group'), screen.getByTestId('operations-drawing-action-group')]) {
    expect(group).toHaveClass('flex', 'w-full', 'min-w-0', 'flex-wrap', 'gap-2', 'sm:w-auto', 'sm:justify-end');
    for (const button of within(group).getAllByRole('button')) {
      expect(button).toHaveClass('min-h-11', 'min-w-0', 'max-w-full', 'whitespace-normal', 'break-words');
    }
  }
});

it('updates map controls when field mode changes while the map is open', async () => {
  await renderOfflineMapPanel();
  expect(screen.queryByText(/Feltmodus aktiv/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Legg til lokal markør/i })).not.toHaveClass('min-h-16');

  act(() => {
    localStorage.setItem(FIELD_MODE_STORAGE_KEY, JSON.stringify({ enabled: true, gloveMode: true, theme: 'day', outdoorReadabilityReviewed: true }));
    window.dispatchEvent(new Event(FIELD_MODE_STORAGE_EVENT));
  });

  expect(await screen.findByText(/Feltmodus aktiv/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Legg til lokal markør/i })).toHaveClass('min-h-16');
});

it('stores selected map package cache metadata in localStorage and can reset it', async () => {
  const user = userEvent.setup();
  mockApprovedLocalMapPackages();
  const cacheLocalMapPackageAssets = mockMapPackageCache({ cached: 2 });
  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByRole('combobox', { name: /Velg lokal kartpakke/i }), 'trondheim-demo-pmtiles');

  await user.click(screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }));
  await waitFor(() => {
    expect(cacheLocalMapPackageAssets).toHaveBeenCalledWith(approvedPmtilesPackage, expect.objectContaining({ onProgress: expect.any(Function) }));
    expect(localStorage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY)).toContain('trondheim-demo-pmtiles');
    expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Lokal kartpakke aktiv: Trondheim demo PMTiles/i);
  });

  await user.click(screen.getByRole('button', { name: /Tilbakestill kartcache/i }));
  await waitFor(() => {
    expect(localStorage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Ingen kartpakke/i);
  });
});

it('separates schematic map choices from approved PMTiles packages', async () => {
  mockApprovedLocalMapPackages([]);
  await renderOfflineMapPanel();

  expect(screen.getByRole('img', { name: /Skjematisk lokalt kart for/i })).toBeInTheDocument();
  expect(screen.getByText(/Ingen godkjente lokale kartpakker er tilgjengelige/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Lagre valgt kartpakke lokalt/i })).not.toBeInTheDocument();
});

it('shows quota-aware cache copy before saving a large offline map package', async () => {
  const user = userEvent.setup();
  mockApprovedLocalMapPackages();
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { estimate: vi.fn(async () => ({ quota: 50 * 1024 * 1024, usage: 40 * 1024 * 1024 })) },
  });
  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByLabelText('Velg lokal kartpakke'), 'trondheim-demo-pmtiles');

  expect(await screen.findByText(/kan fortrenge annet offline-innhold/i)).toBeInTheDocument();
  expect(screen.getByText(/tilgjengelig nettleserlagring/i)).toBeInTheDocument();
});

it('explains that browser storage quota can be unknown before offline map package caching', () => {
  expect(offlineMapQuotaCopy({ estimatedSizeMb: 12 })).toMatch(/lagringskvote er ukjent/i);
  expect(offlineMapQuotaCopy({ estimatedSizeMb: 12 })).toMatch(/Test offline før innsats/i);
});

it('shows unknown storage quota copy in the UI when navigator storage is absent', async () => {
  mockApprovedLocalMapPackages();
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: undefined,
  });

  await renderOfflineMapPanel();

  expect(screen.getByTestId('offline-map-quota-copy')).toHaveTextContent(/Nettleserens lagringskvote er ukjent/i);
});

it('lets an approved PMTiles package be selected, cached and activated', async () => {
  const user = userEvent.setup();
  mockApprovedLocalMapPackages();
  const cacheLocalMapPackageAssets = mockMapPackageCache({ cached: 2 });

  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByLabelText('Velg lokal kartpakke'), 'trondheim-demo-pmtiles');
  await user.click(screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }));

  await waitFor(() => {
    expect(cacheLocalMapPackageAssets).toHaveBeenCalledWith(approvedPmtilesPackage, expect.objectContaining({ onProgress: expect.any(Function) }));
    expect(screen.getByText(/Lokal kartpakke aktiv: Trondheim demo PMTiles/i)).toBeInTheDocument();
  });
  expect(await screen.findByTestId('offline-maplibre-container')).toBeInTheDocument();
  await screen.findByText(/Kunne ikke åpne lokal kartpakke\. Skjematisk kart brukes som fallback/i);
});

it('prevents duplicate PMTiles precache writes while one save is in progress', async () => {
  const user = userEvent.setup();
  mockApprovedLocalMapPackages();
  let resolveCache!: (result: { cached: number }) => void;
  const pendingCache = new Promise<{ cached: number }>((resolve) => {
    resolveCache = resolve;
  });
  const cacheLocalMapPackageAssets = mockMapPackageCache(pendingCache);

  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByLabelText('Velg lokal kartpakke'), 'trondheim-demo-pmtiles');
  const saveButton = screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i });
  await user.click(saveButton);
  await user.click(saveButton);

  expect(cacheLocalMapPackageAssets).toHaveBeenCalledTimes(1);
  expect(saveButton).toBeDisabled();
  expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Lagrer lokal kartpakke på denne enheten/i);

  await act(async () => {
    resolveCache({ cached: 2 });
    await pendingCache;
  });

  await waitFor(() => {
    expect(localStorage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY)).toContain('trondheim-demo-pmtiles');
    expect(screen.getByText(/Lokal kartpakke aktiv: Trondheim demo PMTiles/i)).toBeInTheDocument();
  });
  expect(saveButton).not.toBeDisabled();
});

it('does not activate an old PMTiles package when selected package changes before precache resolves', async () => {
  const user = userEvent.setup();
  mockApprovedLocalMapPackages([approvedPmtilesPackage, alternateApprovedPmtilesPackage]);
  let resolveCache!: (result: { cached: number }) => void;
  const pendingCache = new Promise<{ cached: number }>((resolve) => {
    resolveCache = resolve;
  });
  const cacheLocalMapPackageAssets = mockMapPackageCache(pendingCache);

  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByLabelText('Velg lokal kartpakke'), 'trondheim-demo-pmtiles');
  await user.click(screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }));
  await user.selectOptions(screen.getByLabelText('Velg lokal kartpakke'), 'stjordal-demo-pmtiles');

  await act(async () => {
    resolveCache({ cached: 2 });
    await pendingCache;
  });

  await waitFor(() => {
    expect(cacheLocalMapPackageAssets).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY) ?? '').not.toContain('trondheim-demo-pmtiles');
    expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Kartcache ble avbrutt fordi valgt pakke endret seg/i);
  });
  expect(screen.queryByTestId('offline-maplibre-container')).not.toBeInTheDocument();
});

it('keeps schematic fallback when CacheStorage cannot precache an approved PMTiles package', async () => {
  const user = userEvent.setup();
  mockApprovedLocalMapPackages();
  mockMapPackageCache({ cached: 0 });

  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByLabelText('Velg lokal kartpakke'), 'trondheim-demo-pmtiles');
  await user.click(screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }));

  await waitFor(() => {
    expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Kartpakken kunne ikke forhåndscaches; skjematisk fallback brukes offline/i);
    expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Ingen kartpakke/i);
  });
  expect(localStorage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY)).toBeNull();
  expect(screen.queryByTestId('offline-maplibre-container')).not.toBeInTheDocument();
});

it('keeps schematic fallback when CacheStorage rejects while precaching an approved PMTiles package', async () => {
  const user = userEvent.setup();
  mockApprovedLocalMapPackages();
  const cacheLocalMapPackageAssets = mockMapPackageCache(new Error('CacheStorage write failed'));

  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByLabelText('Velg lokal kartpakke'), 'trondheim-demo-pmtiles');
  await user.click(screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i }));

  await waitFor(() => {
    expect(cacheLocalMapPackageAssets).toHaveBeenCalledWith(approvedPmtilesPackage, expect.objectContaining({ onProgress: expect.any(Function) }));
    expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Kartpakken kunne ikke forhåndscaches; skjematisk fallback brukes offline/i);
    expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Ingen kartpakke/i);
  });
  expect(screen.queryByTestId('offline-maplibre-container')).not.toBeInTheDocument();
  expect(localStorage.getItem(OFFLINE_MAP_CACHE_STORAGE_KEY)).toBeNull();
});

it('keeps the schematic fallback when an approved PMTiles package is selected but not cached', async () => {
  const user = userEvent.setup();
  mockApprovedLocalMapPackages();

  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByLabelText('Velg lokal kartpakke'), 'trondheim-demo-pmtiles');

  expect(screen.queryByTestId('offline-maplibre-container')).not.toBeInTheDocument();
  expect(screen.getByTestId('map-performance-guard')).toHaveTextContent(/Ytelsesvern/i);
  expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Ingen kartpakke/i);
});

it('keeps rendered map marker count capped for the large district package', async () => {
  const user = userEvent.setup();
  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByRole('combobox', { name: /Velg skjematisk kartpakke/i }), 'trondelag-oversikt');
  expect(screen.getByTestId('map-performance-guard')).toHaveTextContent(/viser maks 12/i);
  expect(screen.getByTestId('map-performance-guard')).toHaveTextContent(/2 skjult/i);
});

it('adds local operational markers, toggles layers, and resets local sectors', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Kartlogg test/i)).toBeInTheDocument();

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

it('attaches the active mission id to newly saved local markers', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Kartlogg test/i)).toBeInTheDocument();

  await user.selectOptions(screen.getByRole('combobox', { name: /Markørtype/i }), 'observation');
  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Observasjon med oppdrag');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));

  await waitFor(() => {
    expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toContain('"missionId":"mission-map-log"');
  });
});

it('edits and deletes only active-mission markers from the map panel', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  await saveMission(otherMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [
      createMissionMapMarker({ kind: 'hazard', missionId: activeMission.id, label: 'Old hazard', x: 20, y: 30 }, new Date('2026-06-05T10:00:00Z')),
      createMissionMapMarker({ kind: 'resource', missionId: otherMission.id, label: 'Other mission resource', x: 80, y: 30 }, new Date('2026-06-05T10:01:00Z')),
    ],
    drawings: [],
  });

  await renderOfflineMapPanel();

  await user.click(screen.getByRole('button', { name: /rediger Old hazard/i }));
  await user.clear(screen.getByLabelText('Rediger markøretikett'));
  await user.type(screen.getByLabelText('Rediger markøretikett'), 'Updated hazard');
  await user.click(screen.getByRole('button', { name: /lagre markørendring/i }));

  expect(screen.getByText('Updated hazard')).toBeInTheDocument();
  expect(screen.queryByText('Other mission resource')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /slett Updated hazard/i }));
  expect(screen.getByText('Ingen synlige markører.')).toBeInTheDocument();
  expect(readMissionMapState().markers.some((marker) => marker.label === 'Other mission resource')).toBe(true);
});

it('gives duplicate-label marker edit and delete buttons distinguishable accessible names', async () => {
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [
      createMissionMapMarker({ kind: 'hazard', missionId: activeMission.id, label: 'Same label', x: 20, y: 30 }, new Date('2026-06-05T10:00:00Z')),
      createMissionMapMarker({ kind: 'resource', missionId: activeMission.id, label: 'Same label', x: 40, y: 50 }, new Date('2026-06-05T10:01:00Z')),
    ],
    drawings: [],
  });

  await renderOfflineMapPanel();

  expect(screen.getByRole('button', { name: /Rediger Same label.*hazard.*X 20.*Y 30/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Rediger Same label.*resource.*X 40.*Y 50/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Slett Same label.*hazard.*X 20.*Y 30/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Slett Same label.*resource.*X 40.*Y 50/i })).toBeInTheDocument();
});

it('rejects a blank coordinate when editing a local marker', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  const marker = createMissionMapMarker({ kind: 'hazard', missionId: activeMission.id, label: 'Blank coordinate test', x: 20, y: 30 }, new Date('2026-06-05T10:00:00Z'));
  writeMissionMapState({ markers: [marker], drawings: [] });

  await renderOfflineMapPanel();

  await user.click(screen.getByRole('button', { name: /Rediger Blank coordinate test/i }));
  await user.clear(screen.getByLabelText('Rediger markør X 0-100'));
  await user.click(screen.getByRole('button', { name: /lagre markørendring/i }));

  expect(screen.getByTestId('operations-map-status')).toHaveTextContent('Markørkoordinater må være skjematiske verdier fra 0 til 100.');
  expect(readMissionMapState().markers.find((item) => item.id === marker.id)?.point).toEqual({ x: 20, y: 30 });
});

it('blocks local marker saves when no active mission exists', async () => {
  const user = userEvent.setup();
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Ingen aktivt lokalt oppdrag funnet/i)).toBeInTheDocument();

  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Markør uten oppdrag');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));

  await waitFor(() => {
    expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Opprett aktivt oppdrag før du legger til lokale markører/i);
  });
});

it('shows a local privacy error when map marker text contains persondata', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  await renderOfflineMapPanel();

  const markerRegion = screen.getByRole('region', { name: /Lokale markører og lag/i });
  await user.type(within(markerRegion).getByLabelText('Etikett'), '01017000027');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/persondata|pasientdata|identifikator|private/i);
  expect(readMissionMapState().markers).toHaveLength(0);
});

it('shows a local privacy error when GeoJSON import only contains rejected map text', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  await renderOfflineMapPanel();

  fireEvent.change(screen.getByRole('textbox', { name: /Importer GeoJSON/i }), { target: { value: JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'observation', label: '01017000027' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [44, 55] }, properties: { itemType: 'marker', kind: 'observation', label: 'Trygg import', note: 'kontakt ola.nordmann@example.com' } },
    ],
  }) } });
  await user.click(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/persondata|pasientdata|identifikator|kontakt|private/i);
  expect(readMissionMapState().markers).toHaveLength(0);
  expect(screen.getByTestId('operations-map-status')).not.toHaveTextContent(/Ingen støttede skjematiske GeoJSON-objekter/i);
});

it('shows a privacy alert when GeoJSON import text is blocked after sanitization', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  await renderOfflineMapPanel();

  fireEvent.change(screen.getByRole('textbox', { name: /Importer GeoJSON/i }), { target: { value: JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'observation', label: 'Trygg import', note: 'kontakt ola<@>example.com' } },
    ],
  }) } });
  await user.click(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/persondata|kontakt|private/i);
  expect(readMissionMapState().markers).toHaveLength(0);
  expect(screen.getByTestId('operations-map-status')).not.toHaveTextContent(/Ingen støttede skjematiske GeoJSON-objekter/i);
});

it('shows a privacy alert when sensitive GeoJSON text appears beyond the display truncation boundary', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  await renderOfflineMapPanel();

  const longSafePrefix = `${'Trygg import '.repeat(16)} `;
  fireEvent.change(screen.getByRole('textbox', { name: /Importer GeoJSON/i }), { target: { value: JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'observation', label: `${longSafePrefix}01017000027` } },
    ],
  }) } });

  await user.click(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/persondata|pasientdata|identifikator|kontakt|private/i);
  expect(screen.getByTestId('operations-map-status')).not.toHaveTextContent(/Ingen støttede skjematiske GeoJSON-objekter/i);
  expect(readMissionMapState().markers).toHaveLength(0);
});

it('imports safe GeoJSON features while alerting about privacy-rejected import text', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  await renderOfflineMapPanel();

  fireEvent.change(screen.getByRole('textbox', { name: /Importer GeoJSON/i }), { target: { value: JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'observation', label: '01017000027' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [44, 55] }, properties: { itemType: 'marker', kind: 'observation', label: 'Trygg import' } },
    ],
  }) } });
  await user.click(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/persondata|pasientdata|identifikator|private/i);
  expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Importerte 1 lokale kartobjekter/i);
  expect(readMissionMapState().markers).toHaveLength(1);
  expect(readMissionMapState().markers[0]).toMatchObject({ label: 'Trygg import', point: { x: 44, y: 55 } });
  expect(JSON.stringify(readMissionMapState())).not.toContain('01017000027');
});

it('keeps unsupported GeoJSON-like input on the generic import status path', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  await renderOfflineMapPanel();

  fireEvent.change(screen.getByRole('textbox', { name: /Importer GeoJSON/i }), { target: { value: JSON.stringify({
    features: [{ properties: { label: '01017000027' } }],
  }) } });
  await user.click(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i }));

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Ingen støttede skjematiske GeoJSON-objekter/i);
  expect(readMissionMapState().markers).toHaveLength(0);
});

it('keeps unsupported local GeoJSON feature geometry on the generic import status path', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  await renderOfflineMapPanel();

  fireEvent.change(screen.getByRole('textbox', { name: /Importer GeoJSON/i }), { target: { value: JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point' }, properties: { itemType: 'marker', kind: 'observation', label: '01017000027' } },
      { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: { itemType: 'drawing', kind: 'line', label: 'kontakt ola.nordmann@example.com' } },
    ],
  }) } });
  await user.click(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i }));

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Ingen støttede skjematiske GeoJSON-objekter/i);
  expect(readMissionMapState().markers).toHaveLength(0);
  expect(readMissionMapState().drawings).toHaveLength(0);
});

it('keeps marker edit mode open when edited text is stopped by the privacy guard', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [createMissionMapMarker({ kind: 'observation', missionId: activeMission.id, label: 'Trygg observasjon', x: 20, y: 30 }, new Date('2026-06-05T10:00:00Z'))],
    drawings: [],
  });
  await renderOfflineMapPanel();

  await user.click(screen.getByRole('button', { name: /Rediger Trygg observasjon/i }));
  const editForm = screen.getByRole('form', { name: /Rediger markør Trygg observasjon/i });
  await user.clear(within(editForm).getByLabelText(/Rediger markøretikett/i));
  await user.type(within(editForm).getByLabelText(/Rediger markøretikett/i), '01017000027');
  await user.click(within(editForm).getByRole('button', { name: /Lagre markørendring/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/persondata|identifikator|private/i);
  expect(screen.getByRole('form', { name: /Rediger markør Trygg observasjon/i })).toBeInTheDocument();
  expect(readMissionMapState().markers[0]).toMatchObject({ label: 'Trygg observasjon' });
});

it('creates a field-log entry on the active mission from a selected map marker', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByRole('combobox', { name: /Markørtype/i }), 'observation');
  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Observasjon nord');
  await user.clear(screen.getByRole('spinbutton', { name: /X 0-100/i }));
  await user.type(screen.getByRole('spinbutton', { name: /X 0-100/i }), '22');
  await user.clear(screen.getByRole('spinbutton', { name: /Y 0-100/i }));
  await user.type(screen.getByRole('spinbutton', { name: /Y 0-100/i }), '33');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));

  await user.type(screen.getByLabelText(/Loggtekst fra kartpunkt/i), 'Røyk observert uten persondata');
  await user.click(screen.getByRole('button', { name: /Logg herfra Observasjon nord/i }));

  await waitFor(async () => {
    const mission = await getMission('mission-map-log');
    expect(mission?.fieldLogEntries).toHaveLength(1);
    expect(mission?.fieldLogEntries[0]).toMatchObject({
      category: 'observasjon',
      text: 'Røyk observert uten persondata',
      mapReference: { source: 'map-marker', label: 'Observasjon nord', point: { x: 22, y: 33 } },
    });
  });
  expect(screen.getByText(/Feltlogg opprettet lokalt på Kartlogg test/i)).toBeInTheDocument();
  expect(readLocalAuditLog().some((entry) => entry.details.source === 'map-log')).toBe(true);
});

it('creates a field log from the selected visible marker, not only the newest marker', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [
      createMissionMapMarker({ kind: 'hazard', missionId: activeMission.id, label: 'Older hazard', x: 10, y: 20 }, new Date('2026-06-05T10:00:00Z')),
      createMissionMapMarker({ kind: 'resource', missionId: activeMission.id, label: 'Newest resource', x: 80, y: 20 }, new Date('2026-06-05T10:01:00Z')),
    ],
    drawings: [],
  });

  await renderOfflineMapPanel();

  await user.type(screen.getByLabelText('Loggtekst fra kartpunkt'), 'Kontroller eldre farepunkt');
  await user.click(screen.getByRole('button', { name: /Logg herfra Older hazard/i }));

  await waitFor(async () => {
    const mission = await getMission(activeMission.id);
    expect(mission?.fieldLogEntries.at(-1)?.mapReference?.label).toBe('Older hazard');
  });
});

it('creates a field log from a selected visible drawing using Logg herfra with first-point map reference', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [],
    drawings: [
      createMissionMapDrawing({
        kind: 'sector',
        missionId: activeMission.id,
        label: 'Teig logg',
        coordinates: '12,20 40,22 34,54 16,48',
      }, new Date('2026-06-05T10:02:00Z')),
    ],
  });

  await renderOfflineMapPanel();

  await user.type(screen.getByLabelText('Loggtekst fra kartpunkt'), 'Kontroller teig uten persondata');
  await user.click(screen.getByRole('button', { name: /Logg herfra Teig logg/i }));

  await waitFor(async () => {
    const mission = await getMission(activeMission.id);
    expect(mission?.fieldLogEntries.at(-1)?.mapReference).toMatchObject({
      source: 'map-drawing',
      label: 'Teig logg',
      point: { x: 12, y: 20 },
    });
  });
});

it('logs map observations to the selected mission, not missions[0]', async () => {
  const user = userEvent.setup();
  await seedMissions([
    mission({ id: 'a', title: 'A', updatedAt: '2026-06-04T10:00:00.000Z' }),
    mission({ id: 'b', title: 'B', updatedAt: '2026-06-04T09:00:00.000Z' }),
  ]);
  saveSelectedActiveMissionId('b');

  await renderOfflineMapPanel();
  expect(await screen.findByText(/Feltlogg går til: B/i)).toBeInTheDocument();

  await user.selectOptions(screen.getByRole('combobox', { name: /Markørtype/i }), 'hazard');
  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Fare valgt oppdrag');
  await user.type(screen.getByLabelText(/Loggtekst fra kartpunkt/i), 'Valgt oppdrag får kartlogg');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));
  await user.click(screen.getByRole('button', { name: /Logg herfra Fare valgt oppdrag/i }));

  await waitFor(async () => {
    expect(await getMission('b')).toMatchObject({
      fieldLogEntries: expect.arrayContaining([
        expect.objectContaining({ text: 'Valgt oppdrag får kartlogg' }),
      ]),
    });
    expect(await getMission('a')).toMatchObject({ fieldLogEntries: [] });
  });
  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toContain('"missionId":"b"');
});

it('uses the newest visible marker when the newest stored marker layer is hidden', async () => {
  const user = userEvent.setup();
  await saveMission({ ...activeMission, id: 'mission-visible-map-log', title: 'Synlig kartlogg' });
  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByRole('combobox', { name: /Markørtype/i }), 'hazard');
  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Fare synlig');
  await user.clear(screen.getByRole('spinbutton', { name: /X 0-100/i }));
  await user.type(screen.getByRole('spinbutton', { name: /X 0-100/i }), '11');
  await user.clear(screen.getByRole('spinbutton', { name: /Y 0-100/i }));
  await user.type(screen.getByRole('spinbutton', { name: /Y 0-100/i }), '22');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));

  await user.selectOptions(screen.getByRole('combobox', { name: /Markørtype/i }), 'observation');
  await user.clear(screen.getByPlaceholderText(/Sanitert lokal etikett/i));
  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Observasjon skjult');
  await user.clear(screen.getByRole('spinbutton', { name: /X 0-100/i }));
  await user.type(screen.getByRole('spinbutton', { name: /X 0-100/i }), '44');
  await user.clear(screen.getByRole('spinbutton', { name: /Y 0-100/i }));
  await user.type(screen.getByRole('spinbutton', { name: /Y 0-100/i }), '55');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));
  await user.click(screen.getByLabelText('Observasjon'));

  await user.type(screen.getByLabelText(/Loggtekst fra kartpunkt/i), 'Logg fra synlig markør');
  await user.click(screen.getByRole('button', { name: /Logg herfra Fare synlig/i }));

  await waitFor(async () => {
    const mission = await getMission('mission-visible-map-log');
    expect(mission?.fieldLogEntries).toHaveLength(1);
    expect(mission?.fieldLogEntries[0]).toMatchObject({
      category: 'vaer-fare',
      text: 'Logg fra synlig markør',
      mapReference: { source: 'map-marker', label: 'Fare synlig', point: { x: 11, y: 22 } },
    });
  });
});

it('renders, exports and logs only map objects from the active mission', async () => {
  const user = userEvent.setup();
  await seedMissions([
    mission({ id: 'a', title: 'Aktiv kartmission', updatedAt: '2026-06-04T10:00:00.000Z' }),
    mission({ id: 'b', title: 'Skjult kartmission', updatedAt: '2026-06-04T09:00:00.000Z' }),
  ]);
  saveSelectedActiveMissionId('a');
  localStorage.setItem(OPERATIONS_MAP_STORAGE_KEY, JSON.stringify({
    markers: [
      { id: 'marker-a', missionId: 'a', itemType: 'marker', kind: 'hazard', label: 'Fare aktiv', point: { x: 12, y: 34 }, createdAt: '2026-06-04T10:01:00.000Z' },
      { id: 'marker-b', missionId: 'b', itemType: 'marker', kind: 'observation', label: 'Observasjon skjult', point: { x: 56, y: 78 }, createdAt: '2026-06-04T10:02:00.000Z' },
    ],
    drawings: [
      { id: 'drawing-a', missionId: 'a', itemType: 'drawing', kind: 'sector', label: 'Sektor aktiv', points: [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }], createdAt: '2026-06-04T10:03:00.000Z' },
      { id: 'drawing-b', missionId: 'b', itemType: 'drawing', kind: 'sector', label: 'Sektor skjult', points: [{ x: 60, y: 60 }, { x: 70, y: 60 }, { x: 70, y: 70 }], createdAt: '2026-06-04T10:04:00.000Z' },
    ],
  }));

  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Aktiv kartmission/i)).toBeInTheDocument();
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Fare — Fare aktiv/i);
  expect(screen.getByTestId('operations-marker-list')).not.toHaveTextContent(/Observasjon skjult/i);

  await user.click(screen.getByRole('button', { name: /Lag kartbilde/i }));
  const svgExport = (screen.getByLabelText(/Kartbilde SVG/i) as HTMLTextAreaElement).value;
  expect(svgExport).toContain('Fare aktiv');
  expect(svgExport).toContain('Sektor aktiv');
  expect(svgExport).not.toContain('Observasjon skjult');
  expect(svgExport).not.toContain('Sektor skjult');

  await user.click(screen.getByRole('button', { name: /Lag GeoJSON eksport/i }));
  const geoJsonExport = (screen.getByLabelText(/GeoJSON eksport/i) as HTMLTextAreaElement).value;
  expect(geoJsonExport).toContain('Fare aktiv');
  expect(geoJsonExport).toContain('Sektor aktiv');
  expect(geoJsonExport).not.toContain('Observasjon skjult');
  expect(geoJsonExport).not.toContain('Sektor skjult');

  await user.type(screen.getByLabelText(/Loggtekst fra kartpunkt/i), 'Aktiv kartlogg');
  await user.click(screen.getByRole('button', { name: /Logg herfra Fare aktiv/i }));
  await waitFor(async () => {
    expect(await getMission('a')).toMatchObject({
      fieldLogEntries: [expect.objectContaining({ mapReference: expect.objectContaining({ label: 'Fare aktiv' }) })],
    });
    expect(await getMission('b')).toMatchObject({ fieldLogEntries: [] });
  });
});

it('creates a local skogbrann water-supply plan as pump markers and a hose-line drawing', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);

  await renderOfflineMapPanel();

  const waterSupplyPlanner = screen.getByRole('region', { name: /Pumpe- og slangeplanlegger/i });
  expect(waterSupplyPlanner).toBeInTheDocument();
  const waterControls = within(waterSupplyPlanner);
  await user.clear(waterControls.getByLabelText(/Planetikett/i));
  await user.type(waterControls.getByLabelText(/Planetikett/i), 'Skogbrann vest');
  await user.clear(waterControls.getByLabelText(/Vannkilde X-koordinat/i));
  await user.type(waterControls.getByLabelText(/Vannkilde X-koordinat/i), '10');
  await user.clear(waterControls.getByLabelText(/Vannkilde Y-koordinat/i));
  await user.type(waterControls.getByLabelText(/Vannkilde Y-koordinat/i), '20');
  await user.clear(waterControls.getByLabelText(/Pumpeplass X-koordinat/i));
  await user.type(waterControls.getByLabelText(/Pumpeplass X-koordinat/i), '25');
  await user.clear(waterControls.getByLabelText(/Pumpeplass Y-koordinat/i));
  await user.type(waterControls.getByLabelText(/Pumpeplass Y-koordinat/i), '35');
  await user.clear(waterControls.getByLabelText(/Leveringspunkt X-koordinat/i));
  await user.type(waterControls.getByLabelText(/Leveringspunkt X-koordinat/i), '60');
  await user.clear(waterControls.getByLabelText(/Leveringspunkt Y-koordinat/i));
  await user.type(waterControls.getByLabelText(/Leveringspunkt Y-koordinat/i), '50');
  await user.type(waterControls.getByLabelText(/Planmerknad uten persondata/i), 'Avklart med leder');

  await user.click(waterControls.getByRole('button', { name: /Lag pumpe- og slangeplan/i }));

  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Ressurs — Vannkilde Skogbrann vest/i);
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Pumpeplass — Pumpeplass Skogbrann vest/i);
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Ressurs — Leveringspunkt Skogbrann vest/i);
  expect(screen.getByTestId('operations-drawing-list')).toHaveTextContent(/Linje — Slangevei Skogbrann vest/i);
  expect(screen.getByTestId('water-supply-plan-summary')).toHaveTextContent(/Slangevei .* skjematiske enheter/i);
  expect(screen.getByTestId('water-supply-plan-summary')).toHaveTextContent(/trykkforsterkning|seriekjøring/i);

  const stored = localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY) ?? '';
  expect(stored).toContain('"missionId":"mission-map-log"');
  expect(stored).toContain('"kind":"pump-location"');
  expect(stored).toContain('Slangevei Skogbrann vest');
  expect(stored).not.toMatch(/\b\d+\s*(?:l\/min|liter\/min|bar|m3\/t)\b/i);
});

it('creates a local RADIAC measurement plan as observation markers and a route line', async () => {
  const user = userEvent.setup();
  await saveMission({ ...activeMission, scenario: 'radiac-nedfall', role: 'rad' });
  saveSelectedActiveMissionId(activeMission.id);

  await renderOfflineMapPanel();

  const radiacPlanner = screen.getByRole('region', { name: /RADIAC målepunktplanlegger/i });
  expect(radiacPlanner).toBeInTheDocument();
  const radiacControls = within(radiacPlanner);
  await user.clear(radiacControls.getByLabelText(/RADIAC planetikett/i));
  await user.type(radiacControls.getByLabelText(/RADIAC planetikett/i), 'RAD nord');
  await user.clear(radiacControls.getByLabelText(/Målepunkter som x,y/i));
  await user.type(radiacControls.getByLabelText(/Målepunkter som x,y/i), '15,30 35,40 55,45');
  await user.type(radiacControls.getByLabelText(/RADIAC planmerknad uten persondata/i), 'Rapporteringsformat avklart');

  await user.click(radiacControls.getByRole('button', { name: /Lag RADIAC måleplan/i }));

  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Observasjon — Målepunkt 1 RAD nord/i);
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Observasjon — Målepunkt 2 RAD nord/i);
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Observasjon — Målepunkt 3 RAD nord/i);
  expect(screen.getByTestId('operations-drawing-list')).toHaveTextContent(/Linje — Målerute RAD nord/i);
  expect(screen.getByTestId('radiac-measurement-plan-summary')).toHaveTextContent(/3 målepunkt/i);
  expect(screen.getByTestId('radiac-measurement-plan-summary')).toHaveTextContent(/beregner ikke dose/i);

  const stored = localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY) ?? '';
  expect(stored).toContain('"missionId":"mission-map-log"');
  expect(stored).toContain('"kind":"observation"');
  expect(stored).toContain('Målerute RAD nord');
  expect(stored).not.toMatch(/\b\d+\s*(?:µ?Sv\/h|mSv|dosegrense|oppholdstid)\b/i);
});

it('creates a local search-sector plan as a sector drawing with start and return markers', async () => {
  const user = userEvent.setup();
  await saveMission({ ...activeMission, scenario: 'sok-og-redning', role: 'lagforer' });
  saveSelectedActiveMissionId(activeMission.id);

  await renderOfflineMapPanel();

  const searchPlanner = screen.getByRole('region', { name: /Søketeig planlegger/i });
  expect(searchPlanner).toBeInTheDocument();
  const searchControls = within(searchPlanner);
  await user.clear(searchControls.getByLabelText(/Søketeig etikett/i));
  await user.type(searchControls.getByLabelText(/Søketeig etikett/i), 'Teig alfa');
  await user.clear(searchControls.getByLabelText(/Teiggrense som x,y/i));
  await user.type(searchControls.getByLabelText(/Teiggrense som x,y/i), '10,20 42,18 48,52 14,58');
  await user.clear(searchControls.getByLabelText(/Startpunkt X-koordinat/i));
  await user.type(searchControls.getByLabelText(/Startpunkt X-koordinat/i), '12');
  await user.clear(searchControls.getByLabelText(/Startpunkt Y-koordinat/i));
  await user.type(searchControls.getByLabelText(/Startpunkt Y-koordinat/i), '22');
  await user.clear(searchControls.getByLabelText(/Returpunkt X-koordinat/i));
  await user.type(searchControls.getByLabelText(/Returpunkt X-koordinat/i), '40');
  await user.clear(searchControls.getByLabelText(/Returpunkt Y-koordinat/i));
  await user.type(searchControls.getByLabelText(/Returpunkt Y-koordinat/i), '55');
  await user.type(searchControls.getByLabelText(/Søketeig planmerknad uten persondata/i), 'Rapporteringsintervall avklart');

  await user.click(searchControls.getByRole('button', { name: /Lag søketeig plan/i }));

  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Møteplass — Startpunkt Teig alfa/i);
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Møteplass — Returpunkt Teig alfa/i);
  expect(screen.getByTestId('operations-drawing-list')).toHaveTextContent(/Sektor\/teig — Søketeig Teig alfa/i);
  expect(screen.getByTestId('search-sector-plan-summary')).toHaveTextContent(/4 grensepunkt/i);
  expect(screen.getByTestId('search-sector-plan-summary')).toHaveTextContent(/live tracking/i);

  const stored = localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY) ?? '';
  expect(stored).toContain('"missionId":"mission-map-log"');
  expect(stored).toContain('"kind":"sector"');
  expect(stored).toContain('Søketeig Teig alfa');
  expect(stored).not.toMatch(/\b(?:personnummer|\+47|pasient|GPS-sporing|blue-force|sanntidsposisjon)\b/i);
});

it('creates a local MRE zone plan with clean and dirty zones, rinse line and checkpoints', async () => {
  const user = userEvent.setup();
  await saveMission({ ...activeMission, scenario: 'cbrn-cbrne', role: 'mre' });
  saveSelectedActiveMissionId(activeMission.id);

  await renderOfflineMapPanel();

  const mrePlanner = screen.getByRole('region', { name: /MRE ren\/uren-side planlegger/i });
  expect(mrePlanner).toBeInTheDocument();
  const mreControls = within(mrePlanner);
  await user.clear(mreControls.getByLabelText(/MRE planetikett/i));
  await user.type(mreControls.getByLabelText(/MRE planetikett/i), 'Rens nord');
  await user.clear(mreControls.getByLabelText(/Uren side som x,y/i));
  await user.type(mreControls.getByLabelText(/Uren side som x,y/i), '10,20 38,18 36,46 12,48');
  await user.clear(mreControls.getByLabelText(/^Ren side som x,y/i));
  await user.type(mreControls.getByLabelText(/^Ren side som x,y/i), '48,22 76,22 74,48 50,50');
  await user.clear(mreControls.getByLabelText(/Renselinje som x,y/i));
  await user.type(mreControls.getByLabelText(/Renselinje som x,y/i), '40,20 44,52');
  await user.clear(mreControls.getByLabelText(/Innpassering X-koordinat/i));
  await user.type(mreControls.getByLabelText(/Innpassering X-koordinat/i), '14');
  await user.clear(mreControls.getByLabelText(/Innpassering Y-koordinat/i));
  await user.type(mreControls.getByLabelText(/Innpassering Y-koordinat/i), '24');
  await user.clear(mreControls.getByLabelText(/Utpassering X-koordinat/i));
  await user.type(mreControls.getByLabelText(/Utpassering X-koordinat/i), '54');
  await user.clear(mreControls.getByLabelText(/Utpassering Y-koordinat/i));
  await user.type(mreControls.getByLabelText(/Utpassering Y-koordinat/i), '46');
  await user.clear(mreControls.getByLabelText(/Avfallspunkt X-koordinat/i));
  await user.type(mreControls.getByLabelText(/Avfallspunkt X-koordinat/i), '32');
  await user.clear(mreControls.getByLabelText(/Avfallspunkt Y-koordinat/i));
  await user.type(mreControls.getByLabelText(/Avfallspunkt Y-koordinat/i), '54');
  await user.type(mreControls.getByLabelText(/MRE planmerknad uten persondata/i), 'Samband og stoppkriterier avklart');

  await user.click(mreControls.getByRole('button', { name: /Lag MRE soneplan/i }));

  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Møteplass — Innpassering Rens nord/i);
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Møteplass — Utpassering Rens nord/i);
  expect(screen.getByTestId('operations-marker-list')).toHaveTextContent(/Ressurs — Avfallspunkt Rens nord/i);
  expect(screen.getByTestId('operations-drawing-list')).toHaveTextContent(/Polygon — Uren side Rens nord/i);
  expect(screen.getByTestId('operations-drawing-list')).toHaveTextContent(/Polygon — Ren side Rens nord/i);
  expect(screen.getByTestId('operations-drawing-list')).toHaveTextContent(/Linje — Renselinje Rens nord/i);
  expect(screen.getByTestId('mre-zone-plan-summary')).toHaveTextContent(/2 soner/i);
  expect(screen.getByTestId('mre-zone-plan-summary')).toHaveTextContent(/fastsetter ikke stoff/i);

  const stored = localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY) ?? '';
  expect(stored).toContain('"missionId":"mission-map-log"');
  expect(stored).toContain('Uren side Rens nord');
  expect(stored).toContain('Renselinje Rens nord');
  expect(stored).not.toMatch(/\b(?:personnummer|\+47|pasient|Level\s*A|nivå\s*A|sarin|klorgass|cyanid)\b/i);
});

it('preserves newer local mission updates when saving a field log from the map', async () => {
  const user = userEvent.setup();
  const existingEntry: FieldLogEntry = {
    id: 'field-log-existing-local-update',
    timestamp: '2026-06-04T09:30:00.000Z',
    locationText: 'KO lokal',
    category: 'observasjon',
    text: 'Eksisterende lokal oppdatering',
    linkedMissionId: 'mission-stale-map-log',
    criticalObservation: false,
    mustBeForwarded: false,
  };
  await saveMission({ ...activeMission, id: 'mission-stale-map-log', title: 'Stale kartlogg' });
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Stale kartlogg/i)).toBeInTheDocument();

  await user.selectOptions(screen.getByRole('combobox', { name: /Markørtype/i }), 'observation');
  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Ny observasjon');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));

  const currentMission = await getMission('mission-stale-map-log');
  await saveMission({
    ...currentMission!,
    notes: 'Oppdatert etter kartpanelet lastet',
    fieldLogEntries: [existingEntry],
  });

  await user.type(screen.getByLabelText(/Loggtekst fra kartpunkt/i), 'Ny lokal kartlogg');
  await user.click(screen.getByRole('button', { name: /Logg herfra Ny observasjon/i }));

  await waitFor(async () => {
    const mission = await getMission('mission-stale-map-log');
    expect(mission?.notes).toBe('Oppdatert etter kartpanelet lastet');
    expect(mission?.fieldLogEntries).toHaveLength(2);
    expect(mission?.fieldLogEntries.map((entry) => entry.text)).toEqual(['Eksisterende lokal oppdatering', 'Ny lokal kartlogg']);
  });
});

it('adds a local sector, measures it, and creates sanitized SVG and GeoJSON exports', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Kartlogg test/i)).toBeInTheDocument();

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

it('attaches the active mission id to newly saved local drawings', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Kartlogg test/i)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Lagre lokal tegning\/sektor/i }));

  await waitFor(() => {
    expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toContain('"missionId":"mission-map-log"');
  });
});

it('edits active-mission sectors and refreshes measurement copy', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [],
    drawings: [createMissionMapDrawing({
      kind: 'sector',
      missionId: activeMission.id,
      label: 'Teig alfa',
      coordinates: '10,10 20,10 20,20 10,20',
    }, new Date('2026-06-05T10:00:00Z'))],
  });

  await renderOfflineMapPanel();

  const measurementReadout = screen.getByTestId('map-measurement-readout');
  await waitFor(() => {
    expect(measurementReadout).toHaveTextContent('Sektor/teig: avstand 40.0 skjematiske enheter, areal 100.0.');
  });
  const initialMeasurementText = measurementReadout.textContent;

  await user.click(screen.getByRole('button', { name: /rediger Teig alfa/i }));
  await user.clear(screen.getByLabelText('Rediger sektoretikett'));
  await user.type(screen.getByLabelText('Rediger sektoretikett'), 'Teig bravo');
  await user.clear(screen.getByLabelText('Rediger sektorkoordinater'));
  await user.type(screen.getByLabelText('Rediger sektorkoordinater'), '10,10 30,10 30,30 10,30');
  await user.click(screen.getByRole('button', { name: /lagre sektorendring/i }));

  expect(screen.getByText('Teig bravo')).toBeInTheDocument();
  await waitFor(() => {
    expect(measurementReadout.textContent).not.toBe(initialMeasurementText);
    expect(measurementReadout).toHaveTextContent('Sektor/teig: avstand 80.0 skjematiske enheter, areal 400.0.');
  });
  expect(screen.getByTestId('map-drawing-sector').querySelector('polygon')).toHaveAttribute('points', '10,10 30,10 30,30 10,30');
  expect(readMissionMapState().drawings.find((drawing) => drawing.label === 'Teig bravo' && drawing.missionId === activeMission.id)?.points).toEqual([
    { x: 10, y: 10 },
    { x: 30, y: 10 },
    { x: 30, y: 30 },
    { x: 10, y: 30 },
  ]);
});

it('deletes active-mission sectors without touching other mission drawings', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  await saveMission(otherMission);
  saveSelectedActiveMissionId(activeMission.id);
  writeMissionMapState({
    markers: [],
    drawings: [
      createMissionMapDrawing({
        kind: 'sector',
        missionId: activeMission.id,
        label: 'Aktiv teig',
        coordinates: '10,10 20,10 20,20 10,20',
      }, new Date('2026-06-05T10:00:00Z')),
      createMissionMapDrawing({
        kind: 'sector',
        missionId: otherMission.id,
        label: 'Skjult teig',
        coordinates: '40,40 50,40 50,50 40,50',
      }, new Date('2026-06-05T10:01:00Z')),
    ],
  });

  await renderOfflineMapPanel();

  await user.click(screen.getByRole('button', { name: /slett Aktiv teig/i }));

  expect(screen.getByText('Ingen synlige sektorer/tegninger.')).toBeInTheDocument();
  expect(screen.queryByText('Skjult teig')).not.toBeInTheDocument();
  expect(readMissionMapState().drawings.some((drawing) => drawing.label === 'Skjult teig')).toBe(true);
});

it('blocks local drawing saves when no active mission exists', async () => {
  const user = userEvent.setup();
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Ingen aktivt lokalt oppdrag funnet/i)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Lagre lokal tegning\/sektor/i }));

  await waitFor(() => {
    expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Opprett aktivt oppdrag før du lagrer lokale kartobjekter/i);
  });
});

it('imports supported schematic GeoJSON into the active mission and documents future KML and blue-force choices', async () => {
  const user = userEvent.setup();
  await saveMission(activeMission);
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Kartlogg test/i)).toBeInTheDocument();

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
  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toContain('"missionId":"mission-map-log"');
  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).not.toContain('drop');
  expect(screen.getByText(/KML-import er ikke aktivert/i)).toBeInTheDocument();
  expect(screen.getByText(/Delt live posisjon\/blue-force tracking er ikke aktivert/i)).toBeInTheDocument();
});

it('blocks GeoJSON import when no active mission exists', async () => {
  const user = userEvent.setup();
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Ingen aktivt lokalt oppdrag funnet/i)).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: /Importer GeoJSON/i }), { target: { value: JSON.stringify({
    type: 'FeatureCollection',
    coordinateSystem: SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [22, 33] }, properties: { itemType: 'marker', kind: 'il-ko', label: 'KO uten oppdrag' } },
    ],
  }) } });
  await user.click(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i }));

  expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toBeNull();
  expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Opprett aktivt oppdrag før du importerer kartobjekter/i);
});
