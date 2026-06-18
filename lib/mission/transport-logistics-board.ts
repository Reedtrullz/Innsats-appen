import type {
  MissionContext,
  MissionResourceRequest,
  MissionTask,
  MissionTaskStatus,
  ResourceRequestKind,
} from '@/lib/mission/schemas';

export type TransportLogisticsStepId =
  | 'mission-load'
  | 'competence'
  | 'route-risk'
  | 'readiness'
  | 'sustainment'
  | 'return-mbk';

export type TransportLogisticsStepDefinition = {
  id: TransportLogisticsStepId;
  title: string;
  description: string;
  resourceKind: ResourceRequestKind;
  resourceLabel: string;
};

export type TransportLogisticsBoardStep = TransportLogisticsStepDefinition & {
  taskTitle: string;
  status: MissionTaskStatus;
  hasResourceRequest: boolean;
};

export const TRANSPORT_LOGISTICS_GUARDRAILS = [
  'Lokal planleggingsboard for ATV, båt, kjøretøy og logistikk; ingen offisiell ordre, anmodning eller utkalling sendes fra appen.',
  'Bruk funksjoner og generelle behov; ikke navn, persondata, passasjerdetaljer, kjøretøyidentifikatorer, skjermede ruter eller materiell-lokasjoner.',
  'Førerkompetanse, trafikk-/sjøregler, vær, terreng, lokal ordre og lederens risikovurdering avgjør om transport kan gjennomføres.',
];

export const TRANSPORT_LOGISTICS_STEPS: TransportLogisticsStepDefinition[] = [
  {
    id: 'mission-load',
    title: 'Oppdrag, last og mottak',
    description: 'Avklar transportoppdrag, last/passasjerbehov, mottakspunkt, varighet og hvem som melder klar eller mangler.',
    resourceKind: 'transport',
    resourceLabel: 'Transportkapasitet og mottak',
  },
  {
    id: 'competence',
    title: 'Førerkompetanse og rolle',
    description: 'Sjekk at aktuell fører/båtfører har relevant opplæring og forstår lokal ordre, begrensninger og sikkerhetskrav.',
    resourceKind: 'transport',
    resourceLabel: 'Kompetanse og rolleavklaring',
  },
  {
    id: 'route-risk',
    title: 'Rute, vær og framkommelighet',
    description: 'Vurder terreng, sjø, vær, vendepunkt, parkering, alternativ rute og hva som må løftes til leder før avgang.',
    resourceKind: 'transport',
    resourceLabel: 'Rute- og framkommelighetsbehov',
  },
  {
    id: 'readiness',
    title: 'Kjøretøy, båt/ATV og sikring',
    description: 'Kontroller drivstoff, lys/merking, samband, førstehjelpsutstyr, lastesikring, tilhenger og relevant verne-/sikringsutstyr.',
    resourceKind: 'equipment',
    resourceLabel: 'Utstyr, samband og sikring',
  },
  {
    id: 'sustainment',
    title: 'Drivstoff, avløsning og forbruk',
    description: 'Planlegg drivstoff, forbruksmateriell, hvile/avløsning, servicebehov og hvordan avvik meldes lokalt.',
    resourceKind: 'fuel',
    resourceLabel: 'Drivstoff og utholdenhet',
  },
  {
    id: 'return-mbk',
    title: 'Retur, vask/service og MBK',
    description: 'Avklar retur, etterkontroll, vask/service, karantene ved behov og lokal MBK-status før ny beredskap.',
    resourceKind: 'equipment',
    resourceLabel: 'Retur og materiellberedskap',
  },
];

function timestamp(now: Date) {
  return now.toISOString();
}

