import { exportMissionMarkdown, exportMissionStatusSummaryMarkdown, exportMissingEquipmentBeforeDepartureMarkdown } from '@/lib/mission/export-markdown';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { buildMission } from '../helpers/mission-fixtures';
import fs from 'node:fs';
import yaml from 'js-yaml';

const readYaml = (path: string) => yaml.load(fs.readFileSync(path, 'utf8')) as OperationalChecklist[];

it('exports mission and checklist state without browser metadata', () => {
  const markdown = exportMissionMarkdown({
    mission: buildMission({ id: 'm1', title: 'Øvelse tilfluktsrom', createdAt: '2026-06-02T20:00:00.000Z', updatedAt: '2026-06-02T20:00:00.000Z', phase: 'for', role: 'beredskapsvakt', scenario: 'tilfluktsrom', locationText: 'Trondheim', externalSignals: [], activeChecklistIds: [], notes: 'lokal note', contentVersion: 'v1' }),
    checklists: [{ slug: 'tilfluktsrom-teknisk-status', title: 'Tilfluktsrom teknisk status', phase: 'for', roles: ['beredskapsvakt'], scenarios: ['tilfluktsrom'], items: [{ id: 'ventilasjon', label: 'Kontroller ventilasjon', required: true, sourceIds: ['src-operativt-konsept-for-sivilforsvaret'] }], sourceIds: ['src-operativt-konsept-for-sivilforsvaret'] }],
    runs: [{ id: 'r1', missionId: 'm1', templateSlug: 'tilfluktsrom-teknisk-status', checkedItemIds: ['ventilasjon'], notesByItemId: {}, equipmentStatusByItemId: {}, updatedAt: '2026-06-02T20:10:00.000Z', schemaVersion: 1 }],
  });
  expect(markdown).toContain('Øvelse tilfluktsrom');
  expect(markdown).toContain('for / beredskapsvakt / tilfluktsrom');
  expect(markdown).toContain('[x] Kontroller ventilasjon');
  expect(markdown).toContain('src-operativt-konsept-for-sivilforsvaret');
  expect(markdown).toContain('manuelt overført');
  expect(markdown).toContain('Eksporterte filer kan inneholde operasjonelt sensitiv informasjon');
  expect(markdown).toContain('Lagres bare lokalt');
  expect(markdown).not.toContain('indexedDB');
});

