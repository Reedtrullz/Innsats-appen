import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  // Skipped is distinguishable from done by text, not colour alone (a11y).
  expect(await screen.findByText('Hoppet over')).toBeInTheDocument();
});

it('shows a per-step source-trust indicator for the current step', async () => {
  await seedActiveMission();
  render(<RunbookView checklists={checklists} sourceRiskById={{ 'src-5-punktsordre': 'caution' }} />);
  await flushAsyncEffects();

  // First step links src-5-punktsordre (flagged caution) and auto-expands as "now".
  expect(await screen.findByText(/Vær varsom/)).toBeInTheDocument();
});

it('compact "Nå" shows only the active step and the next couple, not the whole list', async () => {
  const longChecklists = [
    {
      ...checklists[0],
      items: [
        { id: 's1', label: 'Steg en aktiv', required: true, sourceIds: [] },
        { id: 's2', label: 'Steg to neste', required: true, sourceIds: [] },
        { id: 's3', label: 'Steg tre neste', required: true, sourceIds: [] },
        { id: 's4', label: 'Steg fire skjult', required: true, sourceIds: [] },
        { id: 's5', label: 'Steg fem skjult', required: true, sourceIds: [] },
      ],
    },
  ] as OperationalChecklist[];
  await seedActiveMission();
  render(<RunbookView checklists={longChecklists} compact />);
  await flushAsyncEffects();

  // Active + next two are visible; the rest stay on the full board ("Arbeid").
  expect(await screen.findByText('Steg en aktiv')).toBeInTheDocument();
  expect(screen.getByText('Steg to neste')).toBeInTheDocument();
  expect(screen.getByText('Steg tre neste')).toBeInTheDocument();
  expect(screen.queryByText('Steg fire skjult')).not.toBeInTheDocument();
  expect(screen.queryByText('Steg fem skjult')).not.toBeInTheDocument();
  expect(screen.getByText(/2 flere steg/i)).toBeInTheDocument();
});

it('lets the user reopen (undo) a completed step', async () => {
  await seedActiveMission();
  render(<RunbookView checklists={checklists} />);
  await flushAsyncEffects();

  await userEvent.click(await screen.findByRole('button', { name: /Gjort · neste/i }));
  await waitFor(async () => {
    const [runRecord] = await listChecklistRuns('m-runbook');
    expect(runRecord?.checkedItemIds).toContain('ordre');
  });
  // Wait for the reload to settle (the step renders its "Gjort" badge) before
  // interacting, so the undo affordance is present.
  await screen.findByText('Gjort');

  // Expand the now-completed step and undo it back to active.
  await userEvent.click(screen.getByText('Bekreft ordre og sikkerhet'));
  await userEvent.click(await screen.findByRole('button', { name: /Angre/i }));

  await waitFor(async () => {
    const [runRecord] = await listChecklistRuns('m-runbook');
    expect(runRecord?.checkedItemIds ?? []).not.toContain('ordre');
    expect(runRecord?.skippedItemIds ?? []).not.toContain('ordre');
  });
});

it('serializes rapid progress choices so the latest explicit choice wins', async () => {
  await seedActiveMission();
  render(<RunbookView checklists={checklists} />);
  await flushAsyncEffects();

  const doneButton = await screen.findByRole('button', { name: /Gjort · neste/i });
  const skipButton = screen.getByRole('button', { name: /Hopp over/i });
  fireEvent.click(doneButton);
  fireEvent.click(skipButton);

  await waitFor(async () => {
    const [runRecord] = await listChecklistRuns('m-runbook');
    expect(runRecord?.checkedItemIds ?? []).not.toContain('ordre');
    expect(runRecord?.skippedItemIds ?? []).toContain('ordre');
  });
});
