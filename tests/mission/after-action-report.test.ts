import type { OperationalChecklist } from '@/lib/content/schemas';
import {
  buildAfterActionReport,
  exportAfterActionJson,
  exportAfterActionMarkdown,
  exportAfterActionPdfReadyHtml,
  exportMbkStatusSummaryMarkdown,
} from '@/lib/mission/after-action-report';
import type { ChecklistRun, MissionContext } from '@/lib/mission/schemas';

const mission: MissionContext = {
  id: 'aar-mission-1',
  title: 'FIG etterinnsats lokal rapport',
  createdAt: '2026-06-03T08:00:00.000Z',
  updatedAt: '2026-06-03T10:30:00.000Z',
  phase: 'etter',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Innsatsområde sør',
  municipality: 'Trondheim',
  externalSignals: [
    { source: 'met', kind: 'weather', severity: 'yellow', title: 'Kraftig regn', summary: 'Lagret sammendrag av regnvarsel', validFrom: null, validTo: null, fetchedAt: '2026-06-03T07:30:00.000Z', staleness: 'stale', rawRef: 'met:regn-1' },
  ],
  externalSignalHistory: [],
  activeChecklistIds: ['etterkontroll-lag'],
  notes: 'Kort lokal oppsummering uten persondata',
  tasks: [
    { id: 'task-1', title: 'Sikre materiell før retur', status: 'done', createdAt: '2026-06-03T08:10:00.000Z', updatedAt: '2026-06-03T09:00:00.000Z' },
    { id: 'task-2', title: 'Etterfyll drivstoff', status: 'needs-assistance', createdAt: '2026-06-03T09:10:00.000Z', updatedAt: '2026-06-03T10:00:00.000Z', notes: 'Avventer lokal logistikk' },
  ],
  statusLog: [
    { id: 'status-1', message: 'på posisjon', createdAt: '2026-06-03T08:15:00.000Z' },
    { id: 'status-2', message: 'oppgave fullført', createdAt: '2026-06-03T09:20:00.000Z', note: 'Sperring tatt ned' },
  ],
  resourceRequests: [
    { id: 'resource-1', kind: 'fuel', status: 'done', createdAt: '2026-06-03T09:30:00.000Z', quantity: '15 liter', note: 'Brukt på kjøretøy' },
    { id: 'resource-2', kind: 'equipment', status: 'blocked', createdAt: '2026-06-03T09:45:00.000Z', quantity: '1 stk', note: 'Skadet arbeidslys' },
  ],
  fieldLogEntries: [],
  ruhReports: [],
  welfareChecks: [],
  lessonsLearned: {
    summary: 'Kort læring fra lokal etterkontroll',
    whatWorked: 'Rask rollefordeling og tydelig depotpunkt',
    improvements: 'Tidligere sambandskontroll',
    followUp: 'Øve skiftbytte uten persondata',
  },
  feedback: {
    leadership: 'Rolig ledelse med tydelige prioriteringer',
    equipment: 'Ekstra arbeidslys bør pakkes',
    procedures: 'Sjekkliste fungerte, men returpunkt bør presiseres',
    training: 'Mer trening på MFE-overlevering',
    safety: 'Sperringer og verneutstyr fungerte',
    communications: 'Kallesett bør repeteres før oppstart',
  },
  completedAt: '2026-06-03T10:40:00.000Z',
  archivedAt: '2026-06-03T10:45:00.000Z',
  contentVersion: 'test-v1',
  schemaVersion: 1,
};

const checklists: OperationalChecklist[] = [
  {
    slug: 'etterkontroll-lag',
    title: 'Etterkontroll lag',
    phase: 'etter',
    roles: ['lagforer'],
    scenarios: ['generelt'],
    sourceIds: ['src-etterkontroll'],
    equipmentRequired: ['kjoretoy', 'belysning'],
    items: [
      { id: 'materiell-sikret', label: 'Materiell er sikret og pakket', required: true, sourceIds: ['src-etterkontroll'] },
      { id: 'skade-tap-notert', label: 'Skade og tap er notert lokalt', required: true, sourceIds: ['src-etterkontroll'] },
      { id: 'frivillig-vask', label: 'Utstyr rengjort ved behov', required: false, sourceIds: ['src-etterkontroll'] },
    ],
  },
];

const runs: ChecklistRun[] = [
  {
    id: 'run-1',
    missionId: mission.id,
    templateSlug: 'etterkontroll-lag',
    checkedItemIds: ['materiell-sikret'],
    notesByItemId: { 'skade-tap-notert': 'Arbeidslys merket for lokal oppfølging' },
    equipmentStatusByItemId: {},
    updatedAt: '2026-06-03T10:05:00.000Z',
    schemaVersion: 1,
  },
];