it('exports missing equipment before departure from local checklist state without central personal inventory', () => {
  const curatedChecklists = readYaml('content/curated/checklists.yaml');
  const equipmentChecklists = curatedChecklists.filter((checklist) => ['personlig-utstyr-for-utrykning', 'lagsutstyr-for-utrykning'].includes(checklist.slug));

  const markdown = exportMissingEquipmentBeforeDepartureMarkdown({
    mission: buildMission({ id: 'm1', title: 'FIG utrykning', createdAt: '2026-06-02T20:00:00.000Z', updatedAt: '2026-06-02T20:00:00.000Z', phase: 'for', role: 'lagforer', scenario: 'generelt', locationText: 'Depot', externalSignals: [], activeChecklistIds: [], notes: '', contentVersion: 'v1' }),
    checklists: equipmentChecklists,
    runs: [
      { id: 'r1', missionId: 'm1', templateSlug: 'personlig-utstyr-for-utrykning', checkedItemIds: ['hjelm-og-verneutstyr'], notesByItemId: { bekledning: 'Mangler regnjakker i rett størrelse', 'personlig-samband-og-lys': 'Skal ikke eksporteres', 'mangler-notert-lokalt': 'Prosesspunkt skal ikke eksporteres' }, equipmentStatusByItemId: {}, updatedAt: '2026-06-02T20:10:00.000Z', schemaVersion: 1 },
      { id: 'r2', missionId: 'm1', templateSlug: 'lagsutstyr-for-utrykning', checkedItemIds: ['fellesutstyr-komplett'], notesByItemId: { 'samband-testet': 'Ett reservebatteri mangler', 'kjoretoy-og-lasting': 'Lastestropp mangler', 'mangler-notert-lokalt': 'Note-only punkt skal ikke eksporteres' }, equipmentStatusByItemId: {}, updatedAt: '2026-06-02T20:11:00.000Z', schemaVersion: 1 },
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

it('exports local task, quick status and resource summary without raw external payloads', () => {
  const markdown = exportMissionStatusSummaryMarkdown({
    mission: buildMission({
      id: 'm1',
      title: 'FIG under innsats',
      createdAt: '2026-06-03T10:00:00.000Z',
      updatedAt: '2026-06-03T10:10:00.000Z',
      phase: 'under',
      role: 'lagforer',
      scenario: 'generelt',
      locationText: 'Innsatsområde nord',
      externalSignals: [
        { source: 'met', kind: 'weather', severity: 'yellow', title: 'Kraftig regn', summary: 'Lokalt sammendrag av varsel', validFrom: null, validTo: null, fetchedAt: '2026-06-03T10:00:00.000Z', staleness: 'fresh', rawRef: 'met:regn-1' },
      ],
      activeChecklistIds: ['fig-under-innsats'],
      notes: 'Kort situasjonsnote uten persondata',
      tasks: [
        { id: 'task-1', title: 'Sikre adkomst fra nord', status: 'in-progress', createdAt: '2026-06-03T10:01:00.000Z', updatedAt: '2026-06-03T10:02:00.000Z' },
        { id: 'task-2', title: 'Avklar lysmast', status: 'done', createdAt: '2026-06-03T10:01:00.000Z', updatedAt: '2026-06-03T10:03:00.000Z' },
        { id: 'task-3', title: 'Trenger transport av ekstra sperremateriell', status: 'needs-assistance', createdAt: '2026-06-03T10:04:00.000Z', updatedAt: '2026-06-03T10:05:00.000Z', notes: 'Ingen navn' },
      ],
      statusLog: [
        { id: 'status-1', message: 'på posisjon', createdAt: '2026-06-03T10:02:00.000Z' },
        { id: 'status-2', message: 'oppgave fullført', createdAt: '2026-06-03T10:03:00.000Z', note: 'Lysmast avklart' },
      ],
      resourceRequests: [
        { id: 'res-1', kind: 'water', status: 'not-started', createdAt: '2026-06-03T10:06:00.000Z', quantity: '20 liter', note: 'Til laget' },
        { id: 'res-2', kind: 'medical-support', status: 'blocked', createdAt: '2026-06-03T10:07:00.000Z', note: 'Kun støttebehov, ikke helsejournal' },
      ],
      contentVersion: 'v1',
      schemaVersion: 1,
    }),
  });

  expect(markdown).toContain('# Lokal oppdragsstatus');
  expect(markdown).toContain('Lagres bare lokalt');
  expect(markdown).toContain('Ikke legg inn eller del navn, ID, pasientdetaljer, helsejournal');
  expect(markdown).toContain('## Situasjonsoversikt nå');
  expect(markdown).toContain('Kraftig regn: Lokalt sammendrag av varsel');
  expect(markdown).toContain('- Aktive sjekklister: 1 registrert lokalt');
  expect(markdown).not.toContain('fig-under-innsats');
  expect(markdown).toContain('- [in-progress] Sikre adkomst fra nord');
  expect(markdown).toContain('- [needs-assistance] Trenger transport av ekstra sperremateriell — Ingen navn');
  expect(markdown).toContain('- på posisjon (2026-06-03T10:02:00.000Z)');
  expect(markdown).toContain('- Vann: not-started — 20 liter — Til laget');
  expect(markdown).toContain('- Medisinsk støtte: blocked — Kun støttebehov, ikke helsejournal');
  expect(markdown).not.toContain('coordinates');
  expect(markdown).not.toContain('geometry');
  expect(markdown).not.toContain('indexedDB');
});

it('rejects sensitive mission text during mission Markdown export', () => {
  const baseMission = buildMission({ id: 'mission-sensitive-export', title: 'FIG eksport' });

  expect(() => exportMissionMarkdown({
    mission: { ...baseMission, notes: 'pasient Ola Nordmann' },
    checklists: [],
    runs: [],
  })).toThrow(/missionMarkdown\.mission\.notes.*patient-reference/);
});

it('rejects sensitive checklist run notes during mission and missing equipment Markdown exports', () => {
  const baseMission = buildMission({ id: 'checklist-sensitive-export', title: 'FIG utstyr', phase: 'for', role: 'lagforer', scenario: 'generelt', locationText: 'Depot' });
  const checklist = {
    slug: 'personlig-utstyr-for-utrykning',
    title: 'Personlig utstyr for utrykning',
    phase: 'for',
    roles: ['lagforer'],
    scenarios: ['generelt'],
    items: [{ id: 'bekledning', label: 'Bekledning valgt etter vær', required: true, sourceIds: ['src-sjekkliste-fig-og-figp'] }],
    sourceIds: ['src-sjekkliste-fig-og-figp'],
  } satisfies OperationalChecklist;
  const runs = [{ id: 'run-sensitive-note', missionId: baseMission.id, templateSlug: checklist.slug, checkedItemIds: [], notesByItemId: { bekledning: 'skjermet tilfluktsrom adresse' }, equipmentStatusByItemId: {}, updatedAt: '2026-06-02T20:10:00.000Z', schemaVersion: 1 }];

  expect(() => exportMissionMarkdown({ mission: baseMission, checklists: [checklist], runs })).toThrow(/missionMarkdown\.runs\.personlig-utstyr-for-utrykning\.notesByItemId\[bekledning\].*shielded-location/);
  expect(() => exportMissingEquipmentBeforeDepartureMarkdown({ mission: baseMission, checklists: [checklist], runs })).toThrow(/missingEquipmentBeforeDeparture\.runs\.personlig-utstyr-for-utrykning\.notesByItemId\[bekledning\].*shielded-location/);
});

it('rejects sensitive mission, task and resource text during status summary Markdown export', () => {
  const baseMission = buildMission({ id: 'status-sensitive-export', title: 'FIG status' });

  expect(() => exportMissionStatusSummaryMarkdown({
    mission: { ...baseMission, locationText: 'privat adresse' },
  })).toThrow(/missionStatusSummary\.mission\.locationText.*private-location/);

  expect(() => exportMissionStatusSummaryMarkdown({
    mission: {
      ...baseMission,
      tasks: [{ id: 'task-sensitive', title: 'pasient Ola Nordmann', status: 'in-progress', createdAt: '2026-06-03T10:01:00.000Z', updatedAt: '2026-06-03T10:02:00.000Z' }],
    },
  })).toThrow(/missionStatusSummary\.tasks\[0\]\.title.*patient-reference/);

  expect(() => exportMissionStatusSummaryMarkdown({
    mission: {
      ...baseMission,
      resourceRequests: [{ id: 'resource-sensitive', kind: 'equipment', status: 'blocked', createdAt: '2026-06-03T10:06:00.000Z', quantity: 'fødselsnummer 01017012345' }],
    },
  })).toThrow(/missionStatusSummary\.resourceRequests\[0\]\.quantity.*national-id/);
});
