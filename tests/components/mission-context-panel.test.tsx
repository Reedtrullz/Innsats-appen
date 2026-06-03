import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { MissionContextPanel } from '@/components/mission-context-panel';
import { clearLocalMissionData, listMissions, saveMission } from '@/lib/mission/local-store';
import type { OperationalChecklist } from '@/lib/content/schemas';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(async () => clearLocalMissionData());

const checklists = [
  {
    slug: 'tilfluktsrom-teknisk-status',
    title: 'Tilfluktsrom teknisk status',
    phase: 'for',
    roles: ['beredskapsvakt'],
    scenarios: ['tilfluktsrom'],
    sourceIds: ['src-deep-research-tilfluktsrom'],
    items: [],
  },
  {
    slug: 'mfe-etterkontroll',
    title: 'MFE etterkontroll',
    phase: 'etter',
    roles: ['mannskap'],
    scenarios: ['mfe-stotte'],
    sourceIds: ['src-sjekkliste-mobil-forsterkningsenhet-mfe'],
    items: [],
  },
] as OperationalChecklist[];

it('stores the checklist that matches the selected mission scenario and phase', async () => {
  render(<MissionContextPanel mode="create" contentVersion="test-v1" checklists={checklists} />);

  await userEvent.type(screen.getByLabelText(/Tittel/i), 'MFE etterkontroll øvelse');
  await userEvent.selectOptions(screen.getByLabelText(/Fase/i), 'etter');
  await userEvent.selectOptions(screen.getByLabelText(/Scenario/i), 'mfe-stotte');
  await userEvent.type(screen.getByLabelText(/Sted\/lokasjon/i), 'Trondheim');
  await userEvent.click(screen.getByRole('button', { name: /Lagre oppdrag/i }));

  await waitFor(async () => {
    const [mission] = await listMissions();
    expect(mission?.activeChecklistIds).toEqual(['mfe-etterkontroll']);
  });
});

