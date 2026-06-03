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
