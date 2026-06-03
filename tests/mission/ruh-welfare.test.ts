import { expect, it } from 'vitest';
import {
  MissionContextSchema,
  RuhReportSchema,
  WelfareCheckSchema,
} from '@/lib/mission/schemas';
import {
  RUH_CATEGORY_LABELS,
  RUH_LOCAL_ONLY_WARNING,
  RUH_PATIENT_DATA_WARNING,
  RUH_RISK_LABELS,
  WELFARE_NON_MEDICAL_WARNING,
  exportRuhJson,
  exportRuhMarkdown,
  exportWelfareJson,
  exportWelfareMarkdown,
  summarizeWelfareCheck,
} from '@/lib/mission/ruh-welfare';
import {
  MEDIA_ATTACHMENT_SAFETY_NOTES,
  MAN_DOWN_POST_MVP_NOTE,
  mediaSafetyNotesMarkdown,
} from '@/lib/mission/media-safety';

const baseMission = MissionContextSchema.parse({
  id: 'm6b-test',
  title: 'FIG RUH og velferd',
  createdAt: '2026-06-04T10:00:00.000Z',
  updatedAt: '2026-06-04T10:10:00.000Z',
  phase: 'under',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Innsatsområde vest',
  externalSignals: [],
  activeChecklistIds: [],
  notes: '',
  contentVersion: 'test-v1',
  schemaVersion: 1,
});

it('defaults old missions to empty RUH reports and welfare checks', () => {
  expect(baseMission.ruhReports).toEqual([]);
  expect(baseMission.welfareChecks).toEqual([]);
});

it('validates simplified RUH fields and exports local non-official RUH without patient/persondata', () => {
  const report = RuhReportSchema.parse({
    id: 'ruh-1',
    timestamp: '2026-06-04T10:15:00.000Z',
    category: 'nestenulykke',
    whatHappened: 'Nesten fall ved glatt underlag uten navn eller ID',
    immediateMeasure: 'Sperret av område og informerte laget',
    risk: 'hoy',
    followUpNeeded: true,
    linkedMissionId: baseMission.id,
  });

  expect(RUH_CATEGORY_LABELS[report.category]).toMatch(/nestenulykke/i);
  expect(RUH_RISK_LABELS[report.risk]).toMatch(/høy/i);

  const markdown = exportRuhMarkdown({ mission: baseMission, reports: [report] });
  expect(markdown).toContain('# Lokal forenklet RUH');
  expect(markdown).toContain(RUH_LOCAL_ONLY_WARNING);
  expect(markdown).toContain(RUH_PATIENT_DATA_WARNING);
  expect(markdown).toContain('Ikke offisiell HMS/RUH-innsending');
  expect(markdown).toContain('Nesten fall ved glatt underlag');
  expect(markdown).toContain('Oppfølging: Ja');
  expect(markdown).not.toContain(baseMission.id);

  const exportedJson = JSON.parse(exportRuhJson({ mission: baseMission, reports: [report] }));
  expect(exportedJson.mission.id).toBeUndefined();
  expect(exportedJson.reports[0].id).toBeUndefined();
  expect(exportedJson.reports[0].linkedMissionId).toBeUndefined();
  expect(exportedJson.reports[0].categoryLabel).toBe('Nestenulykke');
  expect(exportedJson.warnings.join(' ')).toMatch(/ikke offisiell HMS\/RUH/i);
  expect(JSON.stringify(exportedJson)).not.toMatch(/indexedDB|objectStore|Exif|GPSLatitude|GPSLongitude/i);
});

it('records non-medical welfare/load checks with rest relief flags and reminder summary/export', () => {
  const check = WelfareCheckSchema.parse({
    id: 'welfare-1',
    timestamp: '2026-06-04T10:30:00.000Z',
    physicalLoad: 'hoy',
    mentalLoad: 'moderat',
    needsRest: true,
    needsRelief: true,
    reminders: {
      water: true,
      food: false,
      warmth: true,
      rest: true,
      dryClothing: false,
    },
    note: 'Lang innsats, bytt lag når mulig',
  });

  expect(summarizeWelfareCheck(check)).toContain('Fysisk: Høy');
  expect(summarizeWelfareCheck(check)).toContain('Trenger hvile');
  expect(summarizeWelfareCheck(check)).toContain('Vann');
  expect(summarizeWelfareCheck(check)).toContain('Varme');

  const markdown = exportWelfareMarkdown({ mission: baseMission, checks: [check] });
  expect(markdown).toContain('# Lokal velferds- og belastningssjekk');
  expect(markdown).toContain(WELFARE_NON_MEDICAL_WARNING);
  expect(markdown).toContain('Fysisk: Høy');
  expect(markdown).toContain('Avlastning: Ja');
  expect(markdown).not.toMatch(/diagnose|journal|pasient/i);

  const exportedJson = JSON.parse(exportWelfareJson({ mission: baseMission, checks: [check] }));
  expect(exportedJson.checks[0].id).toBeUndefined();
  expect(exportedJson.checks[0].reminderLabels).toEqual(['Vann', 'Varme', 'Hvile']);
  expect(JSON.stringify(exportedJson)).not.toMatch(/indexedDB|objectStore|Exif|GPSLatitude|GPSLongitude/i);
});

it('documents photo/video attachment deferral, EXIF/GPS stripping, storage/privacy warnings and man-down post-MVP scope', () => {
  expect(MEDIA_ATTACHMENT_SAFETY_NOTES.photo.status).toBe('deferred-mvp');
  expect(MEDIA_ATTACHMENT_SAFETY_NOTES.video.status).toBe('deferred-mvp');
  const notes = mediaSafetyNotesMarkdown();
  expect(notes).toContain('Foto/video-vedlegg er utsatt i MVP');
  expect(notes).toMatch(/EXIF\/GPS-metadata.*fjernes/i);
  expect(notes).toMatch(/lagringsstørrelse/i);
  expect(notes).toMatch(/persondata|pasientdata/i);
  expect(notes).toMatch(/eksplisitt personvernadvarsel/i);
  expect(MAN_DOWN_POST_MVP_NOTE).toMatch(/sikkerhetskritisk post-MVP/i);
  expect(MAN_DOWN_POST_MVP_NOTE).toMatch(/pålitelighet|styring|governance/i);
});
