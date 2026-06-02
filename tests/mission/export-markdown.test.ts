import { exportMissionMarkdown } from '@/lib/mission/export-markdown';

it('exports mission and checklist state without browser metadata', () => {
  const markdown = exportMissionMarkdown({
    mission: { id: 'm1', title: 'Øvelse tilfluktsrom', createdAt: '2026-06-02T20:00:00.000Z', updatedAt: '2026-06-02T20:00:00.000Z', phase: 'for', role: 'beredskapsvakt', scenario: 'tilfluktsrom', locationText: 'Trondheim', externalSignals: [], activeChecklistIds: [], notes: 'lokal note', contentVersion: 'v1' } as any,
    checklists: [{ slug: 'tilfluktsrom-teknisk-status', title: 'Tilfluktsrom teknisk status', phase: 'for', roles: ['beredskapsvakt'], scenarios: ['tilfluktsrom'], items: [{ id: 'ventilasjon', label: 'Kontroller ventilasjon', required: true, sourceIds: ['src-deep-research-tilfluktsrom'] }], sourceIds: ['src-deep-research-tilfluktsrom'] } as any],
    runs: [{ id: 'r1', missionId: 'm1', templateSlug: 'tilfluktsrom-teknisk-status', checkedItemIds: ['ventilasjon'], notesByItemId: {}, updatedAt: '2026-06-02T20:10:00.000Z', schemaVersion: 1 }],
  });
  expect(markdown).toContain('Øvelse tilfluktsrom');
  expect(markdown).toContain('for / beredskapsvakt / tilfluktsrom');
  expect(markdown).toContain('[x] Kontroller ventilasjon');
  expect(markdown).toContain('src-deep-research-tilfluktsrom');
  expect(markdown).toContain('manuelt overført');
  expect(markdown).not.toContain('indexedDB');
});
