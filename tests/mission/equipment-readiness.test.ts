import { expect, it } from 'vitest';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { buildEquipmentReadinessSummary, exportEquipmentReadinessJson, exportEquipmentReadinessMarkdown, equipmentStatusLabels, mbkChecklistSlugs } from '@/lib/mission/equipment-readiness';
import { ChecklistRunSchema, type ChecklistRun, type MissionContext } from '@/lib/mission/schemas';

const mission: MissionContext = {
  id: 'mission-mbk',
  title: 'Ny utdeployering',
  createdAt: '2026-06-04T08:00:00.000Z',
  updatedAt: '2026-06-04T08:30:00.000Z',
  phase: 'for',
  role: 'materiellansvarlig',
  scenario: 'generelt',
  locationText: 'Lokalt område',
  externalSignals: [],
  activeChecklistIds: ['mbk-kjoretoy'],
  notes: '',
  tasks: [],
  statusLog: [],
  resourceRequests: [],
  fieldLogEntries: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
};

const checklists = [
  {
    slug: 'mbk-kjoretoy',
    title: 'MBK kjøretøy',
    phase: 'for',
    roles: ['materiellansvarlig'],
    scenarios: ['generelt'],
    equipmentRequired: ['kjoretoy'],
    sourceIds: ['src-sjekkliste-fig-og-figp'],
    warning: 'Kun lokal status uten persondata.',
    items: [
      { id: 'status-kontrollert', label: 'Status kontrollert', required: true, sourceIds: ['src-sjekkliste-fig-og-figp'] },
      { id: 'vask-vurdert', label: 'Vask vurdert', required: true, sourceIds: ['src-renhold-etter-branninnsats'] },
      { id: 'klar-rapportert', label: 'Klar/not ready rapportert', required: true, sourceIds: ['src-tiltakskort-etter-innsats'] },
    ],
  },
  {
    slug: 'ikke-mbk',
    title: 'Ikke MBK',
    phase: 'for',
    roles: ['lagforer'],
    scenarios: ['generelt'],
    sourceIds: ['src-sjekkliste-fig-og-figp'],
    items: [{ id: 'ikke-med', label: 'Ikke med', required: true, sourceIds: ['src-sjekkliste-fig-og-figp'] }],
  },
] as OperationalChecklist[];

it('defines all equipment status labels and keeps old checklist runs parseable', () => {
  expect(equipmentStatusLabels).toEqual({
    ready: 'Klar',
    missing: 'Mangler',
    damaged: 'Skadet',
    consumed: 'Forbrukt',
    'needs-wash': 'Må vaskes',
    'needs-service': 'Trenger service',
    quarantined: 'Karantene',
  });
  expect(mbkChecklistSlugs).toContain('mbk-kjoretoy');

  const parsed = ChecklistRunSchema.parse({
    id: 'old-run',
    missionId: 'mission-mbk',
    templateSlug: 'mbk-kjoretoy',
    checkedItemIds: ['status-kontrollert'],
    notesByItemId: {},
    updatedAt: '2026-06-04T08:10:00.000Z',
    schemaVersion: 1,
  });

  expect(parsed.equipmentStatusByItemId).toEqual({});
});

it('summarizes only grouped MBK checklists with explicit status authoritative over checkbox state', () => {
  const runs: ChecklistRun[] = [
    {
      id: 'run-mbk',
      missionId: 'mission-mbk',
      templateSlug: 'mbk-kjoretoy',
      checkedItemIds: ['status-kontrollert', 'vask-vurdert', 'klar-rapportert'],
      notesByItemId: { 'vask-vurdert': 'Skal ikke eksporteres som fritekst' },
      equipmentStatusByItemId: {
        'status-kontrollert': 'ready',
        'vask-vurdert': 'needs-wash',
        'klar-rapportert': 'ready',
      },
      updatedAt: '2026-06-04T08:20:00.000Z',
      schemaVersion: 1,
    },
    {
      id: 'run-other',
      missionId: 'mission-mbk',
      templateSlug: 'ikke-mbk',
      checkedItemIds: [],
      notesByItemId: {},
      equipmentStatusByItemId: { 'ikke-med': 'damaged' },
      updatedAt: '2026-06-04T08:21:00.000Z',
      schemaVersion: 1,
    },
  ];

  const summary = buildEquipmentReadinessSummary({ mission, checklists, runs });

  expect(summary.groups.map((group) => group.slug)).toEqual(['mbk-kjoretoy']);
  expect(summary.groups[0]?.statusCounts.ready).toBe(2);
  expect(summary.groups[0]?.statusCounts['needs-wash']).toBe(1);
  expect(summary.statusCounts.damaged).toBe(0);
  expect(summary.blockingCounts['needs-wash']).toBe(1);
  expect(summary.readyForNewDeployment).toBe(false);
});

it('infers checked required MBK controls as ready and unchecked required controls as missing even with a stale ready status', () => {
  const summary = buildEquipmentReadinessSummary({
    mission,
    checklists,
    runs: [{
      id: 'run-inferred',
      missionId: 'mission-mbk',
      templateSlug: 'mbk-kjoretoy',
      checkedItemIds: ['status-kontrollert'],
      notesByItemId: {},
      equipmentStatusByItemId: { 'vask-vurdert': 'ready' },
      updatedAt: '2026-06-04T08:20:00.000Z',
      schemaVersion: 1,
    }],
  });

  expect(summary.groups[0]?.statusCounts.ready).toBe(1);
  expect(summary.groups[0]?.statusCounts.missing).toBe(2);
  expect(summary.requiredControlCounts.ready).toBe(1);
  expect(summary.requiredControlCounts.total).toBe(3);
  expect(summary.readyForNewDeployment).toBe(false);
});

it('exports local equipment readiness markdown and json without browser metadata or inventory identifiers', () => {
  const summary = buildEquipmentReadinessSummary({
    mission,
    checklists,
    runs: [{
      id: 'run-export',
      missionId: 'mission-mbk',
      templateSlug: 'mbk-kjoretoy',
      checkedItemIds: ['status-kontrollert', 'vask-vurdert', 'klar-rapportert'],
      notesByItemId: { 'status-kontrollert': 'SERIAL 123 privat depot' },
      equipmentStatusByItemId: {
        'status-kontrollert': 'ready',
        'vask-vurdert': 'ready',
        'klar-rapportert': 'ready',
      },
      updatedAt: '2026-06-04T08:20:00.000Z',
      schemaVersion: 1,
    }],
  });

  const markdown = exportEquipmentReadinessMarkdown(summary);
  const json = exportEquipmentReadinessJson(summary);

  expect(summary.readyForNewDeployment).toBe(true);
  expect(markdown).toContain('# Materiellberedskap / MBK');
  expect(markdown).toContain('Klar for ny utdeployering: Ja');
  expect(markdown).toContain('Kun lokal beslutningsstøtte');
  expect(markdown).toContain('Ikke offisiell inventarliste');
  expect(markdown).toContain('ingen serienummer, persondata eller sensitive samband');
  expect(markdown).not.toMatch(/indexedDB|serial|privat depot|\bdepot\b|\bISSI\b|abonnentliste/i);
  expect(json).toContain('"readyForNewDeployment": true');
  expect(json).not.toMatch(/indexedDB|SERIAL 123|privat depot|\bdepot\b|\bISSI\b|abonnentliste/i);
});
