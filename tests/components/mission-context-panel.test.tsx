import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { MissionContextPanel } from '@/components/mission-context-panel';
import { archiveMission, clearLocalMissionData, listArchivedMissions, listMissions, saveChecklistRun, saveMission } from '@/lib/mission/local-store';
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

it('lets users generate after-action Markdown, JSON and PDF-ready exports from the mission UI', async () => {
  const afterActionChecklists = [
    {
      slug: 'fig-under-innsats',
      title: 'FIG under innsats',
      phase: 'under',
      roles: ['lagforer'],
      scenarios: ['generelt'],
      sourceIds: ['src-fig-under-innsats'],
      equipmentRequired: ['kjoretoy'],
      items: [
        { id: 'materiell-sjekket', label: 'Materiell sjekket', required: true, sourceIds: ['src-fig-under-innsats'] },
        { id: 'ressursbruk-notert', label: 'Ressursbruk notert', required: true, sourceIds: ['src-fig-under-innsats'] },
      ],
    },
  ] as OperationalChecklist[];
  await saveMission({
    id: 'm2c2-after-action-ui',
    title: 'FIG etteraksjon UI',
    createdAt: '2026-06-03T09:00:00.000Z',
    updatedAt: '2026-06-03T09:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde sør',
    externalSignals: [{ source: 'met', kind: 'weather', severity: 'yellow', title: 'Regn', summary: 'Lokalt sammendrag', validFrom: null, validTo: null, fetchedAt: '2026-06-03T08:00:00.000Z', staleness: 'fresh', rawRef: 'met:regn-ui' }],
    activeChecklistIds: ['fig-under-innsats'],
    notes: 'Kort lokal note',
    tasks: [{ id: 'task-aar', title: 'Pakk kjøretøy', status: 'done', createdAt: '2026-06-03T09:01:00.000Z', updatedAt: '2026-06-03T09:10:00.000Z' }],
    statusLog: [{ id: 'status-aar', message: 'oppgave fullført', createdAt: '2026-06-03T09:20:00.000Z' }],
    resourceRequests: [{ id: 'resource-aar', kind: 'equipment', status: 'blocked', createdAt: '2026-06-03T09:20:00.000Z', quantity: '1 stk', note: 'Skadet arbeidslys' }],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);
  await saveChecklistRun({ id: 'run-aar-ui', missionId: 'm2c2-after-action-ui', templateSlug: 'fig-under-innsats', checkedItemIds: ['materiell-sjekket'], notesByItemId: { 'ressursbruk-notert': 'Fylles etter retur' }, updatedAt: '2026-06-03T09:25:00.000Z', schemaVersion: 1 });

  render(<MissionContextPanel contentVersion="test-v1" checklists={afterActionChecklists} />);

  await screen.findByRole('heading', { name: /Situasjonsoversikt nå/i });
  expect(screen.getByRole('heading', { name: /Etteraksjonsrapport/i })).toBeInTheDocument();
  expect(screen.getByText(/PDF-klar utskrift/i)).toBeInTheDocument();
  expect(screen.getByText(/Ikke offisiell innsending/i)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/Lokal ordretekst/i), 'Ordre fra lokal tavle');
  await userEvent.type(screen.getByLabelText(/Lokalt samband/i), 'Samband kanal lokal');
  await userEvent.type(screen.getByLabelText(/Lokal logg/i), 'Loggpunkt uten persondata');
  await userEvent.click(screen.getByRole('button', { name: /Lag etteraksjonsrapport Markdown/i }));
  await userEvent.click(screen.getByRole('button', { name: /Lag etteraksjonsrapport JSON/i }));
  await userEvent.click(screen.getByRole('button', { name: /Lag PDF-klar etteraksjonsrapport/i }));

  const markdownPreview = await screen.findByLabelText(/Etteraksjonsrapport Markdown/i) as HTMLTextAreaElement;
  const jsonPreview = screen.getByLabelText(/Etteraksjonsrapport JSON/i) as HTMLTextAreaElement;
  const pdfPreview = screen.getByLabelText(/PDF-klar etteraksjonsrapport HTML/i) as HTMLTextAreaElement;

  expect(markdownPreview.value).toContain('# Etteraksjonsrapport');
  expect(markdownPreview.value).toContain('Eksporterte filer kan inneholde operasjonelt sensitiv informasjon');
  expect(markdownPreview.value).toContain('Ordre fra lokal tavle');
  expect(markdownPreview.value).toContain('MBK-status / materiellberedskap');
  expect(jsonPreview.value).toContain('"schemaVersion"');
  expect(jsonPreview.value).toContain('Skadet arbeidslys');
  expect(pdfPreview.value).toContain('PDF-klar utskrift / bruk nettleserens Skriv ut &gt; Lagre som PDF');
  expect(pdfPreview.value).toContain('<!doctype html>');
});

