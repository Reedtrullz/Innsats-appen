import { exportMissionMarkdown, exportMissingEquipmentBeforeDepartureMarkdown } from '@/lib/mission/export-markdown';
import fs from 'node:fs';
import yaml from 'js-yaml';

const readYaml = (path: string) => yaml.load(fs.readFileSync(path, 'utf8')) as any[];

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
  expect(markdown).toContain('Eksporterte filer kan inneholde operasjonelt sensitiv informasjon');
  expect(markdown).toContain('Lagres bare lokalt');
  expect(markdown).not.toContain('indexedDB');
});

it('exports missing equipment before departure from local checklist state without central personal inventory', () => {
  const curatedChecklists = readYaml('content/curated/checklists.yaml');
  const equipmentChecklists = curatedChecklists.filter((checklist) => ['personlig-utstyr-for-utrykning', 'lagsutstyr-for-utrykning'].includes(checklist.slug));

  const markdown = exportMissingEquipmentBeforeDepartureMarkdown({
    mission: { id: 'm1', title: 'FIG utrykning', createdAt: '2026-06-02T20:00:00.000Z', updatedAt: '2026-06-02T20:00:00.000Z', phase: 'for', role: 'lagforer', scenario: 'generelt', locationText: 'Depot', externalSignals: [], activeChecklistIds: [], notes: '', contentVersion: 'v1' } as any,
    checklists: equipmentChecklists,
    runs: [
      { id: 'r1', missionId: 'm1', templateSlug: 'personlig-utstyr-for-utrykning', checkedItemIds: ['hjelm-og-verneutstyr'], notesByItemId: { bekledning: 'Mangler regnjakker i rett størrelse', 'personlig-samband-og-lys': 'Skal ikke eksporteres', 'mangler-notert-lokalt': 'Prosesspunkt skal ikke eksporteres' }, updatedAt: '2026-06-02T20:10:00.000Z', schemaVersion: 1 },
      { id: 'r2', missionId: 'm1', templateSlug: 'lagsutstyr-for-utrykning', checkedItemIds: ['fellesutstyr-komplett'], notesByItemId: { 'samband-testet': 'Ett reservebatteri mangler', 'kjoretoy-og-lasting': 'Lastestropp mangler', 'mangler-notert-lokalt': 'Note-only punkt skal ikke eksporteres' }, updatedAt: '2026-06-02T20:11:00.000Z', schemaVersion: 1 },
    ],
  });

  expect(markdown).toContain('# Manglende utstyr før avreise');
  expect(markdown).toContain('FIG utrykning');
  expect(markdown).toContain('- [ ] Bekledning valgt etter vær, føre, varighet og oppdragstype — Mangler regnjakker i rett størrelse');
  expect(markdown).toContain('- [ ] Samband, kallesignal og reservebatterier testet etter lokal sambandsplan — Ett reservebatteri mangler');
  expect(markdown).toContain('- [ ] Kjøretøy, sikring av last og tilgjengelighet for rask avreise kontrollert — Lastestropp mangler');
  expect(markdown).not.toContain('Hjelm og relevant verneutstyr kontrollert av den enkelte');
  expect(markdown).not.toContain('Personlig samband/lys/enkle hjelpemidler kontrollert der lokale rutiner krever det');
  expect(markdown).not.toContain('Eventuelle mangler er notert lokalt');
  expect(markdown).not.toContain('Manglende lagsutstyr er notert lokalt');
  expect(markdown).not.toContain('Skal ikke eksporteres');
  expect(markdown).not.toContain('Note-only punkt skal ikke eksporteres');
  expect(markdown).toContain('Lagres bare lokalt');
  expect(markdown).toContain('Ingen sentral personlig inventarliste');
  expect(markdown).not.toContain('indexedDB');
});
