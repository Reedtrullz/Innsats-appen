import type {
  MissionContext,
  MissionResourceRequest,
  MissionTask,
  MissionTaskStatus,
  ResourceRequestKind,
} from '@/lib/mission/schemas';

export type MfeReceptionStepId = 'contact' | 'arrival' | 'operations' | 'sustainment' | 'demobilization';

export type MfeReceptionStepDefinition = {
  id: MfeReceptionStepId;
  title: string;
  description: string;
  resourceKind: ResourceRequestKind;
  resourceLabel: string;
};

export type MfeReceptionBoardStep = MfeReceptionStepDefinition & {
  taskTitle: string;
  status: MissionTaskStatus;
  hasResourceRequest: boolean;
};

export const MFE_RECEPTION_BOARD_GUARDRAILS = [
  'Lokal mottaksboard for oppfølging av MFE-støtte; ingen offisiell anmodning sendes fra appen.',
  'Bruk roller, funksjoner og generelle ressursbehov; ikke navn, persondata, kjøretøyidentifikatorer eller depotdetaljer.',
  'Beredskapsvakt, distrikt, innsatsleder og gjeldende ordre styrer ressursbruk, mottak og avslutning.',
];

export const MFE_RECEPTION_BOARD_STEPS: MfeReceptionStepDefinition[] = [
  {
    id: 'contact',
    title: 'Kontaktpunkt og mottaker',
    description: 'Avklar hvem som tar imot MFE lokalt, sambandsvei og hvor første status meldes.',
    resourceKind: 'equipment',
    resourceLabel: 'Kontakt- og sambandsbehov',
  },
  {
    id: 'arrival',
    title: 'Mottak, oppmøte og første ordre',
    description: 'Følg opp ankomst, sikkerhetsbrief, oppgaveforståelse og hvem som gir første ordre.',
    resourceKind: 'transport',
    resourceLabel: 'Transport og adkomst',
  },
  {
    id: 'operations',
    title: 'Drift, liaison og oppfølging',
    description: 'Hold lokal oversikt over drift, avvik, liaison og behov som må løftes til leder.',
    resourceKind: 'equipment',
    resourceLabel: 'Utstyr og liaisonstøtte',
  },
  {
    id: 'sustainment',
    title: 'Forsyning, avløsning og MBK',
    description: 'Følg opp mat, vann, hvile, forbruksmateriell, avløsning og materiellberedskap.',
    resourceKind: 'food',
    resourceLabel: 'Forsyning og avløsning',
  },
  {
    id: 'demobilization',
    title: 'Demobilisering og etterkontroll',
    description: 'Avklar avslutning, retur, MBK, avvik, læring og hva som skal inn i ordinær rapportlinje.',
    resourceKind: 'transport',
    resourceLabel: 'Retur og demobilisering',
  },
];

function timestamp(now: Date) {
  return now.toISOString();
}

function stableSuffix(now: Date) {
  return now.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

export function mfeReceptionTaskTitle(step: MfeReceptionStepDefinition) {
  return `MFE mottak: ${step.title}`;
}

function taskForStep(mission: MissionContext, step: MfeReceptionStepDefinition) {
  const taskTitle = mfeReceptionTaskTitle(step);
  return mission.tasks.find((task) => task.title === taskTitle);
}

function hasResourceRequestForStep(mission: MissionContext, step: MfeReceptionStepDefinition) {
  const taskTitle = mfeReceptionTaskTitle(step);
  return mission.resourceRequests.some((request) => request.quantity === taskTitle);
}

export function shouldShowMfeReceptionBoard(mission: MissionContext) {
  return mission.scenario === 'mfe-stotte'
    || mission.role === 'mfe'
    || mission.activeChecklistIds.some((id) => /mfe/i.test(id));
}

export function buildMfeReceptionBoard(mission: MissionContext) {
  const steps: MfeReceptionBoardStep[] = MFE_RECEPTION_BOARD_STEPS.map((step) => {
    const task = taskForStep(mission, step);
    return {
      ...step,
      taskTitle: mfeReceptionTaskTitle(step),
      status: task?.status ?? 'not-started',
      hasResourceRequest: hasResourceRequestForStep(mission, step),
    };
  });
  const startedSteps = steps.filter((step) => step.status !== 'not-started').length;
  const completedSteps = steps.filter((step) => step.status === 'done').length;
  const resourceRequestCount = steps.filter((step) => step.hasResourceRequest).length;

  return {
    steps,
    guardrails: [...MFE_RECEPTION_BOARD_GUARDRAILS],
    summary: {
      totalSteps: steps.length,
      startedSteps,
      completedSteps,
      resourceRequestCount,
    },
  };
}

function taskDraft(step: MfeReceptionStepDefinition, now: Date): MissionTask {
  const createdAt = timestamp(now);
  return {
    id: `mfe-board-${step.id}-${stableSuffix(now)}`,
    title: mfeReceptionTaskTitle(step),
    status: 'not-started',
    createdAt,
    updatedAt: createdAt,
  };
}

export function ensureMfeReceptionBoardTasks(mission: MissionContext, now = new Date()): MissionContext {
  const existingTitles = new Set(mission.tasks.map((task) => task.title));
  const missingTasks = MFE_RECEPTION_BOARD_STEPS
    .filter((step) => !existingTitles.has(mfeReceptionTaskTitle(step)))
    .map((step) => taskDraft(step, now));

  if (missingTasks.length === 0) return mission;
  return {
    ...mission,
    updatedAt: timestamp(now),
    tasks: [...mission.tasks, ...missingTasks],
  };
}

export function setMfeReceptionStepStatus(
  mission: MissionContext,
  stepId: MfeReceptionStepId,
  status: MissionTaskStatus,
  now = new Date(),
): MissionContext {
  const seeded = ensureMfeReceptionBoardTasks(mission, now);
  const step = MFE_RECEPTION_BOARD_STEPS.find((item) => item.id === stepId);
  if (!step) return seeded;
  const taskTitle = mfeReceptionTaskTitle(step);
  const updatedAt = timestamp(now);
  return {
    ...seeded,
    updatedAt,
    tasks: seeded.tasks.map((task) => task.title === taskTitle ? { ...task, status, updatedAt } : task),
  };
}

function resourceRequestDraft(step: MfeReceptionStepDefinition, now: Date): MissionResourceRequest {
  const createdAt = timestamp(now);
  return {
    id: `mfe-board-resource-${step.id}-${stableSuffix(now)}`,
    kind: step.resourceKind,
    status: 'not-started',
    createdAt,
    quantity: mfeReceptionTaskTitle(step),
    note: 'Lokal mottaksboard. Ikke offisiell anmodning eller utkalling.',
  };
}

export function addMfeReceptionResourceRequest(
  mission: MissionContext,
  stepId: MfeReceptionStepId,
  now = new Date(),
): MissionContext {
  const step = MFE_RECEPTION_BOARD_STEPS.find((item) => item.id === stepId);
  if (!step) return mission;
  if (hasResourceRequestForStep(mission, step)) return mission;
  return {
    ...mission,
    updatedAt: timestamp(now),
    resourceRequests: [...mission.resourceRequests, resourceRequestDraft(step, now)],
  };
}
