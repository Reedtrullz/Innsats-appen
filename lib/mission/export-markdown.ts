import type { OperationalChecklist } from '@/lib/content/schemas';
import { EXPORT_SENSITIVITY_WARNING } from './order-export';
import type { ChecklistRun, MissionContext } from './schemas';

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
