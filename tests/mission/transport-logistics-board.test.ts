import {
  addTransportLogisticsResourceRequest,
  buildTransportLogisticsBoard,
  ensureTransportLogisticsBoardTasks,
  setTransportLogisticsStepStatus,
  shouldShowTransportLogisticsBoard,
} from '@/lib/mission/transport-logistics-board';
import { buildMission } from '../helpers/mission-fixtures';

const now = new Date('2026-06-18T23:35:00.000Z');

it('builds a local ATV/BAT transport logistics board from mission tasks and resources', () => {
  const mission = ensureTransportLogisticsBoardTasks(buildMission({
    id: 'mission-transport-board-a',
    title: 'Transport board A',
    phase: 'for',
    role: 'atv-bat',
    scenario: 'evakuering',
    tasks: [],
    resourceRequests: [],
  }), now);
  const updated = addTransportLogisticsResourceRequest(
    setTransportLogisticsStepStatus(mission, 'route-risk', 'needs-assistance', now),
    'route-risk',
    now,
  );
  const board = buildTransportLogisticsBoard(updated);

  expect(shouldShowTransportLogisticsBoard(updated)).toBe(true);
  expect(board.steps).toHaveLength(6);
  expect(board.summary.totalSteps).toBe(6);
  expect(board.summary.startedSteps).toBe(1);
  expect(board.summary.resourceRequestCount).toBe(1);
  expect(board.steps.find((step) => step.id === 'route-risk')?.status).toBe('needs-assistance');
  expect(updated.tasks.map((task) => task.title)).toEqual(expect.arrayContaining([
    'Transportlogistikk: Oppdrag, last og mottak',
    'Transportlogistikk: Førerkompetanse og rolle',
    'Transportlogistikk: Retur, vask/service og MBK',
  ]));
  expect(updated.resourceRequests.at(-1)).toMatchObject({
    kind: 'transport',
    quantity: 'Transportlogistikk: Rute, vær og framkommelighet',
    note: 'Lokal transportlogistikk. Ikke offisiell anmodning, utkalling, kjørebok eller sporingssystem.',
  });
});

it('keeps transport logistics prompts local and privacy-safe', () => {
  const board = buildTransportLogisticsBoard(buildMission({
    id: 'mission-transport-board-b',
    title: 'Transport board B',
    phase: 'under',
    role: 'stab-logistikk',
    scenario: 'generelt',
    tasks: [],
    resourceRequests: [],
  }));

  const promptText = board.guardrails.join('\n');
  expect(promptText).toMatch(/lokal planleggingsboard/i);
  expect(promptText).toMatch(/ingen offisiell ordre|ikke offisiell ordre/i);
  expect(promptText).toMatch(/persondata|passasjerdetaljer|kjøretøyidentifikatorer|skjermede ruter/i);
  expect(promptText).not.toMatch(/dispatch|live tracking|sanntid|GPS-sporing/i);
});

it('does not show transport logistics for unrelated ordinary missions', () => {
  expect(shouldShowTransportLogisticsBoard(buildMission({
    id: 'mission-no-transport',
    title: 'Generelt oppdrag',
    phase: 'under',
    role: 'mannskap',
    scenario: 'generelt',
  }))).toBe(false);
});
