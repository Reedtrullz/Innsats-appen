import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MissionMapSummary } from '@/components/mission-map-summary';
import type { MissionContext } from '@/lib/mission/schemas';

const mission: MissionContext = {
  id: 'mission-map-summary',
  title: 'Kartlogg oppdrag',
  createdAt: '2026-06-04T09:00:00.000Z',
  updatedAt: '2026-06-04T09:20:00.000Z',
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
  fieldLogEntries: [
    {
      id: 'field-log-map-summary',
      timestamp: '2026-06-04T09:18:00.000Z',
      category: 'observasjon',
      text: 'Kritisk kartkoblet observasjon uten persondata',
      mapReference: {
        source: 'map-marker',
        objectId: 'marker-1',
        label: 'KO lokal',
        point: { x: 22, y: 33 },
      },
      criticalObservation: true,
      mustBeForwarded: true,
    },
  ],
  ruhReports: [],
  welfareChecks: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
};

it('summarizes active map objects and critical map-linked field log entries', () => {
  render(
    <MissionMapSummary
      mission={mission}
      mapState={{
        markers: [{ id: 'marker-1', itemType: 'marker', kind: 'il-ko', label: 'KO lokal', point: { x: 22, y: 33 }, createdAt: '2026-06-04T09:15:00.000Z' }],
        drawings: [],
      }}
    />,
  );

  expect(screen.getByRole('heading', { name: /Kart og logg/i })).toBeInTheDocument();
  expect(screen.getByText(/1 markør/i)).toBeInTheDocument();
  expect(screen.getByText(/1 kartkoblet logg/i)).toBeInTheDocument();
  expect(screen.getByText(/1 kritisk observasjon/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Åpne kart/i })).toHaveAttribute('href', '/kart');
});

it('sorts latest map log by timestamp and hides raw schematic coordinates', () => {
  render(
    <MissionMapSummary
      mission={{
        ...mission,
        fieldLogEntries: [
          {
            id: 'entry-newer-map',
            timestamp: '2026-06-04T09:40:00.000Z',
            category: 'observasjon',
            text: 'Nyeste kartlogg',
            criticalObservation: false,
            mustBeForwarded: false,
            mapReference: { source: 'map-marker', objectId: 'marker-new', label: 'Ny markør', point: { x: 44, y: 55 } },
          },
          {
            id: 'entry-critical-no-map',
            timestamp: '2026-06-04T09:30:00.000Z',
            category: 'observasjon',
            text: 'Kritisk uten kartreferanse',
            criticalObservation: true,
            mustBeForwarded: true,
          },
          {
            id: 'entry-older-map-last-in-array',
            timestamp: '2026-06-04T09:10:00.000Z',
            category: 'observasjon',
            text: 'Eldre kartlogg sist i listen',
            criticalObservation: false,
            mustBeForwarded: false,
            mapReference: { source: 'map-marker', objectId: 'marker-old', label: 'Gammel markør', point: { x: 11, y: 22 } },
          },
        ],
      }}
      mapState={{ markers: [], drawings: [] }}
    />,
  );

  expect(screen.getByText(/1 kritisk observasjon/i)).toBeInTheDocument();
  expect(screen.getByText(/Ny markør/i)).toBeInTheDocument();
  expect(screen.queryByText(/Gammel markør/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/44,55|x 44|y 55|11,22|x 11|y 22/i)).not.toBeInTheDocument();
});
