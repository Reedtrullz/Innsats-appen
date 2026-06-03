import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { MissionContextPanel } from '@/components/mission-context-panel';
import { clearLocalMissionData, listMissions } from '@/lib/mission/local-store';
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
