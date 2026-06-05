import { act, fireEvent, render, screen, waitFor, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { OfflineMapPanel } from '@/components/offline-map-panel';
import { FIELD_MODE_STORAGE_EVENT, FIELD_MODE_STORAGE_KEY } from '@/lib/field-mode/field-mode';
import { saveSelectedActiveMissionId } from '@/lib/mission/active-mission-selection';
import { clearLocalMissionData, getMission, saveMission } from '@/lib/mission/local-store';
import { OFFLINE_MAP_CACHE_STORAGE_KEY } from '@/lib/maps/offline-map';
import { OPERATIONS_MAP_STORAGE_KEY, SCHEMATIC_GEOJSON_COORDINATE_SYSTEM } from '@/lib/maps/operations-map';
import { readLocalAuditLog } from '@/lib/privacy/local-profile';
import type { FieldLogEntry, MissionContext } from '@/lib/mission/schemas';
import { buildMission } from '../helpers/mission-fixtures';
import { flushAsyncEffects } from '../helpers/react-effects';

afterEach(async () => {
  localStorage.clear();
  await clearLocalMissionData();
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

function mission(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    ...activeMission,
    fieldLogEntries: [],
    ...overrides,
  };
}


async function renderOfflineMapPanel(): Promise<RenderResult> {
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
  expect(screen.getByText(/Ingen eksterne kartfliser/i)).toBeInTheDocument();
  expect(screen.getByText(/ingen nettverksnedlasting/i)).toBeInTheDocument();
  expect(screen.getAllByText(/ingen backend sync/i).length).toBeGreaterThan(0);
  expect(screen.getByTestId('map-performance-guard')).toHaveTextContent(/Ytelsesvern/i);
  expect(screen.getByTestId('offline-map-cache-status')).toHaveTextContent(/Ingen kartpakke/i);
});

it('uses larger map controls when field glove mode is enabled', async () => {
  localStorage.setItem(FIELD_MODE_STORAGE_KEY, JSON.stringify({ enabled: true, gloveMode: true, theme: 'day', outdoorReadabilityReviewed: true }));
  await renderOfflineMapPanel();

  expect(await screen.findByText(/Feltmodus aktiv/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Legg til lokal markør/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Lagre lokal tegning\/sektor/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Opprett feltlogg fra kartpunkt/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Lag kartbilde/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Lag GeoJSON eksport/i })).toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Lagre valgt kartpakke lokalt/i })).not.toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Importer GeoJSON lokalt/i })).not.toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Tilbakestill kartcache/i })).not.toHaveClass('min-h-16');
  expect(screen.getByRole('button', { name: /Nullstill lokale sektorer/i })).not.toHaveClass('min-h-16');
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
  await renderOfflineMapPanel();

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
  await renderOfflineMapPanel();

  await user.selectOptions(screen.getByRole('combobox', { name: /Velg lokal kartpakke/i }), 'trondelag-oversikt');
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

it('blocks local marker saves when no active mission exists', async () => {
  const user = userEvent.setup();
  await renderOfflineMapPanel();
  expect(await screen.findByText(/Aktivt oppdrag: Ingen aktivt lokalt oppdrag funnet/i)).toBeInTheDocument();

  await user.type(screen.getByPlaceholderText(/Sanitert lokal etikett/i), 'Markør uten oppdrag');
  await user.click(screen.getByRole('button', { name: /Legg til lokal markør/i }));

  await waitFor(() => {
    expect(localStorage.getItem(OPERATIONS_MAP_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('operations-map-status')).toHaveTextContent(/Opprett aktivt oppdrag før du lagrer lokale kartobjekter/i);
  });
});

it('creates a field-log entry on the active mission from the newest map marker', async () => {
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
  await user.click(screen.getByRole('button', { name: /Opprett feltlogg fra kartpunkt/i }));

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
  await user.click(screen.getByRole('button', { name: /Opprett feltlogg fra kartpunkt/i }));

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
  await user.click(screen.getByRole('button', { name: /Opprett feltlogg fra kartpunkt/i }));

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
  await user.click(screen.getByRole('button', { name: /Opprett feltlogg fra kartpunkt/i }));

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

it('imports supported schematic GeoJSON and documents KML and blue-force as post-MVP', async () => {
  const user = userEvent.setup();
  await renderOfflineMapPanel();

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