it('builds a structured after-action report template autofilled from mission, checklists, order, samband and log data', () => {
  const report = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    localOrderText: 'Ordre: støtt evakuering og rydd returpunkt',
    localSambandText: 'Samband: lokalt kallesett brukt',
    localLogText: 'Logg: laget returnerte depot kl 10:20',
  });

  expect(report.schemaVersion).toBe(2);
  expect(report.generatedAt).toBe('2026-06-03T11:00:00.000Z');
  expect(report.mission.title).toBe('FIG etterinnsats lokal rapport');
  expect(report.warnings.join(' ')).toContain('Lagres bare lokalt');
  expect(report.sections.order.summary).toContain('støtt evakuering');
  expect(report.sections.samband.summary).toContain('kallesett');
  expect(report.sections.localLog.entries).toEqual(['Logg: laget returnerte depot kl 10:20']);
  expect(report.sections.contextSignals[0]).toEqual({ source: 'met', kind: 'weather', severity: 'yellow', title: 'Kraftig regn', summary: 'Lagret sammendrag av regnvarsel', staleness: 'stale', fetchedAt: '2026-06-03T07:30:00.000Z' });
  expect(JSON.stringify(report)).not.toContain('coordinates');
  expect(report.sections.checklists[0]).toMatchObject({ checklistSlug: 'etterkontroll-lag', checkedCount: 1, totalCount: 3, sourceIds: ['src-etterkontroll'] });
  expect(report.sections.checklists[0]?.incompleteRequiredItems).toEqual([{ id: 'skade-tap-notert', label: 'Skade og tap er notert lokalt', sourceIds: ['src-etterkontroll'], note: 'Arbeidslys merket for lokal oppfølging' }]);
  expect(report.sections.tasks.open).toHaveLength(1);
  expect(report.sections.resourceConsumption.entries.map((entry) => entry.kindLabel)).toContain('Drivstoff');
  expect(report.sections.equipmentDamageLoss.entries[0]?.note).toContain('Skadet arbeidslys');
  expect(report.sections.lessonsLearned.summary).toContain('lokal etterkontroll');
  expect(report.sections.lessonsLearned.whatWorked).toContain('rollefordeling');
  expect(report.sections.feedback.leadership).toContain('Rolig ledelse');
  expect(report.sections.feedback.communications).toContain('Kallesett');
  expect(report.sections.mbkSummary.status).toBe('needs-attention');
});

it('uses explicit placeholders when optional order, samband, local log, consumption or damage data are absent', () => {
  const report = buildAfterActionReport({ mission: { ...mission, resourceRequests: [] }, checklists, checklistRuns: runs, generatedAt: '2026-06-03T11:00:00.000Z' });

  expect(report.sections.order.summary).toBe('Ikke registrert i lokal oppdragstavle');
  expect(report.sections.samband.summary).toBe('Ikke registrert i lokal oppdragstavle');
  expect(report.sections.localLog.entries).toEqual(['Ikke registrert i lokal oppdragstavle']);
  expect(report.sections.resourceConsumption.entries).toEqual([]);
  expect(report.sections.resourceConsumption.placeholder).toContain('Ingen lokal ressursbruk');
  expect(report.sections.equipmentDamageLoss.entries).toEqual([]);
  expect(report.sections.equipmentDamageLoss.placeholder).toContain('Ingen skade eller tap');
});

it('uses structured mission field-log entries in after-action local log section', () => {
  const report = buildAfterActionReport({
    mission: {
      ...mission,
      fieldLogEntries: [
        {
          id: 'field-map-entry',
          timestamp: '2026-06-03T10:10:00.000Z',
          category: 'observasjon',
          text: 'Vannstand synker ved sektor A',
          locationText: 'Skjematisk 20,30',
          criticalObservation: false,
          mustBeForwarded: false,
          mapReference: { source: 'map-drawing', objectId: 'sector-a', label: 'Sektor A', point: { x: 20, y: 30 } },
        },
      ],
    },
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
  });

  expect(report.sections.localLog.registered).toBe(true);
  expect(report.sections.localLog.entries.join('\n')).toContain('Vannstand synker ved sektor A');
  expect(report.sections.localLog.entries.join('\n')).toContain('Sektor A 20,30');
  expect(JSON.stringify(report)).not.toMatch(/lat|lon|geometry|rawRef/i);
});

