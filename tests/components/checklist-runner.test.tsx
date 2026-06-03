import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { ChecklistRunner } from '@/components/checklist-runner';
import { clearLocalMissionData, getChecklistRun, saveChecklistRun } from '@/lib/mission/local-store';
import type { OperationalChecklist } from '@/lib/content/schemas';

afterEach(async () => clearLocalMissionData());

const checklist = { slug: 'tilfluktsrom-teknisk-status', title: 'Tilfluktsrom teknisk status', phase: 'for', roles: ['beredskapsvakt'], scenarios: ['tilfluktsrom'], sourceIds: ['src-deep-research-tilfluktsrom'], warning: 'bruk bare godkjent informasjon', items: [{ id: 'ventilasjon', label: 'Kontroller ventilasjon', required: true, sourceIds: ['src-deep-research-tilfluktsrom'] }] } as OperationalChecklist;

it('renders required items, source links, and persists checked state with local item notes', async () => {
  const { unmount } = render(<ChecklistRunner checklist={checklist} missionId="mission-1" />);
  const checkbox = screen.getByRole('checkbox', { name: /Kontroller ventilasjon/i });
  expect(checkbox).toBeInTheDocument();
  await waitFor(() => expect(checkbox).toBeEnabled());
  expect(screen.getByText('0/1 fullført')).toBeInTheDocument();
  expect(screen.getByText(/Påkrevd: 0\/1 kontrollert/i)).toBeInTheDocument();
  expect(screen.getAllByText(/src-deep-research-tilfluktsrom/i).length).toBeGreaterThan(0);
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
