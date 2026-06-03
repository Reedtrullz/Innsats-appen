import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { ChecklistRunner } from '@/components/checklist-runner';
import { clearLocalMissionData, getChecklistRun } from '@/lib/mission/local-store';
import type { OperationalChecklist } from '@/lib/content/schemas';

afterEach(async () => clearLocalMissionData());

const checklist = { slug: 'tilfluktsrom-teknisk-status', title: 'Tilfluktsrom teknisk status', phase: 'for', roles: ['beredskapsvakt'], scenarios: ['tilfluktsrom'], sourceIds: ['src-deep-research-tilfluktsrom'], warning: 'bruk bare godkjent informasjon', items: [{ id: 'ventilasjon', label: 'Kontroller ventilasjon', required: true, sourceIds: ['src-deep-research-tilfluktsrom'] }] } as OperationalChecklist;

it('renders required items, source links, and persists checked state', async () => {
  render(<ChecklistRunner checklist={checklist} missionId="mission-1" />);
  const checkbox = screen.getByRole('checkbox', { name: /Kontroller ventilasjon/i });
  expect(checkbox).toBeInTheDocument();
  expect(screen.getByText('0/1 fullført')).toBeInTheDocument();
  expect(screen.getByText(/Påkrevd: 0\/1 kontrollert/i)).toBeInTheDocument();
  expect(screen.getAllByText(/src-deep-research-tilfluktsrom/i).length).toBeGreaterThan(0);
  await userEvent.click(checkbox);
  expect(screen.getByText('1/1 fullført')).toBeInTheDocument();
  expect((await getChecklistRun('mission-1:tilfluktsrom-teknisk-status'))?.checkedItemIds).toContain('ventilasjon');
});
