import { act, fireEvent, render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { MissionContextPanel } from '@/components/mission-context-panel';
import { LocalMissionControls } from '@/components/mission/local-mission-controls';
import { archiveMission, clearLocalMissionData, listArchivedMissions, listMissions, saveChecklistRun, saveMission } from '@/lib/mission/local-store';
import { EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY } from '@/lib/integrations/source-settings';
import { readLocalAuditLog } from '@/lib/privacy/local-profile';
import { OPERATIONS_MAP_STORAGE_KEY } from '@/lib/maps/operations-map';
import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import type { MissionContext } from '@/lib/mission/schemas';
import { buildMission } from '../helpers/mission-fixtures';
import { flushAsyncEffects } from '../helpers/react-effects';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(async () => {
  await act(async () => {
    window.history.replaceState(null, '', '/');
    localStorage.clear();
    await clearLocalMissionData();
  });
});

const checklists = [
  {
    slug: 'tilfluktsrom-teknisk-status',
    title: 'Tilfluktsrom teknisk status',
    phase: 'for',
    roles: ['beredskapsvakt'],
    scenarios: ['tilfluktsrom'],
    sourceIds: ['src-operativt-konsept-for-sivilforsvaret'],
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

const mission = buildMission;

async function renderMissionPanel(ui: ReactElement): Promise<RenderResult> {
  const result = render(ui);
  await flushAsyncEffects();
  await waitFor(() => {
    expect(screen.queryAllByText(/Laster lokal sjekklistestatus før redigering/i)).toHaveLength(0);
  });
  return result;
}

async function seedMissions(missions: MissionContext[]) {
  for (const item of missions) {
    await saveMission(item);
  }
}

async function openMissionMode(label: 'Nå' | 'Arbeid' | 'Eksport') {
  const modeControl = await screen.findByRole('tablist', { name: /Oppdragsmodus/i });
  await userEvent.click(within(modeControl).getByRole('tab', { name: label }));
}

async function openWorkDetails(summary: RegExp | string) {
  await openMissionMode('Arbeid');
  await userEvent.click(await findDetailsSummary(summary));
}

async function openExportDetails(summary: RegExp | string) {
  await openMissionMode('Eksport');
  await userEvent.click(await findDetailsSummary(summary));
}

async function findDetailsSummary(summary: RegExp | string) {
  await waitFor(() => {
    const summaries = Array.from(document.querySelectorAll('details > summary')) as HTMLElement[];
    const match = summaries.find((item) => typeof summary === 'string' ? item.textContent?.includes(summary) : summary.test(item.textContent ?? ''));
    expect(match).toBeTruthy();
  });
  const summaries = Array.from(document.querySelectorAll('details > summary')) as HTMLElement[];
  const match = summaries.find((item) => typeof summary === 'string' ? item.textContent?.includes(summary) : summary.test(item.textContent ?? ''));
  return match as HTMLElement;
}

it('can open another local mission as the active dashboard', async () => {
  await seedMissions([
    mission({ id: 'mission-a', title: 'A', locationText: 'Lokasjon A', updatedAt: '2026-06-04T10:00:00.000Z' }),
    mission({ id: 'mission-b', title: 'B', locationText: 'Lokasjon B', updatedAt: '2026-06-04T09:00:00.000Z' }),
  ]);

  await renderMissionPanel(<MissionContextPanel mode="list" contentVersion="test" checklists={[]} actionCards={[]} />);

  expect(await screen.findByText(/A · Lokasjon A/i)).toBeInTheDocument();
  await userEvent.click(await screen.findByRole('button', { name: /Åpne B som aktivt oppdrag/i }));
  expect(await screen.findByText(/B · Lokasjon B/i)).toBeInTheDocument();
});

it('wires Hurtiglogg composer and log overview into the active mission dashboard', async () => {
  await saveMission(mission({
    id: 'mission-dashboard-quick-log',
    title: 'Dashboard quick log',
    locationText: 'Oppdragstavle',
    fieldLogEntries: [
      {
        id: 'dashboard-log-overview-entry',
        timestamp: '2026-06-04T08:10:00.000Z',
        category: 'observasjon',
        text: 'Dashboard loggoversikt entry',
        linkedMissionId: 'mission-dashboard-quick-log',
        criticalObservation: false,
        mustBeForwarded: false,
      },
    ],
  }));

  await renderMissionPanel(<MissionContextPanel mode="list" contentVersion="test" checklists={[]} actionCards={[]} />);

  expect(await screen.findByText('Hurtiglogg · Oppdragstavle')).toBeInTheDocument();
  expect(document.querySelector('#hurtiglogg')).not.toBeNull();
  await openWorkDetails(/Loggoversikt og lokale oppgaver/i);
  expect(document.querySelector('#loggoversikt')).not.toBeNull();
  expect(document.getElementById('loggoversikt')).toHaveTextContent('Dashboard loggoversikt entry');
});

it('discloses the outbound boundary for public context lookups in mission creation', async () => {
  await renderMissionPanel(<MissionContextPanel mode="create" contentVersion="test-v1" checklists={checklists} actionCards={[]} />);

  const text = document.body.textContent ?? '';
  expect(text).toContain('MET/Kartverket/NVE');
  expect(text).toContain('posisjon eller søketekst vil bli sendt til offentlige API-er');
  expect(text).toContain('oppdragsnotater og privat tekst forblir lokalt');
});

it('stores the checklist that matches the selected mission scenario and phase', async () => {
  await renderMissionPanel(<MissionContextPanel mode="create" contentVersion="test-v1" checklists={checklists} />);

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

it('blocks sensitive mission creation text in the UI before saving locally', async () => {
  await renderMissionPanel(<MissionContextPanel mode="create" contentVersion="test-v1" checklists={checklists} />);

  await userEvent.type(screen.getByLabelText(/Tittel/i), 'pasient Ola Nordmann');
  await userEvent.type(screen.getByLabelText(/Sted\/lokasjon/i), 'Trondheim');
  await userEvent.click(screen.getByRole('button', { name: /Lagre oppdrag/i }));

  const alert = await screen.findByRole('alert', { name: /oppdrag personvern/i });
  expect(alert).toHaveTextContent(/persondata|pasientdata|skjermet/i);
  expect(alert).not.toHaveTextContent(/Ola Nordmann/i);
  await waitFor(async () => {
    expect(await listMissions()).toEqual([]);
  });
});

it('blocks sensitive local task and resource text in the UI before saving locally', async () => {
  await saveMission(mission({ id: 'status-sensitive-ui', title: 'Sensitive local status UI' }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openWorkDetails(/Loggoversikt og lokale oppgaver/i);
  await userEvent.type(screen.getByLabelText(/Ny lokal oppgave/i), 'pasient Ola Nordmann');
  await userEvent.click(screen.getByRole('button', { name: /Legg til oppgave/i }));

  const taskAlert = await screen.findByRole('alert', { name: /lokal status personvern/i });
  expect(taskAlert).toHaveTextContent(/persondata|pasientdata|skjermet/i);
  expect(taskAlert).not.toHaveTextContent(/Ola Nordmann/i);
  await waitFor(async () => {
    const [storedMission] = await listMissions();
    expect(storedMission.tasks).toEqual([]);
  });

  await userEvent.type(screen.getByLabelText(/Kort merknad/i), 'fødselsnummer 01017012345');
  await userEvent.click(screen.getByRole('button', { name: /Registrer ressursbehov/i }));

  const resourceAlert = await screen.findByRole('alert', { name: /lokal status personvern/i });
  expect(resourceAlert).toHaveTextContent(/persondata|pasientdata|skjermet/i);
  expect(resourceAlert).not.toHaveTextContent(/01017012345/i);
  await waitFor(async () => {
    const [storedMission] = await listMissions();
    expect(storedMission.resourceRequests).toEqual([]);
  });
});

it('lets users generate a local task/status/resource markdown export from the mission UI', async () => {
  await saveMission(mission({
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
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openExportDetails(/Lokal statusrapport/i);
  const exportButton = await screen.findByRole('button', { name: /Lag lokal statusrapport/i });
  expect(screen.getByText(/Kun lokal eksport i denne nettleseren\. Ikke offisiell logg\./i)).toBeInTheDocument();
  expect(screen.getAllByText(/sensitiv informasjon/i).length).toBeGreaterThan(0);

  await userEvent.click(exportButton);

  expect(screen.getByText(/Lokal statusrapport er klar/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Kopier/i })).toBeInTheDocument();
  expect((screen.getByText(/Vis forhåndsvisning/i).closest('details') as HTMLDetailsElement | null)?.open).toBe(false);
  await userEvent.click(screen.getByText(/Vis forhåndsvisning/i));
  const preview = screen.getByLabelText(/Lokal statusrapport/i) as HTMLTextAreaElement;
  expect(preview.value).toContain('# Lokal oppdragsstatus');
  expect(preview.value).toContain('Lagres bare lokalt i denne nettleseren');
  expect(preview.value).toContain('sensitivt innhold');
  expect(preview.value).toContain('Sikre adkomst');
  expect(preview.value).toContain('trenger assistanse');
  expect(preview.value).toContain('Drivstoff');

  await openWorkDetails(/Loggoversikt og lokale oppgaver/i);
  await userEvent.type(screen.getByLabelText(/Ny lokal oppgave/i), 'Ny eksportoppgave');
  await userEvent.click(screen.getByRole('button', { name: /Legg til oppgave/i }));

  await waitFor(async () => {
    const [storedMission] = await listMissions();
    expect(storedMission.tasks.some((task) => task.title === 'Ny eksportoppgave')).toBe(true);
  });
});

it('shows a local status privacy warning instead of rendering a preview when status export text is sensitive', async () => {
  const sensitiveMission = {
    ...mission({ id: 'local-status-export-sensitive', title: 'Sensitive status export UI' }),
    notes: 'pasient Ola Nordmann',
  };

  render(<LocalMissionControls mission={sensitiveMission} displaySignals={[]} onMissionChange={vi.fn(async () => undefined)} />);

  await userEvent.click(screen.getByRole('button', { name: /Lag lokal statusrapport/i }));

  const alert = await screen.findByRole('alert', { name: /lokal status personvern/i });
  expect(alert).toHaveTextContent(/persondata|pasientdata|skjermet/i);
  expect(alert).not.toHaveTextContent(/Ola Nordmann/i);
  expect(document.body).not.toHaveTextContent(/Ola Nordmann/i);
  expect(screen.queryByLabelText(/Lokal statusrapport/i)).not.toBeInTheDocument();
  expect(readLocalAuditLog().some((entry) => entry.details?.exportKind === 'status-summary')).toBe(false);
});

it('does not render a stale local status preview after mission or signal content changes to sensitive text', async () => {
  const safeMission = mission({
    id: 'local-status-stale-preview',
    title: 'Trygt statusoppdrag',
    locationText: 'Trygt område',
    notes: 'Gammel trygg eksportmarkør',
    tasks: [{ id: 'task-stale-safe', title: 'Trygg oppgave', status: 'in-progress', createdAt: '2026-06-04T08:01:00.000Z', updatedAt: '2026-06-04T08:01:00.000Z' }],
  });
  const safeSignals: MissionContext['externalSignals'] = [{
    source: 'met',
    kind: 'weather',
    severity: 'yellow',
    title: 'Trygt værvarsel',
    summary: 'Trygt lokalt sammendrag',
    validFrom: null,
    validTo: null,
    fetchedAt: '2026-06-04T08:00:00.000Z',
    staleness: 'fresh',
    rawRef: 'met:trygt-varsel',
  }];
  const sensitiveMission = {
    ...safeMission,
    title: 'pasient Ola Nordmann',
    locationText: 'skjermet tilfluktsrom adresse',
    notes: 'fødselsnummer 01017012345',
    tasks: [{ ...safeMission.tasks[0], title: 'pasient Ola Nordmann' }],
    statusLog: [{ id: 'status-sensitive-corrupt', message: 'pasient Ola Nordmann' as MissionContext['statusLog'][number]['message'], createdAt: '2026-06-04T08:02:00.000Z' }],
  };
  const sensitiveSignals: MissionContext['externalSignals'] = [{
    ...safeSignals[0],
    title: 'pasient Ola Nordmann',
    summary: 'skjermet tilfluktsrom adresse',
  }];

  const { rerender } = render(<LocalMissionControls mission={safeMission} displaySignals={safeSignals} onMissionChange={vi.fn(async () => undefined)} />);
  await userEvent.click(screen.getByRole('button', { name: /Lag lokal statusrapport/i }));
  await userEvent.click(screen.getByText(/Vis forhåndsvisning/i));
  const preview = await screen.findByLabelText(/Lokal statusrapport/i) as HTMLTextAreaElement;
  expect(preview.value).toContain('Gammel trygg eksportmarkør');

  rerender(<LocalMissionControls mission={sensitiveMission} displaySignals={sensitiveSignals} onMissionChange={vi.fn(async () => undefined)} />);

  expect(document.body).not.toHaveTextContent(/Gammel trygg eksportmarkør/i);
  expect(document.body).not.toHaveTextContent(/Ola Nordmann|01017012345|tilfluktsrom adresse/i);
  const alert = await screen.findByRole('alert', { name: /lokal status personvern/i });
  expect(alert).toHaveTextContent(/persondata|pasientdata|skjermet/i);
  expect(screen.queryByLabelText(/Lokal statusrapport/i)).not.toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/Ola Nordmann|01017012345|tilfluktsrom adresse/i);
});

it('lets users generate local MBK equipment readiness Markdown and JSON exports from the mission UI', async () => {
  const mbkChecklists = [
    {
      slug: 'mbk-kjoretoy',
      title: 'MBK kjøretøy',
      phase: 'for',
      roles: ['materiellansvarlig'],
      scenarios: ['generelt'],
      equipmentRequired: ['kjoretoy'],
      sourceIds: ['src-sjekkliste-fig-og-figp'],
      warning: 'Kun lokal status uten persondata.',
      items: [
        { id: 'status-kontrollert', label: 'Status kontrollert', required: true, sourceIds: ['src-sjekkliste-fig-og-figp'] },
        { id: 'vask-service-karantene-vurdert', label: 'Vask service karantene vurdert', required: true, sourceIds: ['src-tiltakskort-etter-innsats'] },
      ],
    },
  ] as OperationalChecklist[];
  await saveMission(mission({
    id: 'm5c-mbk-ui',
    title: 'MBK UI eksport',
    createdAt: '2026-06-04T08:00:00.000Z',
    updatedAt: '2026-06-04T08:30:00.000Z',
    phase: 'for',
    role: 'materiellansvarlig',
    scenario: 'generelt',
    locationText: 'Lokalt område',
    externalSignals: [],
    activeChecklistIds: ['mbk-kjoretoy'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));
  await saveChecklistRun({
    id: 'run-mbk-ui',
    missionId: 'm5c-mbk-ui',
    templateSlug: 'mbk-kjoretoy',
    checkedItemIds: ['status-kontrollert', 'vask-service-karantene-vurdert'],
    notesByItemId: { 'status-kontrollert': 'SERIAL 123 privat depot' },
    equipmentStatusByItemId: { 'status-kontrollert': 'ready', 'vask-service-karantene-vurdert': 'needs-service' },
    updatedAt: '2026-06-04T08:20:00.000Z',
    schemaVersion: 1,
  });

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={mbkChecklists} />);

  await openExportDetails(/MBK \/ materiellberedskap/i);
  expect(await screen.findByRole('heading', { name: /Materiellberedskap \/ MBK/i })).toBeInTheDocument();
  expect(screen.getByText(/ikke offisiell inventarliste/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Lag MBK Markdown/i }));
  await userEvent.click(screen.getByRole('button', { name: /Lag MBK JSON/i }));

  const markdownPreview = await screen.findByLabelText(/MBK materiellstatus Markdown/i) as HTMLTextAreaElement;
  const jsonPreview = await screen.findByLabelText(/MBK materiellstatus JSON/i) as HTMLTextAreaElement;
  expect(markdownPreview.value).toContain('# Materiellberedskap / MBK');
  expect(markdownPreview.value).toContain('Klar for ny utdeployering: Nei');
  expect(markdownPreview.value).toContain('Trenger service');
  expect(markdownPreview.value).not.toMatch(/indexedDB|SERIAL 123|privat depot|depot/i);
  expect(jsonPreview.value).toContain('"readyForNewDeployment": false');
  expect(jsonPreview.value).not.toMatch(/indexedDB|SERIAL 123|privat depot|depot/i);
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
  await saveMission(mission({
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
  }));
  await saveChecklistRun({ id: 'run-aar-ui', missionId: 'm2c2-after-action-ui', templateSlug: 'fig-under-innsats', checkedItemIds: ['materiell-sjekket'], notesByItemId: { 'ressursbruk-notert': 'Fylles etter retur' }, updatedAt: '2026-06-03T09:25:00.000Z', schemaVersion: 1 });
  localStorage.setItem(OPERATIONS_MAP_STORAGE_KEY, JSON.stringify({
    markers: [{ id: 'marker-aar-ui', missionId: 'm2c2-after-action-ui', itemType: 'marker', kind: 'il-ko', label: 'KO etterrapport', point: { x: 22, y: 33 }, createdAt: '2026-06-03T09:15:00.000Z' }],
    drawings: [{ id: 'sector-aar-ui', missionId: 'm2c2-after-action-ui', itemType: 'drawing', kind: 'sector', label: 'Sektor etterrapport', points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 20, y: 30 }], createdAt: '2026-06-03T09:16:00.000Z' }],
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={afterActionChecklists} />);

  await openExportDetails(/Etterrapport/i);
  const afterActionSection = document.querySelector('#etterrapport') as HTMLElement | null;
  expect(afterActionSection).not.toBeNull();
  expect(screen.getByRole('heading', { name: /Etteraksjonsrapport/i })).toBeInTheDocument();
  expect(screen.getByText(/Generer lokalt, se over, kopier\/eksporter\. Ikke legg inn persondata/i)).toBeInTheDocument();

  await userEvent.click(within(afterActionSection!).getByText(/Legg til notater/i));
  await userEvent.type(within(afterActionSection!).getByLabelText(/Lokal ordretekst/i), 'Ordre fra lokal tavle');
  await userEvent.type(within(afterActionSection!).getByLabelText(/Lokalt samband/i), 'Samband kanal lokal');
  await userEvent.type(within(afterActionSection!).getByLabelText(/Lokal logg/i), 'Loggpunkt uten persondata');
  await userEvent.click(within(afterActionSection!).getByRole('button', { name: /Bygg etterrapport/i }));
  await userEvent.click(within(afterActionSection!).getByText(/Eksporter \/ kopier/i));
  await userEvent.click(within(afterActionSection!).getByRole('button', { name: /Lag JSON/i }));
  await userEvent.click(within(afterActionSection!).getByRole('button', { name: /Lag PDF-klar HTML/i }));
  await userEvent.click(within(afterActionSection!).getAllByText(/Vis forhåndsvisning/i)[0]);
  await userEvent.click(within(afterActionSection!).getAllByText(/Vis forhåndsvisning/i)[1]);
  await userEvent.click(within(afterActionSection!).getAllByText(/Vis forhåndsvisning/i)[2]);

  const markdownPreview = await within(afterActionSection!).findByLabelText(/Etteraksjonsrapport Markdown/i) as HTMLTextAreaElement;
  const jsonPreview = within(afterActionSection!).getByLabelText(/Etteraksjonsrapport JSON/i) as HTMLTextAreaElement;
  const pdfPreview = within(afterActionSection!).getByLabelText(/PDF-klar etteraksjonsrapport HTML/i) as HTMLTextAreaElement;

  expect(markdownPreview.value).toContain('# Etteraksjonsrapport');
  expect(markdownPreview.value).toContain('Eksporterte filer kan inneholde operasjonelt sensitiv informasjon');
  expect(markdownPreview.value).toContain('Ordre fra lokal tavle');
  expect(markdownPreview.value).toContain('MBK-status / materiellberedskap');
  expect(markdownPreview.value).toContain('KO etterrapport');
  expect(jsonPreview.value).toContain('"schemaVersion"');
  expect(jsonPreview.value).toContain('Skadet arbeidslys');
  expect(jsonPreview.value).toContain('"ruhWelfareSummary"');
  expect(jsonPreview.value).toContain('Sektor etterrapport');
  expect(jsonPreview.value).not.toMatch(/lat|lon|geometry|rawRef|marker-aar-ui|sector-aar-ui/i);
  expect(pdfPreview.value).toContain('PDF-klar utskrift / bruk nettleserens Skriv ut &gt; Lagre som PDF');
  expect(pdfPreview.value).toContain('<!doctype html>');
});

it('shows RUH/welfare follow-up summary from critical log and equipment issue in Etter UI', async () => {
  await saveMission(mission({
    id: 'm17-ruh-summary-ui',
    title: 'RUH oppfølging UI',
    createdAt: '2026-06-04T09:00:00.000Z',
    updatedAt: '2026-06-04T09:30:00.000Z',
    phase: 'etter',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde RUH oppfølging',
    externalSignals: [],
    activeChecklistIds: [],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [
      { id: 'resource-ruh-summary-ui', kind: 'equipment', status: 'blocked', createdAt: '2026-06-04T09:20:00.000Z', quantity: '1 stk', note: 'Defekt pakning' },
    ],
    fieldLogEntries: [
      {
        id: 'field-ruh-summary-ui',
        timestamp: '2026-06-04T09:10:00.000Z',
        category: 'hms-avvik',
        text: 'Nestenulykke ved pumpe',
        criticalObservation: true,
        mustBeForwarded: true,
      },
    ],
    ruhReports: [],
    welfareChecks: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={[]} />);

  await openExportDetails(/RUH og velferd/i);
  const ruhSection = await waitFor(() => {
    const section = document.querySelector('#ruh-velferd');
    expect(section).not.toBeNull();
    return section as HTMLElement;
  });
  await userEvent.click(within(ruhSection).getByRole('tab', { name: 'Eksport' }));
  const ruhFollowUp = within(ruhSection).getByRole('region', { name: /RUH\/velferd kandidater/i });
  expect(ruhFollowUp).toHaveTextContent(/Nestenulykke ved pumpe/i);
  expect(ruhFollowUp).toHaveTextContent(/Defekt pakning/i);
  expect(ruhFollowUp).toHaveTextContent(/Ikke offisiell HMS\/RUH-innsending/i);

  await openExportDetails(/Etterrapport/i);
  const afterActionSection = document.querySelector('#etterrapport') as HTMLElement | null;
  expect(afterActionSection).not.toBeNull();
  const afterActionFollowUp = within(afterActionSection!).getByRole('region', { name: /RUH\/velferd lokal gjennomgang før eksport/i });
  expect(afterActionFollowUp).toHaveTextContent(/Nestenulykke ved pumpe/i);
  expect(afterActionFollowUp).toHaveTextContent(/Defekt pakning/i);
  expect(within(afterActionFollowUp).getByRole('link', { name: /Åpne RUH\/velferd/i })).toHaveAttribute('href', '#ruh-velferd');
});

it('generates a local oppdragsmappe export with map and log artifacts', async () => {
  await saveMission(mission({
    id: 'mission-folder-ui',
    title: 'Oppdragsmappe UI',
    createdAt: '2026-06-04T09:00:00.000Z',
    updatedAt: '2026-06-04T09:30:00.000Z',
    phase: 'etter',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Lokalt område',
    externalSignals: [],
    externalSignalHistory: [],
    activeChecklistIds: [],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    fieldLogEntries: [
      { id: 'field-folder-ui', timestamp: '2026-06-04T09:10:00.000Z', category: 'observasjon', text: 'Feltlogg i oppdragsmappe', criticalObservation: false, mustBeForwarded: false, linkedMissionId: 'mission-folder-ui' },
    ],
    ruhReports: [],
    welfareChecks: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));
  localStorage.setItem(OPERATIONS_MAP_STORAGE_KEY, JSON.stringify({
    markers: [{ id: 'marker-1', missionId: 'mission-folder-ui', itemType: 'marker', kind: 'observation', label: 'Obs', point: { x: 11, y: 22 }, note: 'rawRef lat lon should not export', createdAt: '2026-06-04T09:20:00.000Z' }],
    drawings: [],
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={[]} actionCards={[]} />);
  await screen.findByRole('heading', { name: /Gjør dette først/i });
  await openExportDetails(/Samlet lokal oppdragsmappe/i);
  await userEvent.click(screen.getByRole('button', { name: /Bygg oppdragsmappe/i }));

  const markdown = await screen.findByLabelText(/Oppdragsmappe Markdown/i) as HTMLTextAreaElement;
  await userEvent.click(screen.getAllByText(/Vis forhåndsvisning/i).at(-1)!);
  const json = await screen.findByLabelText(/Oppdragsmappe JSON/i) as HTMLTextAreaElement;
  expect(json.value).toContain('Oppdragsmappe UI');
  expect(json.value).toContain('schematic-0-100-local-only');
  expect(json.value).toContain('Feltlogg i oppdragsmappe');
  expect(markdown.value).toContain('# Oppdragsmappe');
  expect(markdown.value).toContain('Oppdragsmappe UI');
  expect(json.value).not.toContain('mission-folder-ui');
  expect(json.value).not.toContain('marker-1');
  expect(json.value).not.toContain('rawRef lat lon should not export');
  expect(json.value).not.toMatch(/indexedDB|objectStore|GPSLatitude|GPSLongitude|"lat"|"lon"|"rawRef"/i);

  const auditLog = readLocalAuditLog();
  expect(auditLog.some((entry) => entry.type === 'export-created' && entry.details?.exportKind === 'mission-folder')).toBe(true);
});

it('scopes current mission dashboard, after-action and folder map outputs away from unrelated missions', async () => {
  await saveMission(mission({
    id: 'mission-scope-ui',
    title: 'Mission scoped map UI',
    createdAt: '2026-06-04T09:00:00.000Z',
    updatedAt: '2026-06-04T09:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Lokalt område',
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
  }));
  localStorage.setItem(OPERATIONS_MAP_STORAGE_KEY, JSON.stringify({
    markers: [
      { id: 'marker-scope-current', missionId: 'mission-scope-ui', itemType: 'marker', kind: 'observation', label: 'Current UI marker', point: { x: 11, y: 22 }, createdAt: '2026-06-04T09:20:00.000Z' },
      { id: 'marker-scope-wrong', missionId: 'other-mission', itemType: 'marker', kind: 'observation', label: 'Wrong UI marker', point: { x: 44, y: 55 }, createdAt: '2026-06-04T09:21:00.000Z' },
    ],
    drawings: [
      { id: 'drawing-scope-current', missionId: 'mission-scope-ui', itemType: 'drawing', kind: 'sector', label: 'Current UI sector', points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 20, y: 30 }], createdAt: '2026-06-04T09:22:00.000Z' },
      { id: 'drawing-scope-wrong', missionId: 'other-mission', itemType: 'drawing', kind: 'sector', label: 'Wrong UI sector', points: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 50, y: 60 }], createdAt: '2026-06-04T09:23:00.000Z' },
    ],
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={[]} actionCards={[]} />);

  await openMissionMode('Arbeid');
  const mapSummary = (await screen.findByRole('heading', { name: /Kart og logg/i })).closest('section');
  expect(mapSummary).not.toBeNull();
  expect(within(mapSummary!).getByText('1 markør')).toBeInTheDocument();
  expect(within(mapSummary!).getByText('1 tegning')).toBeInTheDocument();

  await openExportDetails(/Etterrapport/i);
  const afterActionSection = document.querySelector('#etterrapport') as HTMLElement | null;
  expect(afterActionSection).not.toBeNull();
  await userEvent.click(within(afterActionSection!).getByRole('button', { name: /Bygg etterrapport/i }));
  const afterActionMarkdown = await within(afterActionSection!).findByLabelText(/Etteraksjonsrapport Markdown/i) as HTMLTextAreaElement;
  expect(afterActionMarkdown.value).toContain('Current UI marker');
  expect(afterActionMarkdown.value).toContain('Current UI sector');
  expect(afterActionMarkdown.value).not.toContain('Wrong UI');

  await openExportDetails(/Samlet lokal oppdragsmappe/i);
  const folderSection = document.querySelector('#oppdragsmappe') as HTMLElement | null;
  expect(folderSection).not.toBeNull();
  await userEvent.click(within(folderSection!).getByRole('button', { name: /Bygg oppdragsmappe/i }));
  const folderMarkdown = await within(folderSection!).findByLabelText(/Oppdragsmappe Markdown/i) as HTMLTextAreaElement;
  await userEvent.click(within(folderSection!).getAllByText(/Vis forhåndsvisning/i).at(-1)!);
  const folderJson = await within(folderSection!).findByLabelText(/Oppdragsmappe JSON/i) as HTMLTextAreaElement;
  expect(folderJson.value).toContain('Current UI marker');
  expect(folderJson.value).toContain('Current UI sector');
  expect(folderJson.value).not.toContain('Wrong UI');
  expect(folderMarkdown.value).toContain('Current UI marker');
  expect(folderMarkdown.value).toContain('Current UI sector');
  expect(folderMarkdown.value).not.toContain('Wrong UI');
});


it('archives pending lessons and feedback typed without clicking the separate save button', async () => {
  await saveMission(mission({
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
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openExportDetails(/Avansert \/ dokumentasjon/i);
  await screen.findByRole('heading', { name: /Erfaringer og strukturert tilbakemelding/i });
  await userEvent.type(screen.getByLabelText(/Erfaringsoppsummering/i), 'Direkte arkivert erfaring');
  await userEvent.type(screen.getByLabelText(/Tilbakemelding utstyr/i), 'Direkte arkivert utstyrsfeedback');
  await userEvent.click(screen.getByRole('button', { name: /Fullfør og arkiver lokalt/i }));

  await waitFor(() => {
    expect(screen.getByTestId('privacy-message')).toHaveTextContent(/Oppdraget er fullført og arkivert bare lokalt/i);
  });
  await waitFor(async () => {
    const archived = await listArchivedMissions();
    expect(archived).toHaveLength(1);
    expect(archived[0]?.lessonsLearned?.summary).toBe('Direkte arkivert erfaring');
    expect(archived[0]?.feedback?.equipment).toBe('Direkte arkivert utstyrsfeedback');
  });
});

it('lets users add, filter and export a structured local field log with patient-data safeguards', async () => {
  await saveMission(mission({
    id: 'm6a-field-log-ui',
    title: 'FIG feltlogg UI',
    createdAt: '2026-06-04T08:00:00.000Z',
    updatedAt: '2026-06-04T08:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde feltlogg',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    fieldLogEntries: [
      {
        id: 'field-log-existing-ui',
        timestamp: '2026-06-04T08:40:00.000Z',
        locationText: 'Depot',
        category: 'ressursbehov',
        text: 'Trenger ekstra lysmast',
        criticalObservation: false,
        mustBeForwarded: true,
      },
    ],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openWorkDetails(/Feltlogg/i);
  expect(await screen.findByRole('heading', { name: /Lokal feltlogg/i })).toBeInTheDocument();
  expect(screen.getAllByText(/Ikke offisiell logg/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/ikke registrer navn, ID, fødselsdato, fødselsnummer, diagnose, behandling, journal, helseopplysninger eller pasientdata/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Trenger ekstra lysmast/i).length).toBeGreaterThan(0);

  await userEvent.clear(screen.getByLabelText(/Feltlogg tidspunkt/i));
  await userEvent.type(screen.getByLabelText(/Feltlogg tidspunkt/i), '2026-06-04T09:05');
  await userEvent.type(screen.getByLabelText(/Feltlogg lokasjon/i), 'Sperrepunkt A');
  await userEvent.selectOptions(screen.getByLabelText(/Feltlogg kategori/i), 'observasjon');
  await userEvent.type(screen.getByLabelText(/Feltlogg tekst/i), 'Vannstand stiger ved bekk');
  await userEvent.click(screen.getByRole('checkbox', { name: /Kritisk observasjon/i }));
  await userEvent.click(screen.getByRole('checkbox', { name: /Må videresendes/i }));
  const expectedFieldLogTimestamp = new Date('2026-06-04T09:05').toISOString();
  await userEvent.click(screen.getByRole('button', { name: /Legg til feltlogg/i }));

  await waitFor(async () => {
    const [mission] = await listMissions();
    expect(mission.fieldLogEntries.map((entry) => entry.text)).toEqual(expect.arrayContaining(['Trenger ekstra lysmast', 'Vannstand stiger ved bekk']));
    expect(mission.fieldLogEntries.find((entry) => entry.text === 'Vannstand stiger ved bekk')).toMatchObject({
      timestamp: expectedFieldLogTimestamp,
      locationText: 'Sperrepunkt A',
      category: 'observasjon',
      criticalObservation: true,
      mustBeForwarded: true,
    });
  });

  expect(screen.getAllByText(/Sperrepunkt A/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Kritisk observasjon/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Må videresendes/i).length).toBeGreaterThan(0);

  const fieldLogTimeline = screen.getByRole('heading', { name: /Feltlogg tidslinje/i }).closest('div')?.parentElement;
  expect(fieldLogTimeline).not.toBeNull();
  await userEvent.type(screen.getByLabelText(/Søk i feltlogg/i), 'vannstand');
  expect(within(fieldLogTimeline!).getByText(/Vannstand stiger ved bekk/i)).toBeInTheDocument();
  await waitFor(() => expect(within(fieldLogTimeline!).queryByText(/Trenger ekstra lysmast/i)).not.toBeInTheDocument());
  await userEvent.selectOptions(screen.getByLabelText(/Filtrer feltloggkategori/i), 'observasjon');
  expect(within(fieldLogTimeline!).getByText(/Vannstand stiger ved bekk/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Lag feltlogg Markdown/i }));
  await userEvent.click(screen.getByRole('button', { name: /Lag feltlogg JSON/i }));
  await userEvent.click(screen.getByRole('button', { name: /Lag PDF-klar feltlogg/i }));
  for (const summary of screen.getAllByText(/Vis forhåndsvisning/i).slice(-3)) {
    await userEvent.click(summary);
  }

  const markdownPreview = screen.getByLabelText(/Feltlogg Markdown/i) as HTMLTextAreaElement;
  const jsonPreview = screen.getByLabelText(/Feltlogg JSON/i) as HTMLTextAreaElement;
  const pdfPreview = screen.getByLabelText(/PDF-klar feltlogg HTML/i) as HTMLTextAreaElement;
  expect(markdownPreview.value).toContain('# Lokal feltlogg');
  expect(markdownPreview.value).toContain('Vannstand stiger ved bekk');
  expect(markdownPreview.value).toContain('ikke registrer navn, ID, fødselsdato');
  const exportedFieldLogJson = JSON.parse(jsonPreview.value);
  expect(exportedFieldLogJson.mission.id).toBeUndefined();
  expect(exportedFieldLogJson.entries[0].id).toBeUndefined();
  expect(exportedFieldLogJson.entries[0].linkedMissionId).toBeUndefined();
  expect(jsonPreview.value).not.toMatch(/indexedDB|objectStore/i);
  expect(pdfPreview.value).toContain('<!doctype html>');
  expect(pdfPreview.value).toContain('Skriv ut &gt; Lagre som PDF');
});

it('blocks sensitive field-log text in the UI before saving locally', async () => {
  await saveMission(mission({ id: 'field-log-sensitive-ui', title: 'Sensitive field log UI' }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openWorkDetails(/Feltlogg/i);
  await screen.findByRole('heading', { name: /Lokal feltlogg/i });
  await userEvent.type(screen.getByLabelText(/Feltlogg tekst/i), 'pasient Ola Nordmann');
  await userEvent.click(screen.getByRole('button', { name: /Legg til feltlogg/i }));

  const alert = await screen.findByRole('alert', { name: /feltlogg personvern/i });
  expect(alert).toHaveTextContent(/persondata|pasientdata|skjermet/i);
  expect(alert).not.toHaveTextContent(/Ola Nordmann/i);
  await waitFor(async () => {
    const [storedMission] = await listMissions();
    expect(storedMission.fieldLogEntries).toEqual([]);
  });
});

it('lets users add local RUH reports, welfare checks and see media/man-down safety notes', async () => {
  await saveMission(mission({
    id: 'm6b-ruh-welfare-ui',
    title: 'FIG RUH velferd UI',
    createdAt: '2026-06-04T08:00:00.000Z',
    updatedAt: '2026-06-04T08:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde RUH',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    fieldLogEntries: [],
    ruhReports: [],
    welfareChecks: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openExportDetails(/RUH og velferd/i);
  expect(await screen.findByRole('heading', { name: /RUH og velferd/i })).toBeInTheDocument();
  expect(screen.getByText(/Lokal registrering og eksport/i)).toBeInTheDocument();
  expect(screen.getAllByText(/ikke offisiell HMS\/RUH-innsending/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Belastning og velferd/i)).not.toBeInTheDocument();
  await userEvent.click(screen.getByText(/MVP-notater/i));
  expect(screen.getByText(/Foto\/video-vedlegg er utsatt i MVP/i)).toBeInTheDocument();
  expect(screen.getByText(/EXIF\/GPS-metadata/i)).toBeInTheDocument();
  expect(screen.getByText(/sikkerhetskritisk post-MVP/i)).toBeInTheDocument();

  await userEvent.clear(screen.getByLabelText(/RUH tidspunkt/i));
  await userEvent.type(screen.getByLabelText(/RUH tidspunkt/i), '2026-06-04T09:10');
  await userEvent.selectOptions(screen.getByLabelText(/RUH kategori/i), 'nestenulykke');
  await userEvent.type(screen.getByLabelText(/Hva skjedde/i), 'Nesten fall ved glatt dekke');
  await userEvent.type(screen.getByLabelText(/Umiddelbart tiltak/i), 'Strødd og sperret lokalt');
  await userEvent.selectOptions(screen.getByLabelText(/RUH risiko/i), 'hoy');
  await userEvent.click(screen.getByRole('checkbox', { name: /RUH trenger videre tiltak/i }));
  await userEvent.click(screen.getByRole('button', { name: /Legg til RUH/i }));

  await waitFor(async () => {
    const [mission] = await listMissions();
    expect(mission.ruhReports[0]).toMatchObject({
      category: 'nestenulykke',
      whatHappened: 'Nesten fall ved glatt dekke',
      immediateMeasure: 'Strødd og sperret lokalt',
      risk: 'hoy',
      followUpNeeded: true,
    });
  });
  expect(screen.getAllByText(/Nesten fall ved glatt dekke/i).length).toBeGreaterThan(0);

  const ruhSection = document.querySelector('#ruh-velferd') as HTMLElement | null;
  expect(ruhSection).not.toBeNull();
  await userEvent.click(within(ruhSection!).getByRole('tab', { name: 'Eksport' }));
  await userEvent.click(within(ruhSection!).getByRole('button', { name: /Lag RUH Markdown/i }));
  await userEvent.click(within(ruhSection!).getByText(/JSON eksport/i));
  await userEvent.click(within(ruhSection!).getByRole('button', { name: /Lag RUH JSON/i }));
  const ruhMarkdownPreview = within(ruhSection!).getByLabelText(/RUH Markdown/i) as HTMLTextAreaElement;
  const ruhJsonPreview = within(ruhSection!).getByLabelText(/RUH JSON/i) as HTMLTextAreaElement;
  expect(ruhMarkdownPreview.value).toContain('# Lokal forenklet RUH');
  expect(ruhMarkdownPreview.value).toContain('Ikke offisiell HMS/RUH-innsending');
  expect(ruhMarkdownPreview.value).toContain('Nesten fall ved glatt dekke');
  expect(ruhMarkdownPreview.value).not.toContain('m6b-ruh-welfare-ui');
  const exportedRuhJson = JSON.parse(ruhJsonPreview.value);
  expect(exportedRuhJson.mission.id).toBeUndefined();
  expect(exportedRuhJson.reports[0].linkedMissionId).toBeUndefined();
  expect(ruhJsonPreview.value).not.toMatch(/indexedDB|objectStore|Exif|GPSLatitude|GPSLongitude/i);
  expect(readLocalAuditLog().some((entry) => entry.details.exportKind === 'ruh-markdown')).toBe(true);
  expect(readLocalAuditLog().some((entry) => entry.details.exportKind === 'ruh-json')).toBe(true);

  await userEvent.click(within(ruhSection!).getByRole('tab', { name: 'Velferd' }));
  await userEvent.selectOptions(within(ruhSection!).getByLabelText(/Fysisk belastning/i), 'hoy');
  await userEvent.selectOptions(within(ruhSection!).getByLabelText(/Mental belastning/i), 'moderat');
  await userEvent.click(within(ruhSection!).getByRole('checkbox', { name: /Trenger hvile/i }));
  await userEvent.click(within(ruhSection!).getByRole('checkbox', { name: /Trenger avløsning/i }));
  await userEvent.click(within(ruhSection!).getByRole('checkbox', { name: /Vann påminnelse/i }));
  await userEvent.click(within(ruhSection!).getByRole('checkbox', { name: /Mat påminnelse/i }));
  await userEvent.click(within(ruhSection!).getByRole('checkbox', { name: /Varme påminnelse/i }));
  await userEvent.click(within(ruhSection!).getByRole('checkbox', { name: /Hvile påminnelse/i }));
  await userEvent.click(within(ruhSection!).getByRole('checkbox', { name: /Tørt tøy påminnelse/i }));
  await userEvent.type(within(ruhSection!).getByLabelText(/Velferdsnotat/i), 'Lang innsats, planlegg pause');
  await userEvent.click(within(ruhSection!).getByRole('button', { name: /Lagre velferdssjekk/i }));

  await waitFor(async () => {
    const [mission] = await listMissions();
    expect(mission.welfareChecks[0]).toMatchObject({
      physicalLoad: 'hoy',
      mentalLoad: 'moderat',
      needsRest: true,
      needsRelief: true,
    });
  });
  expect(screen.getAllByText(/Fysisk: Høy/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Lang innsats, planlegg pause/i).length).toBeGreaterThan(0);

  await userEvent.click(within(ruhSection!).getByRole('tab', { name: 'Eksport' }));
  await userEvent.click(within(ruhSection!).getByRole('button', { name: /Lag velferd Markdown/i }));
  await userEvent.click(within(ruhSection!).getByText(/JSON eksport/i));
  await userEvent.click(within(ruhSection!).getByRole('button', { name: /Lag velferd JSON/i }));
  const welfareMarkdownPreview = within(ruhSection!).getByLabelText(/Velferd Markdown/i) as HTMLTextAreaElement;
  expect(welfareMarkdownPreview.value).toContain('# Lokal velferds- og belastningssjekk');
  expect(welfareMarkdownPreview.value).toContain('Ikke medisinsk vurdering');
  expect(welfareMarkdownPreview.value).toContain('Trenger avløsning');
  expect(readLocalAuditLog().some((entry) => entry.details.exportKind === 'welfare-markdown')).toBe(true);
  expect(readLocalAuditLog().some((entry) => entry.details.exportKind === 'welfare-json')).toBe(true);
});

it('blocks sensitive RUH and structured feedback text in the UI before saving locally', async () => {
  await saveMission(mission({ id: 'ruh-feedback-sensitive-ui', title: 'Sensitive RUH feedback UI' }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openExportDetails(/RUH og velferd/i);
  await screen.findByRole('heading', { name: /RUH og velferd/i });
  await userEvent.type(screen.getByLabelText(/Hva skjedde/i), 'fødselsnummer 01017012345');
  await userEvent.type(screen.getByLabelText(/Umiddelbart tiltak/i), 'Sperret av område');
  await userEvent.click(screen.getByRole('button', { name: /Legg til RUH/i }));

  const ruhAlert = await screen.findByRole('alert', { name: /ruh personvern/i });
  expect(ruhAlert).toHaveTextContent(/persondata|pasientdata|skjermet/i);
  expect(ruhAlert).not.toHaveTextContent(/01017012345/i);
  await waitFor(async () => {
    const [storedMission] = await listMissions();
    expect(storedMission.ruhReports).toEqual([]);
  });

  await openExportDetails(/Avansert \/ dokumentasjon/i);
  await userEvent.type(screen.getByLabelText(/Erfaringsoppsummering/i), 'skjermet tilfluktsrom adresse');
  await userEvent.click(screen.getByRole('button', { name: /Lagre erfaringer og tilbakemelding/i }));

  const lessonsAlert = await screen.findByRole('alert', { name: /erfaringer personvern/i });
  expect(lessonsAlert).toHaveTextContent(/private lokasjoner|skjermet/i);
  expect(lessonsAlert).not.toHaveTextContent(/tilfluktsrom adresse/i);
  await waitFor(async () => {
    const [storedMission] = await listMissions();
    expect(storedMission.lessonsLearned).toBeUndefined();
  });
});

it('shows a situation-first mission dashboard with next action, progress and exports', async () => {
  await saveMission(mission({
    id: 'm-command-surface',
    title: 'Flom Jaren',
    createdAt: '2026-06-04T12:00:00.000Z',
    updatedAt: '2026-06-04T12:32:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'flom',
    locationText: 'Jaren',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));

  const flomCards = [{
    slug: 'flom-pumpe-start',
    title: 'Flom og pumpeutlegg',
    phase: 'under',
    roles: ['lagforer'],
    scenarios: ['flom'],
    priority: 'high',
    steps: ['Etabler sikkerhet', 'Bekreft samband', 'Fordel roller'],
    safety: [],
    reporting: [],
    sourceIds: ['src-flom'],
    competenceRequired: [],
  }] satisfies ActionCard[];

  await renderMissionPanel(<MissionContextPanel
    contentVersion="test-v1"
    checklists={[{
      ...checklists[0],
      slug: 'fig-under-innsats',
      phase: 'under',
      scenarios: ['flom'],
      items: [{ id: 'sikkerhet', label: 'Etabler sikkerhet', required: true, sourceIds: ['src-flom'] }],
    }]}
    actionCards={flomCards}
  />);

  expect(await screen.findByRole('heading', { name: 'Oppdrag' })).toBeInTheDocument();
  expect(screen.getByText(/Flom Jaren · Jaren/i)).toBeInTheDocument();
  expect(screen.getByText(/Lokal lagring · Ikke delt/i)).toBeInTheDocument();
  const modeControl = screen.getByRole('tablist', { name: /Oppdragsmodus/i });
  expect(within(modeControl).getByRole('tab', { name: 'Nå' })).toHaveAttribute('aria-selected', 'true');
  const nextActionSection = screen.getByRole('heading', { name: /Gjør dette først/i }).closest('section');
  expect(nextActionSection).not.toBeNull();
  expect(within(nextActionSection!).getByText(/Etabler sikkerhet/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /^Kritisk nå$/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Fremdrift/i })).toBeInTheDocument();
  const nowText = document.body.textContent ?? '';
  expect(nowText.indexOf('Oppdrag')).toBeLessThan(nowText.indexOf('Gjør dette først'));
  expect(nowText.indexOf('Gjør dette først')).toBeLessThan(nowText.indexOf('Kritisk nå'));
  expect(nowText.indexOf('Kritisk nå')).toBeLessThan(nowText.indexOf('Fremdrift'));
  expect(screen.queryByRole('heading', { name: /Hurtighandlinger/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /Kart og logg/i })).not.toBeInTheDocument();
  expect(screen.queryByText('Avansert / dokumentasjon')).not.toBeInTheDocument();

  await openMissionMode('Arbeid');
  expect(document.getElementById('sjekkliste')).not.toBeNull();
  expect(document.getElementById('kart')).not.toBeNull();
  expect(screen.queryByText('Avansert / dokumentasjon')).not.toBeInTheDocument();

  await openMissionMode('Eksport');
  expect(screen.getAllByText(/Ordre, samband og status/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/RUH og velferd/i).length).toBeGreaterThan(0);
  const advancedDetails = screen.getByText('Avansert / dokumentasjon').closest('details') as HTMLDetailsElement | null;
  expect(advancedDetails?.open).toBe(false);
  act(() => {
    window.history.pushState(null, '', '#ruh-velferd');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await waitFor(() => {
    const ruhTarget = document.getElementById('ruh-velferd');
    expect(ruhTarget).not.toBeNull();
    expect((ruhTarget?.closest('details') as HTMLDetailsElement | null)?.open).toBe(true);
  });
  expect(within(modeControl).getByRole('tab', { name: 'Eksport' })).toHaveAttribute('aria-selected', 'true');
});

it('shows map and field-log summary on the mission dashboard', async () => {
  await saveMission(mission({
    id: 'm6-map-summary-dashboard',
    title: 'Kart på oppdragstavle',
    createdAt: '2026-06-04T09:00:00.000Z',
    updatedAt: '2026-06-04T09:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde kart',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    fieldLogEntries: [
      {
        id: 'field-log-map-dashboard',
        timestamp: '2026-06-04T09:25:00.000Z',
        category: 'observasjon',
        text: 'Kartkoblet observasjon for tavla',
        mapReference: {
          source: 'map-marker',
          objectId: 'marker-dashboard',
          label: 'KO lokal',
          point: { x: 22, y: 33 },
        },
        criticalObservation: true,
        mustBeForwarded: true,
      },
    ],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));
  localStorage.setItem(OPERATIONS_MAP_STORAGE_KEY, JSON.stringify({
    markers: [{ id: 'marker-dashboard', missionId: 'm6-map-summary-dashboard', itemType: 'marker', kind: 'il-ko', label: 'KO lokal', point: { x: 22, y: 33 }, createdAt: '2026-06-04T09:15:00.000Z' }],
    drawings: [],
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openMissionMode('Arbeid');
  expect(await screen.findByRole('heading', { name: /Kart og logg/i })).toBeInTheDocument();
  expect(screen.getAllByText(/kartkoblet logg/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('link', { name: /Åpne kart/i })).toHaveAttribute('href', '/kart');
});

it('shows saved active checklist progress on the mission dashboard', async () => {
  await saveMission(mission({
    id: 'm-command-checklist-progress',
    title: 'Sjekkliste fremdrift',
    createdAt: '2026-06-04T09:00:00.000Z',
    updatedAt: '2026-06-04T09:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'flom',
    locationText: 'Innsatsområde fremdrift',
    activeChecklistIds: ['fig-under-innsats'],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));
  await saveChecklistRun({
    id: 'm-command-checklist-progress:fig-under-innsats',
    missionId: 'm-command-checklist-progress',
    templateSlug: 'fig-under-innsats',
    checkedItemIds: ['sikkerhet'],
    notesByItemId: {},
    equipmentStatusByItemId: {},
    updatedAt: '2026-06-04T09:35:00.000Z',
    schemaVersion: 1,
  });

  await renderMissionPanel(<MissionContextPanel
    contentVersion="test-v1"
    checklists={[{
      ...checklists[0],
      slug: 'fig-under-innsats',
      phase: 'under',
      scenarios: ['flom'],
      items: [
        { id: 'sikkerhet', label: 'Etabler sikkerhet', required: true, sourceIds: ['src-flom'] },
        { id: 'samband', label: 'Bekreft samband', required: true, sourceIds: ['src-flom'] },
      ],
    }]}
  />);

  expect(await screen.findByText(/1\/2 punkter fullført/i)).toBeInTheDocument();
});

it('shows local manual order-update suggestions from important field-log entries', async () => {
  await saveMission(mission({
    id: 'm6-order-suggestions-ui',
    title: 'Flom ordre forslag',
    createdAt: '2026-06-04T09:00:00.000Z',
    updatedAt: '2026-06-04T09:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'flom',
    locationText: 'Innsatsområde nord',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    fieldLogEntries: [
      {
        id: 'field-log-order-suggestion',
        timestamp: '2026-06-04T09:05:00.000Z',
        category: 'vaer-fare',
        text: 'Flomvei stengt',
        criticalObservation: true,
        mustBeForwarded: true,
      },
    ],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openMissionMode('Arbeid');
  const orderSuggestionPanel = await screen.findByRole('region', { name: /Forslag til manuell ordreoppdatering/i });
  expect(orderSuggestionPanel).toHaveTextContent(/Dette endrer ikke ordre/i);
  expect(within(orderSuggestionPanel).getByText(/Flomvei stengt/i)).toBeInTheDocument();
});

it('shows a fallback next action when the matching action card has no steps', async () => {
  await saveMission(mission({
    id: 'm-command-surface-empty-step',
    title: 'Flom uten steg',
    createdAt: '2026-06-04T12:00:00.000Z',
    updatedAt: '2026-06-04T12:32:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'flom',
    locationText: 'Jaren',
    externalSignals: [],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));

  await renderMissionPanel(<MissionContextPanel
    contentVersion="test-v1"
    checklists={[{
      ...checklists[0],
      slug: 'fig-under-innsats',
      phase: 'under',
      scenarios: ['flom'],
      items: [{ id: 'sikkerhet', label: 'Etabler sikkerhet', required: true, sourceIds: ['src-flom'] }],
    }]}
    actionCards={[{
      slug: 'flom-uten-steg',
      title: 'Flom uten steg',
      phase: 'under',
      roles: ['lagforer'],
      scenarios: ['flom'],
      priority: 'high',
      steps: [],
      safety: [],
      reporting: [],
      sourceIds: ['src-flom'],
      competenceRequired: [],
    }]}
  />);

  const nextActionSection = (await screen.findByRole('heading', { name: /Gjør dette først/i })).closest('section');
  expect(nextActionSection).not.toBeNull();
  expect(within(nextActionSection!).getByText(/Åpne sjekklisten og bekreft fase, samband og sikkerhet/i)).toBeInTheDocument();
});

it('shows current situation and lets users add local tasks, quick status and resource requests', async () => {
  await saveMission(mission({
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
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openWorkDetails(/Loggoversikt og lokale oppgaver/i);
  expect(await screen.findByRole('heading', { name: /Situasjonsoversikt nå/i })).toBeInTheDocument();
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
  await saveMission(mission({
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
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);
  await openWorkDetails(/Loggoversikt og lokale oppgaver/i);
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
  await saveMission(mission({
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
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openExportDetails(/Avansert \/ dokumentasjon/i);
  await screen.findByText(/Viser sist vellykkede lokale kontekstsignal som stale/i);
  expect(screen.getByText(/Gammelt regnvarsel: Lagret sammendrag \(stale\)/i)).toBeInTheDocument();
  expect(screen.queryByText(/Gammelt regnvarsel: Lagret sammendrag \(fresh\)/i)).not.toBeInTheDocument();

  await openExportDetails(/Lokal statusrapport/i);
  await userEvent.click(screen.getByRole('button', { name: /Lag lokal statusrapport/i }));
  await userEvent.click(screen.getByText(/Vis forhåndsvisning/i));
  const preview = screen.getByLabelText(/Lokal statusrapport/i) as HTMLTextAreaElement;
  expect(preview.value).toContain('Gammelt regnvarsel: Lagret sammendrag (met, yellow, stale)');
  expect(preview.value).toContain('Gammelt vindvarsel: Lagret sammendrag to (met, yellow, stale)');
  expect(preview.value).not.toContain('(met, yellow, fresh)');
});

it('keeps disabled-source last-known-good mission context visibly stale, not active fresh', async () => {
  localStorage.setItem(EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY, JSON.stringify({ kartverket: true, met: false, nve: true }));
  await saveMission(mission({
    id: 'm2b-disabled-met-stale',
    title: 'FIG disabled MET signal',
    createdAt: '2026-06-03T08:00:00.000Z',
    updatedAt: '2026-06-03T08:30:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Innsatsområde øst',
    externalSignals: [
      { source: 'met', kind: 'weather', severity: 'yellow', title: 'Lagret MET-varsel', summary: 'Sist vellykket', validFrom: null, validTo: null, fetchedAt: '2026-06-01T08:00:00.000Z', staleness: 'fresh', rawRef: 'met:disabled' },
    ],
    activeChecklistIds: ['fig-under-innsats'],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openExportDetails(/Avansert \/ dokumentasjon/i);
  expect(await screen.findByText(/met utilgjengelig eller avslått lokalt/i)).toBeInTheDocument();
  expect(screen.getByText(/Lagret MET-varsel: Sist vellykket \(stale\)/i)).toBeInTheDocument();
  expect(screen.queryByText(/Lagret MET-varsel: Sist vellykket \(fresh\)/i)).not.toBeInTheDocument();
});

it('shows disabled context sources even when no signals exist', async () => {
  localStorage.setItem(EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY, JSON.stringify({ kartverket: false, met: false, nve: false }));
  await saveMission(mission({
    id: 'm2b-disabled-zero-signals',
    title: 'FIG disabled sources without signals',
    externalSignals: [],
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openExportDetails(/Avansert \/ dokumentasjon/i);
  const panel = await screen.findByRole('region', { name: /offentlig kontekst/i });
  expect(panel).toHaveTextContent(/ingen ferske offentlige kontekstsignaler/i);
  expect(panel).toHaveTextContent(/kartverket.*utilgjengelig eller avslått lokalt/i);
  expect(panel).toHaveTextContent(/met.*utilgjengelig eller avslått lokalt/i);
  expect(panel).toHaveTextContent(/nve.*utilgjengelig eller avslått lokalt/i);
});

it('lets users save structured lessons and feedback before locally completing and archiving a mission', async () => {
  await saveMission(mission({
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
  }));

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await openExportDetails(/Avansert \/ dokumentasjon/i);
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
  expect(await screen.findByRole('heading', { name: /Ingen aktiv lokal tavle/i })).toBeInTheDocument();
  expect(await screen.findByText(/FIG arkiverbar innsats/)).toBeInTheDocument();
});

it('supports local archive search, deleting one archived mission and clearing the archive without deleting active missions', async () => {
  await saveMission(mission({
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
  }));
  await saveMission(mission({
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
  }));
  await saveMission(mission({
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
  }));
  await archiveMission('m2c3-archive-search-ui', { archivedAt: '2026-06-03T11:30:00.000Z' });
  await archiveMission('m2c3-archive-miss-ui', { archivedAt: '2026-06-03T10:30:00.000Z' });

  await renderMissionPanel(<MissionContextPanel contentVersion="test-v1" checklists={checklists} />);

  await screen.findByText(/Arkiv sambandstreff/);
  expect(screen.getByText(/Arkiv materiell/)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/Søk i lokalt arkiv/i), 'radio');
  await waitFor(() => expect(screen.queryByText(/Arkiv materiell/)).not.toBeInTheDocument());
  expect(screen.getByText(/Arkiv sambandstreff/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Tøm lokalt arkiv/i })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: /Slett arkivert oppdrag Arkiv sambandstreff/i }));
  await waitFor(() => expect(screen.queryByText(/Arkiv sambandstreff/)).not.toBeInTheDocument());
  await waitFor(async () => expect((await listArchivedMissions()).map((item) => item.id)).toEqual(['m2c3-archive-miss-ui']));

  await userEvent.clear(screen.getByLabelText(/Søk i lokalt arkiv/i));
  await screen.findByText(/Arkiv materiell/);
  await userEvent.click(screen.getByRole('button', { name: /Tøm lokalt arkiv/i }));
  await waitFor(() => expect(screen.getByTestId('privacy-message')).toHaveTextContent(/Lokalt arkiv er tømt/i));
  await waitFor(async () => expect(await listArchivedMissions()).toEqual([]));
  expect((await listMissions()).map((mission) => mission.id)).toContain('m2c3-active-kept-ui');
});
