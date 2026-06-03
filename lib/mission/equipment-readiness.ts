import type { OperationalChecklist } from '@/lib/content/schemas';
import type { ChecklistRun, EquipmentStatus, MissionContext } from './schemas';

export const equipmentStatusLabels: Record<EquipmentStatus, string> = {
  ready: 'Klar',
  missing: 'Mangler',
  damaged: 'Skadet',
  consumed: 'Forbrukt',
  'needs-wash': 'Må vaskes',
  'needs-service': 'Trenger service',
  quarantined: 'Karantene',
};

export const equipmentStatuses = Object.keys(equipmentStatusLabels) as EquipmentStatus[];
export const blockingEquipmentStatuses: EquipmentStatus[] = ['missing', 'damaged', 'consumed', 'needs-wash', 'needs-service', 'quarantined'];

export const mbkChecklistSlugs = [
  'mbk-kjoretoy',
  'mbk-brann-slange',
  'mbk-telt',
  'mbk-varmeapparat',
  'mbk-pumpe',
  'mbk-aggregat',
  'mbk-belysning',
  'mbk-samband',
  'mbk-personlig-utstyr',
] as const;

export type MbkChecklistSlug = (typeof mbkChecklistSlugs)[number];

const mbkChecklistSlugSet = new Set<string>(mbkChecklistSlugs);

export type EquipmentReadinessItemSummary = {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
  status?: EquipmentStatus;
  statusLabel?: string;
  sourceIds: string[];
};

export type EquipmentStatusCounts = Record<EquipmentStatus, number>;

export type EquipmentReadinessGroupSummary = {
  slug: string;
  title: string;
  equipmentRequired: string[];
  sourceIds: string[];
  statusCounts: EquipmentStatusCounts;
  blockingCounts: EquipmentStatusCounts;
  requiredControlCounts: { total: number; ready: number; notReady: number };
  readyForNewDeployment: boolean;
  items: EquipmentReadinessItemSummary[];
};

export type EquipmentReadinessSummary = {
  schemaVersion: 1;
  mission: Pick<MissionContext, 'id' | 'title' | 'phase' | 'role' | 'scenario' | 'locationText' | 'updatedAt' | 'contentVersion'>;
  generatedAt: string;
  readyForNewDeployment: boolean;
  statusCounts: EquipmentStatusCounts;
  blockingCounts: EquipmentStatusCounts;
  requiredControlCounts: { total: number; ready: number; notReady: number };
  groups: EquipmentReadinessGroupSummary[];
  warnings: string[];
};

export function isMbkChecklist(checklist: Pick<OperationalChecklist, 'slug'>) {
  return mbkChecklistSlugSet.has(checklist.slug);
}

function emptyStatusCounts(): EquipmentStatusCounts {
  return {
    ready: 0,
    missing: 0,
    damaged: 0,
    consumed: 0,
    'needs-wash': 0,
    'needs-service': 0,
    quarantined: 0,
  };
}

function addCounts(target: EquipmentStatusCounts, source: EquipmentStatusCounts) {
  for (const status of equipmentStatuses) target[status] += source[status];
}

function statusForItem(item: OperationalChecklist['items'][number], run: ChecklistRun | undefined): EquipmentStatus | undefined {
  const explicitStatus = run?.equipmentStatusByItemId?.[item.id];
  const checked = run?.checkedItemIds?.includes(item.id) ?? false;
  if (item.required && !checked && explicitStatus === 'ready') return 'missing';
  if (explicitStatus) return explicitStatus;
  if (checked) return 'ready';
  if (item.required) return 'missing';
  return undefined;
}

function hasBlockingStatus(counts: EquipmentStatusCounts) {
  return blockingEquipmentStatuses.some((status) => counts[status] > 0);
}