it('builds a RUH and welfare follow-up summary from critical logs and equipment issues', () => {
  const report = buildAfterActionReport({
    mission: {
      ...mission,
      id: 'mission-ruh-summary',
      resourceRequests: [
        { id: 'resource-ruh-summary', kind: 'equipment', status: 'blocked', createdAt: '2026-06-03T10:15:00.000Z', quantity: '1 stk', note: 'Defekt pakning' },
      ],
      fieldLogEntries: [
        {
          id: 'field-ruh-summary',
          timestamp: '2026-06-03T10:10:00.000Z',
          category: 'hms-avvik',
          text: 'Nestenulykke ved pumpe',
          criticalObservation: true,
          mustBeForwarded: true,
        },
      ],
    },
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
  });

  expect(report.sections.ruhWelfareSummary.status).toBe('needs-review');
  expect(report.sections.ruhWelfareSummary.warning).toContain('Ikke offisiell HMS/RUH-innsending');
  expect(report.sections.ruhWelfareSummary.items.join('\n')).toContain('Nestenulykke ved pumpe');
  expect(report.sections.ruhWelfareSummary.items.join('\n')).toContain('Defekt pakning');
  expect(exportAfterActionMarkdown(report)).toContain('## RUH/velferd oppfølging');
  expect(exportAfterActionMarkdown(report)).toContain('Lokal oppfølgingsliste for RUH/velferd');
  const json = exportAfterActionJson(report);
  expect(json).toContain('Nestenulykke ved pumpe');
  expect(json).toContain('Defekt pakning');
  expect(json).not.toContain('resource-ruh-summary');
  expect(json).not.toContain('field-ruh-summary');
  expect(json).not.toContain('linkedMissionId');
  expect(exportAfterActionPdfReadyHtml(report)).toContain('RUH/velferd oppfølging');
});

it('keeps RUH and welfare summary ok for routine reminders and positive feedback', () => {
  const report = buildAfterActionReport({
    mission: {
      ...mission,
      resourceRequests: [],
      fieldLogEntries: [],
      ruhReports: [],
      welfareChecks: [
        {
          id: 'welfare-routine-reminders',
          timestamp: '2026-06-03T10:20:00.000Z',
          physicalLoad: 'lav',
          mentalLoad: 'lav',
          needsRest: false,
          needsRelief: false,
          reminders: { water: true, food: true, warmth: true, rest: true, dryClothing: true },
        },
      ],
      lessonsLearned: { summary: '', whatWorked: '', improvements: '', followUp: '' },
      feedback: {
        leadership: '',
        equipment: 'Utstyr fungerte',
        procedures: '',
        training: '',
        safety: 'Sperringer fungerte',
        communications: '',
      },
    },
    checklists: [],
    checklistRuns: [],
    generatedAt: '2026-06-03T11:00:00.000Z',
  });

  expect(report.sections.ruhWelfareSummary.status).toBe('ok');
  expect(report.sections.ruhWelfareSummary.items).toEqual([]);

  const markdown = exportAfterActionMarkdown(report);
  const ruhWelfareSection = markdown.split('## RUH/velferd oppfølging')[1]?.split('## Erfaringer og læring')[0] ?? '';
  expect(ruhWelfareSection).toContain('Ingen lokale RUH/velferd-oppfølgingskandidater');
  expect(ruhWelfareSection).not.toContain('Sperringer fungerte');
  expect(ruhWelfareSection).not.toContain('Utstyr fungerte');
  expect(markdown).toContain('Sikkerhet: Sperringer fungerte');
  expect(markdown).toContain('Utstyr: Utstyr fungerte');
});

it('blocks high-confidence sensitive after-action local order, log, mission and resource notes', () => {
  expect(() => buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    localOrderText: 'fødselsnummer 01017012345',
  })).toThrow(/afterAction\.localOrderText/i);

  expect(() => buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    localLogText: 'pasient Ola Nordmann',
  })).toThrow(/afterAction\.localLogText/i);

  expect(() => buildAfterActionReport({
    mission: { ...mission, notes: 'skjermet tilfluktsrom adresse' },
    checklists,
    checklistRuns: runs,
  })).toThrow(/afterAction\.mission\.notes/i);

  expect(() => buildAfterActionReport({
    mission: {
      ...mission,
      resourceRequests: [{ ...mission.resourceRequests[0], note: 'privat adresse ved depot' }],
    },
    checklists,
    checklistRuns: runs,
  })).toThrow(/afterAction\.mission\.resourceRequests\[0\]\.note/i);
});

it('rejects high-confidence sensitive map labels before building an after-action report', () => {
  expect(() => buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapState: {
      markers: [{ id: 'marker-sensitive-label', missionId: mission.id, itemType: 'marker', kind: 'observation', label: 'pasient Ola Nordmann', point: { x: 22, y: 33 }, createdAt: '2026-06-03T09:00:00.000Z' }],
      drawings: [],
    },
  })).toThrow(/afterAction\.mapState\.markers\[0\]\.label/i);
});

