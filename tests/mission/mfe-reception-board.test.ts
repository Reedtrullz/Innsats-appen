import {
  addMfeReceptionResourceRequest,
  buildMfeReceptionBoard,
  ensureMfeReceptionBoardTasks,
  setMfeReceptionStepStatus,
  shouldShowMfeReceptionBoard,
} from '@/lib/mission/mfe-reception-board';
import { buildMission } from '../helpers/mission-fixtures';

const now = new Date('2026-06-18T23:05:00.000Z');

it('builds a local MFE reception board from existing mission tasks and resources', () => {
  const mission = ensureMfeReceptionBoardTasks(buildMission({
    id: 'mission-mfe-board-a',
    title: 'MFE board A',
    phase: 'for',
    role: 'beredskapsvakt',
    scenario: 'mfe-stotte',
    tasks: [],
    resourceRequests: [],
  }), now);
  const updated = addMfeReceptionResourceRequest(
    setMfeReceptionStepStatus(mission, 'arrival', 'in-progress', now),
    'arrival',
    now,
  );
  const board = buildMfeReceptionBoard(updated);

  expect(shouldShowMfeReceptionBoard(updated)).toBe(true);
  expect(board.steps).toHaveLength(5);
  expect(board.summary.totalSteps).toBe(5);
  expect(board.summary.startedSteps).toBe(1);
  expect(board.summary.resourceRequestCount).toBe(1);
  expect(board.steps.find((step) => step.id === 'arrival')?.status).toBe('in-progress');
  expect(updated.tasks.map((task) => task.title)).toEqual(expect.arrayContaining([
    'MFE mottak: Kontaktpunkt og mottaker',
    'MFE mottak: Mottak, oppmøte og første ordre',
    'MFE mottak: Demobilisering og etterkontroll',
  ]));
  expect(updated.resourceRequests.at(-1)).toMatchObject({
    kind: 'transport',
    quantity: 'MFE mottak: Mottak, oppmøte og første ordre',
    note: 'Lokal mottaksboard. Ikke offisiell anmodning eller utkalling.',
  });
});

it('keeps MFE reception board prompts local and non-official', () => {
  const board = buildMfeReceptionBoard(buildMission({
    id: 'mission-mfe-board-b',
    title: 'MFE board B',
    phase: 'under',
    role: 'mfe',
    scenario: 'mfe-stotte',
    tasks: [],
    resourceRequests: [],
  }));

  const promptText = board.guardrails.join('\n');
  expect(promptText).toMatch(/lokal mottaksboard/i);
  expect(promptText).toMatch(/ingen offisiell anmodning|ikke offisiell anmodning/i);
  expect(promptText).toMatch(/navn|persondata|kjøretøyidentifikator|depot/i);
  expect(promptText).not.toMatch(/dispatch|live tracking|sanntid|GPS-sporing/i);
});

it('does not show the MFE board for unrelated ordinary missions', () => {
  expect(shouldShowMfeReceptionBoard(buildMission({
    id: 'mission-generic',
    title: 'Generelt oppdrag',
    phase: 'under',
    role: 'mannskap',
    scenario: 'generelt',
  }))).toBe(false);
});
