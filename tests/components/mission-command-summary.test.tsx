import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MissionCommandHeader, MissionCommandSignals, MissionExportShortcuts, MissionProgressSummary, MissionQuickActionsGrid } from '@/components/mission-command-summary';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { MissionContext } from '@/lib/mission/schemas';

const mission: MissionContext = {
  id: 'mission-flom-jaren',
  title: 'Flom Jaren',
  createdAt: '2026-06-04T08:00:00.000Z',
  updatedAt: '2026-06-04T08:30:00.000Z',
  phase: 'under',
  role: 'lagforer',
  scenario: 'flom',
  locationText: 'Jaren',
  externalSignals: [],
  externalSignalHistory: [],
  activeChecklistIds: ['fig-under-innsats'],
  notes: '',
  tasks: [{ id: 'task-done', title: 'Sikre pumpepunkt', status: 'done', createdAt: '2026-06-04T08:05:00.000Z', updatedAt: '2026-06-04T08:20:00.000Z' }],
  statusLog: [],
  resourceRequests: [],
  fieldLogEntries: [],
  ruhReports: [],
  welfareChecks: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
};

const checklists: OperationalChecklist[] = [
  {
    slug: 'fig-under-innsats',
    title: 'FIG under innsats',
    phase: 'under',
    roles: ['lagforer'],
    scenarios: ['flom'],
    sourceIds: ['src-fig-under-innsats'],
    items: [{ id: 'trygg-innsats', label: 'Trygg innsats vurdert', required: true, sourceIds: ['src-fig-under-innsats'] }],
  },
];

it('renders a situation-first mission command header', () => {
  render(<MissionCommandHeader mission={mission} />);

  expect(screen.getByRole('heading', { name: 'Oppdrag' })).toBeInTheDocument();
  expect(screen.getByText('Flom Jaren · Jaren')).toBeInTheDocument();
  expect(screen.getByText('Lokal lagring · Ikke delt')).toBeInTheDocument();
});

it('renders progress status and export shortcuts', () => {
  render(
    <>
      <MissionProgressSummary mission={mission} checklists={checklists} mapSummary={{ markerCount: 2, drawingCount: 1 }} />
      <MissionExportShortcuts />
    </>,
  );

  expect(screen.getByRole('heading', { name: 'Fremdrift' })).toBeInTheDocument();
  expect(screen.getByText('Under innsats')).toBeInTheDocument();
  expect(screen.getByText('Kart')).toBeInTheDocument();
  expect(screen.getByText(/2 markører/i)).toBeInTheDocument();
  expect(screen.getByText(/1 tegning\/sektor/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '5-punktsordre' })).toHaveAttribute('href', '#5-punktsordre');
      expect(screen.getByRole('link', { name: 'Sambandsplan' })).toHaveAttribute('href', '#sambandsplan');
});

it('renders mission quick actions as two-column field shortcuts', () => {
  render(<MissionQuickActionsGrid />);

  expect(screen.getByRole('heading', { name: 'Hurtighandlinger' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Hurtiglogg/i })).toHaveAttribute('href', '#hurtiglogg');
  expect(screen.getByRole('link', { name: /Sjekkliste/i })).toHaveAttribute('href', '#sjekkliste');
  expect(screen.getByRole('link', { name: /5-punktsordre/i })).toHaveAttribute('href', '#5-punktsordre');
  expect(screen.getByRole('link', { name: /Sambandsplan/i })).toHaveAttribute('href', '#sambandsplan');
  expect(screen.getByRole('link', { name: /Kart/i })).toHaveAttribute('href', '#kart');
  expect(screen.getByRole('link', { name: /RUH\/velferd/i })).toHaveAttribute('href', '#ruh-velferd');
  expect(screen.getByRole('link', { name: /Etterrapport/i })).toHaveAttribute('href', '#etterrapport');
  expect(screen.getByRole('link', { name: /Oppdragsmappe/i })).toHaveAttribute('href', '#oppdragsmappe');
});

it('uses saved checklist runs for active checklist progress', () => {
  render(
    <MissionProgressSummary
      mission={mission}
      checklists={[{
        ...checklists[0],
        items: [
          { id: 'trygg-innsats', label: 'Trygg innsats vurdert', required: true, sourceIds: ['src-fig-under-innsats'] },
          { id: 'samband', label: 'Samband bekreftet', required: true, sourceIds: ['src-fig-under-innsats'] },
        ],
      }]}
      checklistRuns={[{
        id: 'mission-flom-jaren:fig-under-innsats',
        missionId: 'mission-flom-jaren',
        templateSlug: 'fig-under-innsats',
        checkedItemIds: ['trygg-innsats'],
        notesByItemId: {},
        equipmentStatusByItemId: {},
        updatedAt: '2026-06-04T08:40:00.000Z',
        schemaVersion: 1,
      }]}
    />,
  );

  expect(screen.getByText(/1\/2 punkter fullført/i)).toBeInTheDocument();
});

it('summarizes critical logs and map activity as mission command signals', () => {
  const criticalMission: MissionContext = {
    ...mission,
    fieldLogEntries: [{
      id: 'critical-1',
      timestamp: '2026-06-05T10:00:00.000Z',
      category: 'observasjon',
      text: 'Vannstand øker',
      criticalObservation: true,
      mustBeForwarded: true,
      linkedMissionId: mission.id,
    }],
  };

  render(<MissionCommandSignals mission={criticalMission} mapSummary={{ markerCount: 2, drawingCount: 1 }} />);

  expect(screen.getByText(/1 kritisk logg/i)).toBeInTheDocument();
  expect(screen.getByText(/2 markører/i)).toBeInTheDocument();
  expect(screen.getByText(/1 sektor/i)).toBeInTheDocument();
  expect(screen.getByText(/foreslå statusoppdatering/i)).toBeInTheDocument();
});

it('pluralizes command signal counts for zero and many map/log signals', () => {
  const { rerender } = render(<MissionCommandSignals mission={{ ...mission, fieldLogEntries: [] }} mapSummary={{ markerCount: 0, drawingCount: 0 }} />);

  expect(screen.getByText(/0 kritiske logger/i)).toBeInTheDocument();
  expect(screen.getByText(/0 markører/i)).toBeInTheDocument();
  expect(screen.getByText(/0 sektorer\/tegninger/i)).toBeInTheDocument();

  rerender(<MissionCommandSignals mission={{
    ...mission,
    fieldLogEntries: [
      {
        id: 'critical-1',
        timestamp: '2026-06-05T10:00:00.000Z',
        category: 'observasjon',
        text: 'Vannstand øker',
        criticalObservation: true,
        mustBeForwarded: false,
        linkedMissionId: mission.id,
      },
      {
        id: 'forward-1',
        timestamp: '2026-06-05T10:10:00.000Z',
        category: 'observasjon',
        text: 'Pumpebehov må videreføres',
        criticalObservation: false,
        mustBeForwarded: true,
        linkedMissionId: mission.id,
      },
    ],
  }} mapSummary={{ markerCount: 3, drawingCount: 2 }} />);

  expect(screen.getByText(/2 kritiske logger/i)).toBeInTheDocument();
  expect(screen.getByText(/3 markører/i)).toBeInTheDocument();
  expect(screen.getByText(/2 sektorer\/tegninger/i)).toBeInTheDocument();
});