function stableSuffix(now: Date) {
  return now.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

export function transportLogisticsTaskTitle(step: TransportLogisticsStepDefinition) {
  return `Transportlogistikk: ${step.title}`;
}

function taskForStep(mission: MissionContext, step: TransportLogisticsStepDefinition) {
  const taskTitle = transportLogisticsTaskTitle(step);
  return mission.tasks.find((task) => task.title === taskTitle);
}

function hasResourceRequestForStep(mission: MissionContext, step: TransportLogisticsStepDefinition) {
  const taskTitle = transportLogisticsTaskTitle(step);
  return mission.resourceRequests.some((request) => request.quantity === taskTitle);
}

export function shouldShowTransportLogisticsBoard(mission: MissionContext) {
  return mission.role === 'atv-bat'
    || mission.role === 'materiellansvarlig'
    || mission.role === 'stab-logistikk'
    || mission.scenario === 'evakuering'
    || mission.activeChecklistIds.some((id) => /(?:mbk-kjoretoy|fig-for-innsats|for-utrykning|transport|kjoretoy)/i.test(id))
    || mission.resourceRequests.some((request) => request.kind === 'transport' || request.kind === 'fuel');
}

export function buildTransportLogisticsBoard(mission: MissionContext) {
  const steps: TransportLogisticsBoardStep[] = TRANSPORT_LOGISTICS_STEPS.map((step) => {
    const task = taskForStep(mission, step);
    return {
      ...step,
      taskTitle: transportLogisticsTaskTitle(step),
      status: task?.status ?? 'not-started',
      hasResourceRequest: hasResourceRequestForStep(mission, step),
    };
  });
  const startedSteps = steps.filter((step) => step.status !== 'not-started').length;
  const completedSteps = steps.filter((step) => step.status === 'done').length;
  const resourceRequestCount = steps.filter((step) => step.hasResourceRequest).length;

  return {
    steps,
    guardrails: [...TRANSPORT_LOGISTICS_GUARDRAILS],
    summary: {
      totalSteps: steps.length,
      startedSteps,
      completedSteps,
      resourceRequestCount,
    },
  };
}

function taskDraft(step: TransportLogisticsStepDefinition, now: Date): MissionTask {
  const createdAt = timestamp(now);
  return {
    id: `transport-board-${step.id}-${stableSuffix(now)}`,
    title: transportLogisticsTaskTitle(step),
    status: 'not-started',
    createdAt,
    updatedAt: createdAt,
  };
}

export function ensureTransportLogisticsBoardTasks(mission: MissionContext, now = new Date()): MissionContext {
  const existingTitles = new Set(mission.tasks.map((task) => task.title));
  const missingTasks = TRANSPORT_LOGISTICS_STEPS
    .filter((step) => !existingTitles.has(transportLogisticsTaskTitle(step)))
    .map((step) => taskDraft(step, now));

  if (missingTasks.length === 0) return mission;
  return {
    ...mission,
    updatedAt: timestamp(now),
    tasks: [...mission.tasks, ...missingTasks],
  };
}

export function setTransportLogisticsStepStatus(
  mission: MissionContext,
  stepId: TransportLogisticsStepId,
  status: MissionTaskStatus,
  now = new Date(),
): MissionContext {
  const seeded = ensureTransportLogisticsBoardTasks(mission, now);
  const step = TRANSPORT_LOGISTICS_STEPS.find((item) => item.id === stepId);
  if (!step) return seeded;
  const taskTitle = transportLogisticsTaskTitle(step);
  const updatedAt = timestamp(now);
  return {
    ...seeded,
    updatedAt,
    tasks: seeded.tasks.map((task) => task.title === taskTitle ? { ...task, status, updatedAt } : task),
  };
}

function resourceRequestDraft(step: TransportLogisticsStepDefinition, now: Date): MissionResourceRequest {
  const createdAt = timestamp(now);
  return {
    id: `transport-board-resource-${step.id}-${stableSuffix(now)}`,
    kind: step.resourceKind,
    status: 'not-started',
    createdAt,
    quantity: transportLogisticsTaskTitle(step),
    note: 'Lokal transportlogistikk. Ikke offisiell anmodning, utkalling, kjørebok eller sporingssystem.',
  };
}

export function addTransportLogisticsResourceRequest(
  mission: MissionContext,
  stepId: TransportLogisticsStepId,
  now = new Date(),
): MissionContext {
  const step = TRANSPORT_LOGISTICS_STEPS.find((item) => item.id === stepId);
  if (!step) return mission;
  if (hasResourceRequestForStep(mission, step)) return mission;
  return {
    ...mission,
    updatedAt: timestamp(now),
    resourceRequests: [...mission.resourceRequests, resourceRequestDraft(step, now)],
  };
}