it('lets users generate a local task/status/resource markdown export from the mission UI', async () => {
  await saveMission({
    id: 'm2b-export-ui',
    title: 'FIG status eksport',
    createdAt: '2026-06-03T09:00:00.000Z',
    updatedAt: '2026-06-03T09:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde sør',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: 'Kort lokal note',
    tasks: [{ id: 'task-export', title: 'Sikre adkomst', status: 'blocked', createdAt: '2026-06-03T09:01:00.000Z', updatedAt: '2026-06-03T09:01:00.000Z' }],
    statusLog: [{ id: 'status-export', message: 'trenger assistanse', createdAt: '2026-06-03T09:10:00.000Z' }],
    resourceRequests: [{ id: 'resource-export', kind: 'fuel', status: 'not-started', createdAt: '2026-06-03T09:20:00.000Z', quantity: '10 liter', note: 'Til kjøretøy' }],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);

  render(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  const exportButton = await screen.findByRole('button', { name: /Lag lokal statusrapport/i });
  expect(screen.getByText(/Kun lokal eksport i denne nettleseren\. Ikke offisiell logg\./i)).toBeInTheDocument();
  expect(screen.getByText(/sensitiv informasjon/i)).toBeInTheDocument();

  await userEvent.click(exportButton);

  const preview = screen.getByLabelText(/Lokal oppdragsstatus i Markdown/i) as HTMLTextAreaElement;
  expect(preview.value).toContain('# Lokal oppdragsstatus');
  expect(preview.value).toContain('Lagres bare lokalt i denne nettleseren');
  expect(preview.value).toContain('sensitivt innhold');
  expect(preview.value).toContain('Sikre adkomst');
  expect(preview.value).toContain('trenger assistanse');
  expect(preview.value).toContain('Drivstoff');

  await userEvent.type(screen.getByLabelText(/Ny lokal oppgave/i), 'Ny eksportoppgave');
  await userEvent.click(screen.getByRole('button', { name: /Legg til oppgave/i }));

  await waitFor(() => {
    expect(preview.value).toContain('Ny eksportoppgave');
  });
});

it('shows current situation and lets users add local tasks, quick status and resource requests', async () => {
  await saveMission({
    id: 'm2b-ui',
    title: 'FIG under innsats',
    createdAt: '2026-06-03T10:00:00.000Z',
    updatedAt: '2026-06-03T10:00:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde nord',
    externalSignals: [
      { source: 'met', kind: 'weather', severity: 'yellow', title: 'Kraftig regn', summary: 'Lokalt sammendrag', validFrom: null, validTo: null, fetchedAt: '2026-06-03T10:00:00.000Z', staleness: 'fresh', rawRef: 'met:regn-1' },
    ],
    activeChecklistIds: ['fig-under-innsats'],
    notes: 'Kort situasjonsnote',
    tasks: [{ id: 'task-existing', title: 'Sikre adkomst', status: 'blocked', createdAt: '2026-06-03T10:01:00.000Z', updatedAt: '2026-06-03T10:01:00.000Z' }],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);

  render(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  expect(await screen.findByRole('heading', { name: /Situasjonsoversikt nå/i })).toBeInTheDocument();
  expect(screen.getByText(/Kraftig regn: Lokalt sammendrag/i)).toBeInTheDocument();
  expect(screen.getByText(/Sikre adkomst/)).toBeInTheDocument();
  expect(screen.getByText(/fig-under-innsats/)).toBeInTheDocument();
  expect(screen.getByText(/ikke legg inn navn, ID, pasientdetaljer, helsejournal/i)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/Ny lokal oppgave/i), 'Avklar ekstra lys');
  await userEvent.selectOptions(screen.getByLabelText(/Oppgavestatus/i), 'needs-assistance');
  await userEvent.click(screen.getByRole('button', { name: /Legg til oppgave/i }));

  await userEvent.click(screen.getByRole('button', { name: /trenger assistanse/i }));

  await userEvent.selectOptions(screen.getByLabelText(/Ressurstype/i), 'fuel');
  await userEvent.type(screen.getByLabelText(/Mengde eller behov/i), 'Drivstoff til kjøretøy');
  await userEvent.click(screen.getByRole('button', { name: /Registrer ressursbehov/i }));

  await waitFor(async () => {
    const [mission] = await listMissions();
    expect(mission.tasks.map((task) => task.title)).toEqual(expect.arrayContaining(['Sikre adkomst', 'Avklar ekstra lys']));
    expect(mission.tasks.find((task) => task.title === 'Avklar ekstra lys')?.status).toBe('needs-assistance');
    expect(mission.statusLog.map((status) => status.message)).toContain('trenger assistanse');
    expect(mission.resourceRequests.map((request) => request.kind)).toContain('fuel');
  });
});

it('preserves rapid local task, quick status and resource additions in IndexedDB', async () => {
  await saveMission({
    id: 'm2b-race',
    title: 'FIG raske lokale endringer',
    createdAt: '2026-06-03T11:00:00.000Z',
    updatedAt: '2026-06-03T11:00:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde vest',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);

  render(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);
  await screen.findByRole('heading', { name: /Situasjonsoversikt nå/i });

  await userEvent.type(screen.getByLabelText(/Ny lokal oppgave/i), 'Sett opp sperring');
  await userEvent.type(screen.getByLabelText(/Mengde eller behov/i), '2 sett sperremateriell');

  fireEvent.click(screen.getByRole('button', { name: /Legg til oppgave/i }));
  fireEvent.click(screen.getByRole('button', { name: /trenger assistanse/i }));
  fireEvent.click(screen.getByRole('button', { name: /Registrer ressursbehov/i }));

  await waitFor(async () => {
    const [mission] = await listMissions();
    expect(mission.tasks.map((task) => task.title)).toContain('Sett opp sperring');
    expect(mission.statusLog.map((status) => status.message)).toContain('trenger assistanse');
    expect(mission.resourceRequests.map((request) => request.quantity)).toContain('2 sett sperremateriell');
  });
});

it('shows and exports stored context signals with the same stale normalization as the context panel', async () => {
  await saveMission({
    id: 'm2b-stale-signal',
    title: 'FIG stale signal',
    createdAt: '2026-06-03T08:00:00.000Z',
    updatedAt: '2026-06-03T08:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde øst',
    externalSignals: [
      { source: 'met', kind: 'weather', severity: 'yellow', title: 'Gammelt regnvarsel', summary: 'Lagret sammendrag', validFrom: null, validTo: null, fetchedAt: '2026-06-01T08:00:00.000Z', staleness: 'fresh', rawRef: 'met:duplicate' },
      { source: 'met', kind: 'weather', severity: 'yellow', title: 'Gammelt vindvarsel', summary: 'Lagret sammendrag to', validFrom: null, validTo: null, fetchedAt: '2026-06-01T08:05:00.000Z', staleness: 'fresh', rawRef: 'met:duplicate' },
    ],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);

  render(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await screen.findByText(/Viser sist vellykkede lokale kontekstsignal som stale/i);
  expect(screen.getByText(/Gammelt regnvarsel: Lagret sammendrag \(stale\)/i)).toBeInTheDocument();
  expect(screen.queryByText(/Gammelt regnvarsel: Lagret sammendrag \(fresh\)/i)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Lag lokal statusrapport/i }));
  const preview = screen.getByLabelText(/Lokal oppdragsstatus i Markdown/i) as HTMLTextAreaElement;
  expect(preview.value).toContain('Gammelt regnvarsel: Lagret sammendrag (met, yellow, stale)');
  expect(preview.value).toContain('Gammelt vindvarsel: Lagret sammendrag to (met, yellow, stale)');
  expect(preview.value).not.toContain('(met, yellow, fresh)');
});