it('includes sanitized map package summary in after-action exports', () => {
  const unsafeMapPackage = {
    id: 'trondheim-lokal',
    title: 'Trondheim lokalpakke',
    attribution: 'Demo attribution',
    version: '2026.06-a',
    provenance: 'Local training package bundled with app',
    runtimeFormat: 'pmtiles',
    approvedForOfflineUse: true,
    url: '/map-packages/trondheim-demo.pmtiles',
    styleUrl: '/map-packages/trondheim-demo-style.json',
    tileUrl: 'https://tiles.example.invalid/{z}/{x}/{y}.pbf',
    bounds: [10.2, 63.2, 10.6, 63.6],
    center: [10.4, 63.4],
  };

  const report = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapPackage: unsafeMapPackage,
  });

  expect(report.sections.mapPackage).toEqual({
    id: 'trondheim-lokal',
    title: 'Trondheim lokalpakke',
    attribution: 'Demo attribution',
    version: '2026.06-a',
    provenance: 'Local training package bundled with app',
  });

  const markdown = exportAfterActionMarkdown(report);
  const html = exportAfterActionPdfReadyHtml(report);
  const json = exportAfterActionJson(report);
  expect(markdown).toContain('## Kartpakke');
  expect(markdown).toContain('Pakke-ID: trondheim-lokal');
  expect(markdown).toContain('Trondheim lokalpakke');
  expect(markdown).toContain('Local training package bundled with app');
  expect(html).toContain('Kartpakke');
  expect(html).toContain('Trondheim lokalpakke');
  expect(html).toContain('Local training package bundled with app');
  expect(json).toContain('Trondheim lokalpakke');
  expect(json).toContain('Local training package bundled with app');

  for (const exported of [json, markdown, html]) {
    expect(exported).not.toContain('https://');
    expect(exported).not.toContain('/map-packages/trondheim-demo.pmtiles');
    expect(exported).not.toContain('/map-packages/trondheim-demo-style.json');
    expect(exported).not.toContain('styleUrl');
    expect(exported).not.toContain('tileUrl');
    expect(exported).not.toContain('bounds');
    expect(exported).not.toContain('center');
  }
});

it('omits unsafe map package ids while preserving useful provenance in after-action exports', () => {
  const mapPackage = {
    id: '/map-packages/foo.pmtiles',
    title: '  Sanitert lokal kartpakke  ',
    attribution: '  Demo attribution  ',
    version: '  2026.06-a  ',
    provenance: '  Kontrollert opprinnelse for øving  ',
    url: '/map-packages/foo.pmtiles',
    styleUrl: '/map-packages/foo-style.json',
    tileUrl: 'https://tiles.example.invalid/{z}/{x}/{y}.pbf',
    bounds: [10.2, 63.2, 10.6, 63.6],
    center: [10.4, 63.4],
    objectId: 'marker-secret-object',
  };

  const report = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapPackage,
  });

  expect(report.sections.mapPackage).toEqual({
    id: '',
    title: 'Sanitert lokal kartpakke',
    attribution: 'Demo attribution',
    version: '2026.06-a',
    provenance: 'Kontrollert opprinnelse for øving',
  });

  const markdown = exportAfterActionMarkdown(report);
  const html = exportAfterActionPdfReadyHtml(report);
  const json = exportAfterActionJson(report);
  for (const exported of [JSON.stringify(report), json, markdown, html]) {
    expect(exported).toContain('Sanitert lokal kartpakke');
    expect(exported).toContain('Kontrollert opprinnelse for øving');
    expect(exported).not.toContain('/map-packages/foo.pmtiles');
    expect(exported).not.toContain('/map-packages/foo-style.json');
    expect(exported).not.toContain('https://tiles.example.invalid');
    expect(exported).not.toContain('marker-secret-object');
    expect(exported).not.toContain('styleUrl');
    expect(exported).not.toContain('tileUrl');
    expect(exported).not.toContain('bounds');
    expect(exported).not.toContain('center');
    expect(exported).not.toContain('objectId');
  }
});

