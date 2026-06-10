import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { RunbookView } from '@/components/runbook/runbook-view';
import { clearLocalMissionData, listChecklistRuns, saveMission } from '@/lib/mission/local-store';
import { saveSelectedActiveMissionId } from '@/lib/mission/active-mission-selection';
import { buildMission } from '../helpers/mission-fixtures';
import { flushAsyncEffects } from '../helpers/react-effects';

const checklists = [
  {
    slug: 'skogbrann-under-innsats',
    title: 'Brann/skogbrann under innsats',
    phase: 'under',
    roles: ['leder'],
    scenarios: ['skogbrann', 'brann'],
    sourceIds: ['src-tiltakskort-under-innsats'],
    warning: 'Kontroller mot innsatsleders ordre.',
    items: [
      { id: 'ordre', label: 'Bekreft ordre og sikkerhet', required: true, sourceIds: ['src-5-punktsordre'] },
      { id: 'vann', label: 'Etabler vannforsyning', required: true, sourceIds: [] },
    ],
  },
] as OperationalChecklist[];

afterEach(async () => {
  await act(async () => {
    localStorage.clear();
    await clearLocalMissionData();
  });
});

async function seedActiveMission() {
  const mission = buildMission({ id: 'm-runbook', title: 'Skogbrann sektor 3', phase: 'under', scenario: 'skogbrann', role: 'leder', locationText: 'Sektor 3' });
  await saveMission(mission);
  saveSelectedActiveMissionId(mission.id);
  return mission;
}

it('shows an empty state with no active mission', async () => {
  render(<RunbookView checklists={checklists} />);
  await flushAsyncEffects();
  expect(await screen.findByText(/Ingen aktivt oppdrag/i)).toBeInTheDocument();
});

it('renders the queue and marks a step done, persisting progress locally', async () => {
  await seedActiveMission();
  render(<RunbookView checklists={checklists} />);
  await flushAsyncEffects();

  expect(await screen.findByText('Bekreft ordre og sikkerhet')).toBeInTheDocument();
  expect(screen.getByText('Etabler vannforsyning')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Gjort · neste/i }));

  await waitFor(async () => {
    const [runRecord] = await listChecklistRuns('m-runbook');
    expect(runRecord?.checkedItemIds).toContain('ordre');
    expect(runRecord?.templateSlug).toBe('skogbrann-under-innsats');
  });
});

it('persists a skipped step without marking it done', async () => {
  await seedActiveMission();
  render(<RunbookView checklists={checklists} />);
  await flushAsyncEffects();

  await userEvent.click(await screen.findByRole('button', { name: /Hopp over/i }));

  await waitFor(async () => {
    const [runRecord] = await listChecklistRuns('m-runbook');
    expect(runRecord?.skippedItemIds).toContain('ordre');
    expect(runRecord?.checkedItemIds ?? []).not.toContain('ordre');
  });
});
