import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { ChecklistRunner } from '@/components/checklist-runner';
import { clearLocalMissionData, getChecklistRun, saveChecklistRun } from '@/lib/mission/local-store';
import type { OperationalChecklist } from '@/lib/content/schemas';

afterEach(async () => clearLocalMissionData());

const checklist = { slug: 'tilfluktsrom-teknisk-status', title: 'Tilfluktsrom teknisk status', phase: 'for', roles: ['beredskapsvakt'], scenarios: ['tilfluktsrom'], sourceIds: ['src-operativt-konsept-for-sivilforsvaret'], warning: 'bruk bare godkjent informasjon', items: [{ id: 'ventilasjon', label: 'Kontroller ventilasjon', required: true, sourceIds: ['src-operativt-konsept-for-sivilforsvaret'] }] } as OperationalChecklist;

const equipmentChecklist = {
  slug: 'mbk-kjoretoy',
  title: 'MBK kjøretøy',
  phase: 'for',
  roles: ['materiellansvarlig'],
  scenarios: ['generelt'],
  equipmentRequired: ['kjoretoy'],
  sourceIds: ['src-sjekkliste-fig-og-figp'],
  warning: 'Kun lokal MBK-status uten persondata.',
  items: [{ id: 'status-kontrollert', label: 'Status kontrollert', required: true, sourceIds: ['src-sjekkliste-fig-og-figp'] }],
} as OperationalChecklist;

it('renders required items, source links, and persists checked state with local item notes', async () => {
  const { unmount } = render(<ChecklistRunner checklist={checklist} missionId="mission-1" />);
  const checkbox = screen.getByRole('checkbox', { name: /Kontroller ventilasjon/i });
  expect(checkbox).toBeInTheDocument();
  await waitFor(() => expect(checkbox).toBeEnabled());
  expect(screen.getByText('0/1 fullført')).toBeInTheDocument();
  expect(screen.getByText(/Påkrevd: 0\/1 kontrollert/i)).toBeInTheDocument();
  // P1-3: source IDs render resolved/prefix-stripped, never as raw src- tokens.
  expect(screen.getAllByText(/operativt-konsept-for-sivilforsvaret/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/\bsrc-/)).toBeNull();
  await userEvent.click(checkbox);
  expect(screen.getByText('1/1 fullført')).toBeInTheDocument();
  await waitFor(async () => expect((await getChecklistRun('mission-1:tilfluktsrom-teknisk-status'))?.checkedItemIds).toContain('ventilasjon'));
  const notes = screen.getByLabelText(/Lokal note for Kontroller ventilasjon/i);
  await userEvent.type(notes, 'Filter mangler lokalt');
  expect((await getChecklistRun('mission-1:tilfluktsrom-teknisk-status'))?.notesByItemId.ventilasjon).toBeUndefined();
  fireEvent.blur(notes);
  await waitFor(async () => expect((await getChecklistRun('mission-1:tilfluktsrom-teknisk-status'))?.notesByItemId.ventilasjon).toBe('Filter mangler lokalt'));

  unmount();
  render(<ChecklistRunner checklist={checklist} missionId="mission-1" />);
  await waitFor(() => expect(screen.getByLabelText(/Lokal note for Kontroller ventilasjon/i)).toHaveValue('Filter mangler lokalt'));
  const run = await getChecklistRun('mission-1:tilfluktsrom-teknisk-status');
  expect(run?.checkedItemIds).toContain('ventilasjon');
  expect(run?.notesByItemId.ventilasjon).toBe('Filter mangler lokalt');
});

it('hydrates saved checklist state before edits can overwrite local data', async () => {
  await saveChecklistRun({
    id: 'mission-2:tilfluktsrom-teknisk-status',
    missionId: 'mission-2',
    templateSlug: 'tilfluktsrom-teknisk-status',
    checkedItemIds: ['ventilasjon'],
    notesByItemId: { ventilasjon: 'Tidligere lokal note' },
    updatedAt: '2026-06-02T20:10:00.000Z',
    schemaVersion: 1,
  });

  render(<ChecklistRunner checklist={checklist} missionId="mission-2" />);
  const checkbox = screen.getByRole('checkbox', { name: /Kontroller ventilasjon/i });
  const notes = screen.getByLabelText(/Lokal note for Kontroller ventilasjon/i);

  await waitFor(() => expect(checkbox).toBeEnabled());
  expect(checkbox).toBeChecked();
  expect(notes).toHaveValue('Tidligere lokal note');

  await userEvent.clear(notes);
  await userEvent.type(notes, 'Oppdatert lokal note');
  fireEvent.blur(notes);

  await waitFor(async () => expect((await getChecklistRun('mission-2:tilfluktsrom-teknisk-status'))?.notesByItemId.ventilasjon).toBe('Oppdatert lokal note'));
  const run = await getChecklistRun('mission-2:tilfluktsrom-teknisk-status');
  expect(run?.checkedItemIds).toEqual(['ventilasjon']);
});