it.each([
  { id: 'https://tiles.example.invalid/package.pmtiles', title: 'URL id' },
  { id: 'Marker Object 1', title: 'Object id-ish uppercase id' },
  { id: 'marker-secret-object', title: 'Marker object id-ish id' },
  { id: 'aar-mission-1', title: 'Mission object id-ish id' },
  { id: 'folder-mission', title: 'Mission fixture id-ish id' },
  { id: 'task-1', title: 'Task id-ish id' },
  { id: 'status-1', title: 'Status id-ish id' },
  { id: 'sector-a', title: 'Sector id-ish id' },
  { id: 'field-folder', title: 'Field log id-ish id' },
  { id: 'trd-depot', title: 'Map feature id-ish id' },
  { id: 'resource-incident-pmtiles', title: 'Forged PMTiles resource id' },
  { id: 'custom-incident-pmtiles', title: 'Forged PMTiles custom id' },
  { id: 'map-packages', title: 'Directory-like package id' },
  { id: 'foo-map-packages-bar', title: 'Embedded directory-like package id' },
])('blanks unsafe map package id $id in after-action summaries', ({ id, title }) => {
  const report = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapPackage: {
      id,
      title,
      provenance: 'Useful local provenance',
    },
  });

  expect(report.sections.mapPackage).toMatchObject({ id: '', title, provenance: 'Useful local provenance' });
  expect(exportAfterActionMarkdown(report)).not.toContain(id);
  expect(exportAfterActionJson(report)).not.toContain(id);
  expect(JSON.stringify(report.sections.mapPackage)).not.toContain(id);
});

it('strips URL and path-like content from after-action map package text fields', () => {
  const report = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapPackage: {
      id: 'trondheim-lokal',
      title: 'https://tiles.example.invalid/foo',
      attribution: '/map-packages/foo-style.json',
      version: 'https://tiles.example.invalid/pkg.pmtiles',
      provenance: 'Kontrollert lokal øvingsproveniens',
      runtimeFormat: 'pmtiles',
      approvedForOfflineUse: true,
    },
  });

  expect(report.sections.mapPackage).toEqual({
    id: 'trondheim-lokal',
    title: '',
    attribution: '',
    version: '',
    provenance: 'Kontrollert lokal øvingsproveniens',
  });
  for (const exported of [JSON.stringify(report), exportAfterActionMarkdown(report), exportAfterActionPdfReadyHtml(report), exportAfterActionJson(report)]) {
    expect(exported).not.toContain('https://');
    expect(exported).not.toContain('/map-packages/foo-style.json');
    expect(exported).not.toContain('pkg.pmtiles');
    expect(exported).toContain('Kontrollert lokal øvingsproveniens');
  }
});

it('strips relative and local filesystem paths from after-action map package text fields', () => {
  const report = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapPackage: {
      id: 'trondheim-lokal',
      title: 'Kontrollert lokal kartpakke',
      attribution: 'assets/private/map.mbtiles',
      version: '2026.06-a',
      provenance: 'Built from /Users/reidar/secret/source.mbtiles',
    },
  });

  expect(report.sections.mapPackage).toEqual({
    id: 'trondheim-lokal',
    title: 'Kontrollert lokal kartpakke',
    attribution: '',
    version: '2026.06-a',
    provenance: '',
  });
  for (const exported of [JSON.stringify(report.sections.mapPackage), exportAfterActionMarkdown(report), exportAfterActionJson(report)]) {
    expect(exported).toContain('Kontrollert lokal kartpakke');
    expect(exported).not.toContain('assets/private/map.mbtiles');
    expect(exported).not.toContain('/Users/reidar/secret/source.mbtiles');
  }
});

it('does not create after-action map package sections from id-only or attribution-version-only input', () => {
  const idOnlyReport = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapPackage: { id: 'trondheim-lokal' },
  });
  const attributionVersionOnlyReport = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapPackage: { attribution: 'Demo attribution', version: '2026.06-a' },
  });

  expect(idOnlyReport.sections.mapPackage).toBeUndefined();
  expect(attributionVersionOnlyReport.sections.mapPackage).toBeUndefined();
  expect(exportAfterActionJson(idOnlyReport)).not.toContain('mapPackage');
  expect(exportAfterActionMarkdown(idOnlyReport)).not.toContain('## Kartpakke');
  expect(exportAfterActionMarkdown(attributionVersionOnlyReport)).not.toContain('## Kartpakke');
});