export function buildEquipmentReadinessSummary({ mission, checklists, runs }: { mission: MissionContext; checklists: OperationalChecklist[]; runs: ChecklistRun[] }): EquipmentReadinessSummary {
  const runsByTemplateSlug = new Map(runs.map((run) => [run.templateSlug, run]));
  const statusCounts = emptyStatusCounts();
  const blockingCounts = emptyStatusCounts();
  const requiredControlCounts = { total: 0, ready: 0, notReady: 0 };
  const groups = checklists.filter(isMbkChecklist).map((checklist) => {
    const run = runsByTemplateSlug.get(checklist.slug);
    const groupStatusCounts = emptyStatusCounts();
    const groupBlockingCounts = emptyStatusCounts();
    const groupRequiredControlCounts = { total: 0, ready: 0, notReady: 0 };
    const items = checklist.items.map((item) => {
      const checked = run?.checkedItemIds?.includes(item.id) ?? false;
      const status = statusForItem(item, run);
      if (status) groupStatusCounts[status] += 1;
      if (status && blockingEquipmentStatuses.includes(status)) groupBlockingCounts[status] += 1;
      if (item.required) {
        groupRequiredControlCounts.total += 1;
        if (status === 'ready') groupRequiredControlCounts.ready += 1;
        else groupRequiredControlCounts.notReady += 1;
      }
      return {
        id: item.id,
        label: item.label,
        required: Boolean(item.required),
        checked,
        status,
        statusLabel: status ? equipmentStatusLabels[status] : undefined,
        sourceIds: item.sourceIds ?? [],
      };
    });

    addCounts(statusCounts, groupStatusCounts);
    addCounts(blockingCounts, groupBlockingCounts);
    requiredControlCounts.total += groupRequiredControlCounts.total;
    requiredControlCounts.ready += groupRequiredControlCounts.ready;
    requiredControlCounts.notReady += groupRequiredControlCounts.notReady;

    return {
      slug: checklist.slug,
      title: checklist.title,
      equipmentRequired: checklist.equipmentRequired ?? [],
      sourceIds: checklist.sourceIds ?? [],
      statusCounts: groupStatusCounts,
      blockingCounts: groupBlockingCounts,
      requiredControlCounts: groupRequiredControlCounts,
      readyForNewDeployment: !hasBlockingStatus(groupBlockingCounts) && groupRequiredControlCounts.notReady === 0,
      items,
    };
  });

  return {
    schemaVersion: 1,
    mission: {
      id: mission.id,
      title: mission.title,
      phase: mission.phase,
      role: mission.role,
      scenario: mission.scenario,
      locationText: mission.locationText,
      updatedAt: mission.updatedAt,
      contentVersion: mission.contentVersion,
    },
    generatedAt: new Date().toISOString(),
    readyForNewDeployment: groups.length > 0 && !hasBlockingStatus(blockingCounts) && requiredControlCounts.notReady === 0,
    statusCounts,
    blockingCounts,
    requiredControlCounts,
    groups,
    warnings: [
      'Kun lokal beslutningsstøtte for materiellberedskap.',
      'Ikke offisiell inventarliste, lagerstatus eller innsending.',
      'ingen serienummer, persondata eller sensitive samband-lister i eksporten.',
    ],
  };
}

function formatCounts(counts: EquipmentStatusCounts) {
  return equipmentStatuses.map((status) => `${equipmentStatusLabels[status]}: ${counts[status]}`).join(', ');
}

export function exportEquipmentReadinessMarkdown(summary: EquipmentReadinessSummary) {
  const lines: string[] = [];
  lines.push('# Materiellberedskap / MBK');
  lines.push('');
  for (const warning of summary.warnings) lines.push(`> ${warning}`);
  lines.push('');
  lines.push(`- Oppdrag: ${summary.mission.title}`);
  lines.push(`- Fase/rolle/scenario: ${summary.mission.phase} / ${summary.mission.role} / ${summary.mission.scenario}`);
  lines.push(`- Sted: ${summary.mission.locationText}`);
  lines.push(`- Oppdatert: ${summary.mission.updatedAt}`);
  lines.push(`- Klar for ny utdeployering: ${summary.readyForNewDeployment ? 'Ja' : 'Nei'}`);
  lines.push(`- Påkrevde MBK-kontroller klare: ${summary.requiredControlCounts.ready}/${summary.requiredControlCounts.total}`);
  lines.push(`- Blokkerende status: ${formatCounts(summary.blockingCounts)}`);
  lines.push('');

  if (summary.groups.length === 0) {
    lines.push('Ingen grupperte MBK-sjekklister funnet i valgt innhold.');
  }

  for (const group of summary.groups) {
    lines.push(`## ${group.title}`);
    lines.push(`- Utstyrsgruppe: ${group.equipmentRequired.join(', ') || 'Ikke angitt'}`);
    lines.push(`- Klar for ny utdeployering: ${group.readyForNewDeployment ? 'Ja' : 'Nei'}`);
    lines.push(`- Status: ${formatCounts(group.statusCounts)}`);
    lines.push(`- Kilder: ${group.sourceIds.join(', ')}`);
    for (const item of group.items) {
      const required = item.required ? 'påkrevd' : 'valgfri';
      const checked = item.checked ? 'kontrollert' : 'ikke kontrollert';
      lines.push(`- ${item.statusLabel ?? 'Ikke satt'} — ${item.label} (${required}, ${checked})`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function exportEquipmentReadinessJson(summary: EquipmentReadinessSummary) {
  const { mission, ...rest } = summary;
  const publicSummary = {
    ...rest,
    oppdrag: {
      title: mission.title,
      phase: mission.phase,
      role: mission.role,
      scenario: mission.scenario,
      locationText: mission.locationText,
      updatedAt: mission.updatedAt,
      contentVersion: mission.contentVersion,
    },
  };
  return `${JSON.stringify(publicSummary, null, 2)}\n`;
}