it('archives pending lessons and feedback typed without clicking the separate save button', async () => {
  await saveMission({
    id: 'm2c-unsaved-lessons-archive',
    title: 'FIG direkte arkiv med læring',
    createdAt: '2026-06-03T09:00:00.000Z',
    updatedAt: '2026-06-03T09:30:00.000Z',
    phase: 'etter',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde sør',
    externalSignals: [],
    activeChecklistIds: ['mfe-etterkontroll'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);

  render(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await screen.findByRole('heading', { name: /Erfaringer og strukturert tilbakemelding/i });
  await userEvent.type(screen.getByLabelText(/Erfaringsoppsummering/i), 'Direkte arkivert erfaring');
  await userEvent.type(screen.getByLabelText(/Tilbakemelding utstyr/i), 'Direkte arkivert utstyrsfeedback');
  await userEvent.click(screen.getByRole('button', { name: /Fullfør og arkiver lokalt/i }));

  await waitFor(async () => {
    const archived = await listArchivedMissions();
    expect(archived).toHaveLength(1);
    expect(archived[0]?.lessonsLearned?.summary).toBe('Direkte arkivert erfaring');
    expect(archived[0]?.feedback?.equipment).toBe('Direkte arkivert utstyrsfeedback');
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

it('lets users save structured lessons and feedback before locally completing and archiving a mission', async () => {
  await saveMission({
    id: 'm2c3-active-archive-ui',
    title: 'FIG arkiverbar innsats',
    createdAt: '2026-06-03T12:00:00.000Z',
    updatedAt: '2026-06-03T12:15:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde arkiv',
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
  expect(screen.getByText(/Lokalt fullførte oppdrag/i)).toBeInTheDocument();
  expect(screen.getAllByText(/ikke offisielt arkiv/i).length).toBeGreaterThan(0);

  await userEvent.type(screen.getByLabelText(/Erfaringsoppsummering/i), 'Kort læring for lokalt arkiv');
  await userEvent.type(screen.getByLabelText(/Hva fungerte/i), 'Rollefordeling fungerte');
  await userEvent.type(screen.getByLabelText(/Forbedringer/i), 'Tidligere sambandstest');
  await userEvent.type(screen.getByLabelText(/Oppfølging/i), 'Øve depotflyt');
  await userEvent.type(screen.getByLabelText(/Tilbakemelding ledelse/i), 'Tydelig ledelse');
  await userEvent.type(screen.getByLabelText(/Tilbakemelding utstyr/i), 'Mangler ekstra lys');
  await userEvent.type(screen.getByLabelText(/Tilbakemelding prosedyrer/i), 'Prosedyre må forenkles');
  await userEvent.type(screen.getByLabelText(/Tilbakemelding trening/i), 'Mer øving');
  await userEvent.type(screen.getByLabelText(/Tilbakemelding sikkerhet/i), 'God sperring');
  await userEvent.type(screen.getByLabelText(/Tilbakemelding kommunikasjon/i), 'Repeter kallesett');
  await userEvent.click(screen.getByRole('button', { name: /Lagre erfaringer og tilbakemelding/i }));

  await waitFor(async () => {
    const [mission] = await listMissions();
    expect(mission.lessonsLearned?.summary).toContain('Kort læring');
    expect(mission.feedback?.equipment).toContain('ekstra lys');
  });

  await userEvent.click(screen.getByRole('button', { name: /Fullfør og arkiver lokalt/i }));

  await waitFor(async () => {
    expect(await listMissions()).toEqual([]);
    const archived = await listArchivedMissions();
    expect(archived[0]?.id).toBe('m2c3-active-archive-ui');
    expect(archived[0]?.completedAt).toBeTruthy();
    expect(archived[0]?.archivedAt).toBeTruthy();
    expect(archived[0]?.lessonsLearned?.improvements).toContain('sambandstest');
  });
  expect(screen.getByRole('heading', { name: /Ingen aktiv lokal tavle/i })).toBeInTheDocument();
  expect(screen.getByText(/FIG arkiverbar innsats/)).toBeInTheDocument();
});

it('supports local archive search, deleting one archived mission and clearing the archive without deleting active missions', async () => {
  await saveMission({
    id: 'm2c3-active-kept-ui',
    title: 'Aktiv beholdes',
    createdAt: '2026-06-03T12:00:00.000Z',
    updatedAt: '2026-06-03T12:20:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Aktiv lokasjon',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);
  await saveMission({
    id: 'm2c3-archive-search-ui',
    title: 'Arkiv sambandstreff',
    createdAt: '2026-06-03T11:00:00.000Z',
    updatedAt: '2026-06-03T11:20:00.000Z',
    phase: 'etter',
    role: 'mannskap',
    scenario: 'generelt',
    locationText: 'Depot radio',
    externalSignals: [],
    activeChecklistIds: [],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    lessonsLearned: { summary: 'Radio fungerte', whatWorked: '', improvements: '', followUp: '' },
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);
  await saveMission({
    id: 'm2c3-archive-miss-ui',
    title: 'Arkiv materiell',
    createdAt: '2026-06-03T10:00:00.000Z',
    updatedAt: '2026-06-03T10:20:00.000Z',
    phase: 'etter',
    role: 'mannskap',
    scenario: 'generelt',
    locationText: 'Depot lys',
    externalSignals: [],
    activeChecklistIds: [],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  } as any);
  await archiveMission('m2c3-archive-search-ui', { archivedAt: '2026-06-03T11:30:00.000Z' });
  await archiveMission('m2c3-archive-miss-ui', { archivedAt: '2026-06-03T10:30:00.000Z' });

  render(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await screen.findByText(/Arkiv sambandstreff/);
  expect(screen.getByText(/Arkiv materiell/)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/Søk i lokalt arkiv/i), 'radio');
  await waitFor(() => expect(screen.queryByText(/Arkiv materiell/)).not.toBeInTheDocument());
  expect(screen.getByText(/Arkiv sambandstreff/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Tøm lokalt arkiv/i })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: /Slett arkivert oppdrag Arkiv sambandstreff/i }));
  await waitFor(async () => expect((await listArchivedMissions()).map((item) => item.id)).toEqual(['m2c3-archive-miss-ui']));

  await userEvent.clear(screen.getByLabelText(/Søk i lokalt arkiv/i));
  await screen.findByText(/Arkiv materiell/);
  await userEvent.click(screen.getByRole('button', { name: /Tøm lokalt arkiv/i }));
  await waitFor(async () => expect(await listArchivedMissions()).toEqual([]));
  expect((await listMissions()).map((mission) => mission.id)).toContain('m2c3-active-kept-ui');
});