it('includes sanitized schematic map summary in after-action report when provided', () => {
  const report = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapState: {
      markers: [{ id: 'marker-ko', missionId: mission.id, itemType: 'marker', kind: 'il-ko', label: 'KO lokal', point: { x: 22, y: 33 }, createdAt: '2026-06-03T09:00:00.000Z' }],
      drawings: [{ id: 'sector-a', missionId: mission.id, itemType: 'drawing', kind: 'sector', label: 'Sektor A', points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 20, y: 30 }], createdAt: '2026-06-03T09:10:00.000Z' }],
    },
  });

  expect(report.sections.mapSummary).toMatchObject({ markerCount: 1, drawingCount: 1 });
  expect(report.sections.mapSummary.items.join(' ')).toContain('KO lokal');
  expect(report.sections.mapSummary.items.join(' ')).toContain('Sektor A');
  expect(JSON.stringify(report.sections.mapSummary)).not.toMatch(/lat|lon|geometry|rawRef|marker-ko|sector-a/i);
  expect(exportAfterActionMarkdown(report)).toContain('## Kart (skjematisk lokal oppsummering)');
  expect(exportAfterActionMarkdown(report)).toContain('KO lokal');
  expect(exportAfterActionPdfReadyHtml(report)).toContain('Sektor A');

  const malformedReport = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapState: {
      markers: [{ id: 'real-marker', itemType: 'marker', kind: 'il-ko', label: 'Ekte koordinat', point: { lat: 63.4, lon: 10.4 }, createdAt: '2026-06-03T09:00:00.000Z', rawRef: 'secret' }],
      drawings: [{ id: 'bad-sector', itemType: 'drawing', kind: 'sector', label: 'For få punkter', points: [{ x: 10, y: 10 }], createdAt: '2026-06-03T09:10:00.000Z', geometry: { type: 'Point' } }],
    } as any,
  });
  expect(malformedReport.sections.mapSummary).toMatchObject({ markerCount: 0, drawingCount: 0, items: [] });
});

it('excludes map objects from other missions in the current mission after-action report', () => {
  const report = buildAfterActionReport({
    mission,
    checklists,
    checklistRuns: runs,
    generatedAt: '2026-06-03T11:00:00.000Z',
    mapState: {
      markers: [
        { id: 'marker-current', missionId: mission.id, itemType: 'marker', kind: 'il-ko', label: 'Current', point: { x: 22, y: 33 }, createdAt: '2026-06-03T09:00:00.000Z' },
        { id: 'marker-wrong', missionId: 'other-mission', itemType: 'marker', kind: 'observation', label: 'Wrong', point: { x: 44, y: 55 }, createdAt: '2026-06-03T09:01:00.000Z' },
      ],
      drawings: [
        { id: 'drawing-current', missionId: mission.id, itemType: 'drawing', kind: 'sector', label: 'Current sector', points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 20, y: 30 }], createdAt: '2026-06-03T09:10:00.000Z' },
        { id: 'drawing-wrong', missionId: 'other-mission', itemType: 'drawing', kind: 'sector', label: 'Wrong sector', points: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 50, y: 60 }], createdAt: '2026-06-03T09:11:00.000Z' },
      ],
    },
  });

  const items = report.sections.mapSummary.items.join(' ');
  expect(report.sections.mapSummary).toMatchObject({ markerCount: 1, drawingCount: 1 });
  expect(items).toContain('Current');
  expect(items).toContain('Current sector');
  expect(items).not.toContain('Wrong');
  expect(exportAfterActionMarkdown(report)).not.toContain('Wrong');
});

it('does not classify medical personellskade resource notes as equipment damage or loss', () => {
  const report = buildAfterActionReport({
    mission: {
      ...mission,
      resourceRequests: [
        {
          id: 'resource-medical-personellskade',
          kind: 'medical-support',
          status: 'done',
          createdAt: '2026-06-03T09:55:00.000Z',
          note: 'Personellskade fulgt opp uten helseopplysninger i appen',
        },
      ],
    },
    checklists: [],
    checklistRuns: [],
    generatedAt: '2026-06-03T11:00:00.000Z',
  });

  expect(report.sections.equipmentDamageLoss.entries).toEqual([]);
  expect(report.sections.equipmentDamageLoss.placeholder).toContain('Ingen skade eller tap');
  expect(report.sections.mbkSummary.equipmentDamageLossCount).toBe(0);
  expect(report.sections.mbkSummary.status).toBe('ok');
});

it('classifies actual equipment damage or loss notes with equipment context', () => {
  const report = buildAfterActionReport({
    mission: {
      ...mission,
      resourceRequests: [
        {
          id: 'resource-defekt-pumpe',
          kind: 'fuel',
          status: 'blocked',
          createdAt: '2026-06-03T09:55:00.000Z',
          note: 'Defekt pumpe ved tankpunkt',
        },
        {
          id: 'resource-tapt-samband',
          kind: 'transport',
          status: 'needs-assistance',
          createdAt: '2026-06-03T10:05:00.000Z',
          note: 'Tapt samband under retur',
        },
      ],
    },
    checklists: [],
    checklistRuns: [],
    generatedAt: '2026-06-03T11:00:00.000Z',
  });

  expect(report.sections.equipmentDamageLoss.entries.map((entry) => entry.id)).toEqual(['resource-defekt-pumpe', 'resource-tapt-samband']);
  expect(report.sections.mbkSummary.equipmentDamageLossCount).toBe(2);
  expect(report.sections.mbkSummary.status).toBe('needs-attention');
});