it('hydrates and persists equipment status for equipment and MBK checklists', async () => {
  await saveChecklistRun({
    id: 'mission-3:mbk-kjoretoy',
    missionId: 'mission-3',
    templateSlug: 'mbk-kjoretoy',
    checkedItemIds: ['status-kontrollert'],
    notesByItemId: {},
    equipmentStatusByItemId: { 'status-kontrollert': 'damaged' },
    updatedAt: '2026-06-04T08:10:00.000Z',
    schemaVersion: 1,
  });

  render(<ChecklistRunner checklist={equipmentChecklist} missionId="mission-3" />);

  const statusSelect = await screen.findByLabelText(/Materiellstatus for Status kontrollert/i);
  await waitFor(() => expect(statusSelect).toBeEnabled());
  expect(statusSelect).toHaveValue('damaged');
  expect(screen.getByRole('option', { name: 'Klar' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Mangler' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Skadet' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Forbrukt' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Må vaskes' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Trenger service' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Karantene' })).toBeInTheDocument();

  await userEvent.selectOptions(statusSelect, 'needs-service');

  await waitFor(async () => expect((await getChecklistRun('mission-3:mbk-kjoretoy'))?.equipmentStatusByItemId['status-kontrollert']).toBe('needs-service'));
});

it('blocks sensitive local checklist notes before they are persisted', async () => {
  const user = userEvent.setup();
  render(<ChecklistRunner checklist={checklist} missionId="mission-sensitive-note" />);

  const checkbox = screen.getByRole('checkbox', { name: /Kontroller ventilasjon/i });
  await waitFor(() => expect(checkbox).toBeEnabled());

  const notes = screen.getByLabelText(/Lokal note for Kontroller ventilasjon/i);
  await user.type(notes, '01017000027');
  fireEvent.blur(notes);

  expect(await screen.findByRole('alert')).toHaveTextContent(/notat|persondata|pasientdata|identifikator|kontakt|private/i);
  expect((await getChecklistRun('mission-sensitive-note:tilfluktsrom-teknisk-status'))?.notesByItemId.ventilasjon).toBeUndefined();
  expect(notes).toHaveValue('');
});

it('does not persist an unsafe note draft through checkbox persistence before blur validation', async () => {
  const user = userEvent.setup();
  render(<ChecklistRunner checklist={checklist} missionId="mission-sensitive-draft-toggle" />);

  const checkbox = screen.getByRole('checkbox', { name: /Kontroller ventilasjon/i });
  await waitFor(() => expect(checkbox).toBeEnabled());

  const notes = screen.getByLabelText(/Lokal note for Kontroller ventilasjon/i);
  await user.type(notes, '01017000027');
  expect(notes).toHaveFocus();
  fireEvent.click(checkbox);

  await waitFor(async () => expect((await getChecklistRun('mission-sensitive-draft-toggle:tilfluktsrom-teknisk-status'))?.checkedItemIds).toContain('ventilasjon'));
  const run = await getChecklistRun('mission-sensitive-draft-toggle:tilfluktsrom-teknisk-status');
  expect(run?.notesByItemId.ventilasjon).toBeUndefined();
});

it('restores the previous safe checklist note when an unsafe edit is blocked', async () => {
  await saveChecklistRun({
    id: 'mission-sensitive-existing:tilfluktsrom-teknisk-status',
    missionId: 'mission-sensitive-existing',
    templateSlug: 'tilfluktsrom-teknisk-status',
    checkedItemIds: [],
    notesByItemId: { ventilasjon: 'Tidligere trygg note' },
    updatedAt: '2026-06-06T10:00:00.000Z',
    schemaVersion: 1,
  });

  const user = userEvent.setup();
  render(<ChecklistRunner checklist={checklist} missionId="mission-sensitive-existing" />);

  const notes = screen.getByLabelText(/Lokal note for Kontroller ventilasjon/i);
  await waitFor(() => expect(notes).toHaveValue('Tidligere trygg note'));

  await user.clear(notes);
  await user.type(notes, '01017000027');
  fireEvent.blur(notes);

  expect(await screen.findByRole('alert')).toHaveTextContent(/notat|persondata|pasientdata|identifikator|kontakt|private/i);
  await waitFor(() => expect(notes).toHaveValue('Tidligere trygg note'));
  expect((await getChecklistRun('mission-sensitive-existing:tilfluktsrom-teknisk-status'))?.notesByItemId.ventilasjon).toBe('Tidligere trygg note');
});

it('locks higher-role steps in the Work tab so the runbook lens cannot be bypassed', async () => {
  const { RoleProvider } = await import('@/lib/role/role-context');
  const { saveLocalProfile } = await import('@/lib/privacy/local-profile');
  saveLocalProfile({ preferredRole: 'mannskap' });

  const lensChecklist = {
    slug: 'skogbrann-under-innsats', title: 'Brann/skogbrann under innsats', phase: 'under',
    roles: ['leder', 'lagforer', 'mannskap'], scenarios: ['skogbrann'], sourceIds: ['src-tiltakskort-under-innsats'],
    items: [
      { id: 'sikkerhet', label: 'Sikkerhet avklart', required: true, sourceIds: [] },
      { id: 'planlegg-vann', label: 'Planlegg vannforsyning', required: true, sourceIds: [], minRoleGroup: 'lagforer', roleNote: 'Planlegging — vises for lagfører og leder' },
    ],
  } as unknown as OperationalChecklist;

  render(<RoleProvider><ChecklistRunner checklist={lensChecklist} missionId="mission-lens" /></RoleProvider>);

  // The crew-actionable step is a real checkbox; the planning step is locked.
  await screen.findByText('Planlegging — vises for lagfører og leder');
  expect(screen.getByRole('checkbox', { name: /Sikkerhet avklart/i })).toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: /Planlegg vannforsyning/i })).toBeNull();
  // Locked step is excluded from the role's denominator (1 actionable, not 2).
  expect(screen.getByText('0/1 fullført')).toBeInTheDocument();
  expect(screen.getByText(/Påkrevd: 0\/1 kontrollert/i)).toBeInTheDocument();
});
