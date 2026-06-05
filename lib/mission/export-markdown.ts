import type { OperationalChecklist } from '@/lib/content/schemas';
import { EXPORT_SENSITIVITY_WARNING } from './order-export';
import type { ChecklistRun, MissionContext } from './schemas';

const LOCAL_ONLY_STATUS_WARNING = 'Lagres bare lokalt i denne nettleseren. Ikke offisiell logg alene. Ikke legg inn eller del navn, ID, pasientdetaljer, helsejournal, skjermet operativ informasjon eller annet sensitivt innhold.';

const resourceKindLabels: Record<string, string> = {
  water: 'Vann',
  food: 'Mat',
  ppe: 'Verneutstyr',
  'medical-support': 'Medisinsk støtte',
  transport: 'Transport',
  fuel: 'Drivstoff',
  equipment: 'Utstyr',
};

function joinDefined(parts: Array<string | undefined>) {
  return parts.filter((part) => part && part.trim().length > 0).join(' — ');
}

export function exportMissionMarkdown({ mission, checklists, runs }: { mission: MissionContext; checklists: OperationalChecklist[]; runs: ChecklistRun[] }) {
  const lines: string[] = [];
  lines.push(`# ${mission.title}`);
  lines.push('');
  lines.push('> Eksporten er manuelt overført beslutningsstøtte og er ikke offisiell logg alene. Kontroller mot gjeldende ordre og systemer.');
  lines.push(`> ${EXPORT_SENSITIVITY_WARNING}`);
  lines.push('');
  lines.push(`- Fase/rolle/scenario: ${mission.phase} / ${mission.role} / ${mission.scenario}`);
  lines.push(`- Sted: ${mission.locationText}`);
  lines.push(`- Innholdsversjon: ${mission.contentVersion}`);
  if (mission.notes) lines.push(`- Notater: ${mission.notes}`);
  for (const checklist of checklists) {
    const run = runs.find((item) => item.templateSlug === checklist.slug);
    lines.push('');
    lines.push(`## ${checklist.title}`);
    lines.push(`Kilder: ${(checklist.sourceIds ?? []).join(', ')}`);
    for (const item of checklist.items) {
      const checked = run?.checkedItemIds.includes(item.id) ? 'x' : ' ';
      lines.push(`- [${checked}] ${item.label} (${(item.sourceIds ?? []).join(', ')})`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function exportMissionStatusSummaryMarkdown({ mission }: { mission: MissionContext }) {
  const lines: string[] = [];
  const openTasks = mission.tasks.filter((task) => task.status !== 'done');
  lines.push('# Lokal oppdragsstatus');
  lines.push('');
  lines.push(`> ${EXPORT_SENSITIVITY_WARNING}`);
  lines.push(`> ${LOCAL_ONLY_STATUS_WARNING}`);
  lines.push('');
  lines.push('## Situasjonsoversikt nå');
  lines.push(`- Oppdrag: ${mission.title}`);
  lines.push(`- Fase/rolle/scenario: ${mission.phase} / ${mission.role} / ${mission.scenario}`);
  lines.push(`- Sted: ${mission.locationText}`);
  lines.push(`- Oppdatert: ${mission.updatedAt}`);
  lines.push(`- Aktive sjekklister: ${mission.activeChecklistIds.length > 0 ? `${mission.activeChecklistIds.length} registrert lokalt` : 'Ingen registrert'}`);
  lines.push(`- Åpne oppgaver: ${openTasks.length}`);
  if (mission.notes) lines.push(`- Notater: ${mission.notes}`);
  lines.push('');
  lines.push('### Vær/farer (lagrede sammendrag, ikke rådata)');
  if (mission.externalSignals.length === 0) {
    lines.push('- Ingen lokale sammendrag lagret');
  } else {
    for (const signal of mission.externalSignals) {
      lines.push(`- ${signal.title}: ${signal.summary} (${signal.source}, ${signal.severity}, ${signal.staleness})`);
    }
  }
  lines.push('');
  lines.push('## Oppgaver');
  if (mission.tasks.length === 0) {
    lines.push('- Ingen lokale oppgaver registrert');
  } else {
    for (const task of mission.tasks) {
      lines.push(`- [${task.status}] ${task.title}${task.notes ? ` — ${task.notes}` : ''}`);
    }
  }
  lines.push('');
  lines.push('## Hurtigstatus');
  if (mission.statusLog.length === 0) {
    lines.push('- Ingen hurtigstatus registrert');
  } else {
    for (const status of mission.statusLog) {
      lines.push(`- ${status.message} (${status.createdAt})${status.note ? ` — ${status.note}` : ''}`);
    }
  }
  lines.push('');
  lines.push('## Ressursbehov');
  if (mission.resourceRequests.length === 0) {
    lines.push('- Ingen ressursbehov registrert');
  } else {
    for (const request of mission.resourceRequests) {
      lines.push(`- ${resourceKindLabels[request.kind] ?? request.kind}: ${joinDefined([request.status, request.quantity, request.note])}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

const BEFORE_DEPARTURE_EQUIPMENT_ITEM_IDS_BY_CHECKLIST: Record<string, Set<string>> = {
  'personlig-utstyr-for-utrykning': new Set(['bekledning', 'hjelm-og-verneutstyr']),
  'lagsutstyr-for-utrykning': new Set(['fellesutstyr-komplett', 'samband-testet', 'kjoretoy-og-lasting']),
};

const BEFORE_DEPARTURE_EQUIPMENT_CHECKLISTS = new Set(Object.keys(BEFORE_DEPARTURE_EQUIPMENT_ITEM_IDS_BY_CHECKLIST));

function isBeforeDepartureEquipmentControlItem(checklistSlug: string, itemId: string) {
  return BEFORE_DEPARTURE_EQUIPMENT_ITEM_IDS_BY_CHECKLIST[checklistSlug]?.has(itemId) ?? false;
}

function noteSuffix(note: string | undefined) {
  const trimmed = note?.trim();
  return trimmed ? ` — ${trimmed}` : '';
}

export function exportMissingEquipmentBeforeDepartureMarkdown({ mission, checklists, runs }: { mission: MissionContext; checklists: OperationalChecklist[]; runs: ChecklistRun[] }) {
  const relevantChecklists = checklists.filter((checklist) => BEFORE_DEPARTURE_EQUIPMENT_CHECKLISTS.has(checklist.slug));
  const lines: string[] = [];
  lines.push('# Manglende utstyr før avreise');
  lines.push('');
  lines.push('> Lokal beslutningsstøtte for før utrykning. Kontroller mot lokal ordre, materiellrutiner og beredskapsvakt før deling.');
  lines.push(`> ${EXPORT_SENSITIVITY_WARNING}`);
  lines.push('> Ingen sentral personlig inventarliste i MVP. Ikke legg inn persondata, helsedata, pasientdata eller skjermet operativ informasjon. Bruk bare lokal sjekklistestatus og lokale notater.');
  lines.push('');
  lines.push(`- Oppdrag: ${mission.title}`);
  lines.push(`- Fase/rolle/scenario: ${mission.phase} / ${mission.role} / ${mission.scenario}`);
  lines.push(`- Sted: ${mission.locationText}`);
  lines.push(`- Innholdsversjon: ${mission.contentVersion}`);

  let missingCount = 0;
  for (const checklist of relevantChecklists) {
    const run = runs.find((item) => item.templateSlug === checklist.slug);
    const missingItems = checklist.items.filter((item) => isBeforeDepartureEquipmentControlItem(checklist.slug, item.id) && !run?.checkedItemIds.includes(item.id));
    if (missingItems.length === 0) continue;
    lines.push('', `## ${checklist.title}`);
    if (checklist.warning) lines.push(`> ${checklist.warning}`);
    lines.push(`Kilder: ${(checklist.sourceIds ?? []).join(', ')}`);
    for (const item of missingItems) {
      missingCount += 1;
      lines.push(`- [ ] ${item.label}${noteSuffix(run?.notesByItemId[item.id])}`);
    }
  }

  if (missingCount === 0) {
    lines.push('', 'Ingen manglende utstyrspunkter funnet i lokale før utrykning-sjekklister.');
  }

  return `${lines.join('\n')}\n`;
}