it('exports MBK status summary from checklist, resource and equipment status fields available today', () => {
  const report = buildAfterActionReport({ mission, checklists, checklistRuns: runs, generatedAt: '2026-06-03T11:00:00.000Z' });
  const markdown = exportMbkStatusSummaryMarkdown(report);

  expect(report.sections.mbkSummary.checkedEquipmentItems).toBe(1);
  expect(report.sections.mbkSummary.incompleteRequiredEquipmentItems).toBe(1);
  expect(report.sections.mbkSummary.openEquipmentRequests).toBe(1);
  expect(markdown).toContain('# MBK-status / materiellberedskap');
  expect(markdown).toContain('needs-attention');
  expect(markdown).toContain('Skade/tap registrert: 1');
  expect(markdown).toContain('Etterkontroll lag');
});

it('does not add empty parentheses for checklist items without source IDs in Markdown export', () => {
  const checklistWithoutItemSourceIds: OperationalChecklist[] = [
    {
      slug: 'checklist-without-item-sources',
      title: 'Sjekkliste uten punktkilder',
      phase: 'etter',
      roles: ['lagforer'],
      scenarios: ['generelt'],
      sourceIds: ['src-checklist-without-item-sources'],
      items: [{ id: 'materiell-retur', label: 'Materiell returkontroll', required: true }],
    },
  ];
  const report = buildAfterActionReport({
    mission: { ...mission, resourceRequests: [] },
    checklists: checklistWithoutItemSourceIds,
    checklistRuns: [{ ...runs[0], templateSlug: 'checklist-without-item-sources', checkedItemIds: [] }],
    generatedAt: '2026-06-03T11:00:00.000Z',
  });

  const markdown = exportAfterActionMarkdown(report);

  expect(markdown).toContain('- Materiell returkontroll');
  expect(markdown).not.toContain('Materiell returkontroll ()');
});

it('does not classify every required checklist item as MBK equipment just because checklist-level equipment is required', () => {
  const mixedChecklist: OperationalChecklist[] = [
    {
      slug: 'mixed-equipment-context',
      title: 'Blandet sjekkliste med materiellkontekst',
      phase: 'etter',
      roles: ['lagforer'],
      scenarios: ['generelt'],
      sourceIds: ['src-mixed'],
      equipmentRequired: ['kjoretoy', 'belysning'],
      items: [
        { id: 'materiell-pakket', label: 'Materiell er pakket for retur', required: true, sourceIds: ['src-mixed'] },
        { id: 'debrief-gjennomfort', label: 'Debrief er gjennomført med laget', required: true, sourceIds: ['src-mixed'] },
      ],
    },
  ];
  const report = buildAfterActionReport({
    mission: { ...mission, resourceRequests: [] },
    checklists: mixedChecklist,
    checklistRuns: [{ ...runs[0], templateSlug: 'mixed-equipment-context', checkedItemIds: [] }],
    generatedAt: '2026-06-03T11:00:00.000Z',
  });

  expect(report.sections.mbkSummary.incompleteRequiredEquipmentItems).toBe(1);
  expect(report.sections.mbkSummary.checklistSummaries[0]).toMatchObject({
    checklistSlug: 'mixed-equipment-context',
    incompleteRequiredEquipmentItems: 1,
  });
});

it('does not classify checklist items as MBK equipment from substring-only keyword matches', () => {
  const falsePositiveChecklist: OperationalChecklist[] = [
    {
      slug: 'after-action-mbk-token-regression',
      title: 'Etter innsats MBK token-regresjon',
      phase: 'etter',
      roles: ['lagforer'],
      scenarios: ['generelt'],
      sourceIds: ['src-after-action-mbk-regression'],
      equipmentRequired: ['belysning', 'kjoretoy'],
      items: [
        {
          id: 'skade-eller-personellskade-eskalering',
          label: 'Skade, nestenulykke eller mulig personellskade er eskalert til ansvarlig leder og ordinære systemer; ikke bruk appen som helsejournal',
          required: true,
          sourceIds: ['src-after-action-mbk-regression'],
        },
        {
          id: 'personell-status',
          label: 'Personell er fulgt opp uten å registrere helseopplysninger i appen',
          required: true,
          sourceIds: ['src-after-action-mbk-regression'],
        },
        {
          id: 'defuse-gjennomgang',
          label: 'Defuse er vurdert uten personlige reaksjoner i lokal rapport',
          required: true,
          sourceIds: ['src-after-action-mbk-regression'],
        },
        {
          id: 'efok-oppfolging-vurdert',
          label: 'EFOK eller annen psykososial oppfølging er vurdert; ikke før helseopplysninger i appen',
          required: true,
          sourceIds: ['src-after-action-mbk-regression'],
        },
        {
          id: 'skriftlig-rapport-paminnelse',
          label: 'Skriftlig rapport til beredskapsvakt er påminnet uten sensitive detaljer',
          required: true,
          sourceIds: ['src-after-action-mbk-regression'],
        },
        {
          id: 'arbeidslys-kontrollert',
          label: 'Arbeidslys og belysning er kontrollert før retur',
          required: true,
          sourceIds: ['src-after-action-mbk-regression'],
        },
        {
          id: 'lys-kontrollert',
          label: 'Lys er kontrollert for depotretur',
          required: true,
          sourceIds: ['src-after-action-mbk-regression'],
        },
        {
          id: 'kjoretoy-samband-verneutstyr',
          label: 'Kjøretøy, samband og verneutstyr er kontrollert for ny innsats',
          required: true,
          sourceIds: ['src-after-action-mbk-regression'],
        },
      ],
    },
  ];
  const report = buildAfterActionReport({
    mission: { ...mission, resourceRequests: [] },
    checklists: falsePositiveChecklist,
    checklistRuns: [{ ...runs[0], templateSlug: 'after-action-mbk-token-regression', checkedItemIds: ['arbeidslys-kontrollert', 'lys-kontrollert'] }],
    generatedAt: '2026-06-03T11:00:00.000Z',
  });

  expect(report.sections.mbkSummary.checkedEquipmentItems).toBe(2);
  expect(report.sections.mbkSummary.incompleteRequiredEquipmentItems).toBe(1);
  expect(report.sections.mbkSummary.checklistSummaries[0]).toMatchObject({
    checklistSlug: 'after-action-mbk-token-regression',
    checkedEquipmentItems: 2,
    incompleteRequiredEquipmentItems: 1,
  });
});

it('exports after-action Markdown, JSON and PDF-ready HTML with local-only warning language', () => {
  const report = buildAfterActionReport({ mission, checklists, checklistRuns: runs, generatedAt: '2026-06-03T11:00:00.000Z' });
  const markdown = exportAfterActionMarkdown(report);
  const json = exportAfterActionJson(report);
  const html = exportAfterActionPdfReadyHtml(report);

  expect(markdown).toContain('# Etteraksjonsrapport');
  expect(markdown).toContain('PDF-klar utskrift');
  expect(markdown).toContain('Eksporterte filer kan inneholde operasjonelt sensitiv informasjon');
  expect(markdown).toContain('## Ressursbruk');
  expect(markdown).toContain('## Skade/tap på utstyr');
  expect(markdown).toContain('## RUH/velferd oppfølging');
  expect(markdown).toContain('Lokal oppfølgingsliste for RUH/velferd');
  expect(markdown).toContain('## MBK-status / materiellberedskap');
  expect(markdown).toContain('## Erfaringer og læring');
  expect(markdown).toContain('Tidligere sambandskontroll');
  expect(markdown).toContain('## Strukturert tilbakemelding');
  expect(markdown).toContain('Ledelse: Rolig ledelse');
  expect(markdown).toContain('Samband/kommunikasjon: Kallesett');
  expect(markdown).toContain('Ikke offisiell innsending');

  const parsed = JSON.parse(json);
  expect(parsed.schemaVersion).toBe(2);
  expect(parsed.generatedAt).toBe('2026-06-03T11:00:00.000Z');
  expect(parsed.mission.id).toBeUndefined();
  expect(parsed.mission.activeChecklistIds).toBeUndefined();
  expect(parsed.mission.notes).toBeUndefined();
  expect(parsed.sections.lessonsLearned.followUp).toContain('skiftbytte');
  expect(parsed.sections.feedback.equipment).toContain('arbeidslys');
  expect(parsed.warnings.join(' ')).toContain('Lagres bare lokalt');
  expect(JSON.stringify(parsed)).not.toMatch(/geometry|aar-mission-1|task-1|task-2|status-1|status-2|resource-1|resource-2|\"id\"|\"note\"|\"notes\"|activeChecklistIds|rawRef|objectId|linkedMissionId/);

  expect(html).toContain('<!doctype html>');
  expect(html).toContain('PDF-klar utskrift / bruk nettleserens Skriv ut &gt; Lagre som PDF');
  expect(html).toContain('Etteraksjonsrapport');
  expect(html).toContain('Skadet arbeidslys');
  expect(html).not.toContain('<script');
});
