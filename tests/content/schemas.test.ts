import {
  ActionCardSchema,
  GlossaryTermSchema,
  OperationalChecklistSchema,
  ProtectionMeasureSchema,
  SourceDocumentSchema,
  TrainingPathSchema,
} from '@/lib/content/schemas';

it('accepts a valid source document', () => {
  const result = SourceDocumentSchema.safeParse({
    id: 'src-5-punktsordre',
    title: 'SRC - 5-punktsordre',
    sourcePath: 'source-extracts/SRC - 5-punktsordre.md',
    sourceType: 'source-extract',
    status: 'unverified',
    verifiedAt: '2026-06-03',
    reviewAfter: '2026-09-01',
    owner: 'content-team',
    reviewer: 'fagansvarlig',
    reviewRisk: 'high',
    body: 'Kildeinnhold',
    warnings: ['Kontroller mot gjeldende planverk'],
  });
  expect(result.success).toBe(true);
});

it('rejects impossible source review dates', () => {
  const result = SourceDocumentSchema.safeParse({
    id: 'src-bad-date',
    title: 'SRC - Bad date',
    sourcePath: 'source-extracts/SRC - Bad date.md',
    sourceType: 'source-extract',
    status: 'verified',
    verifiedAt: '2026-99-99',
    reviewAfter: '2026-02-31',
    owner: 'content-team',
    reviewer: 'fagansvarlig',
    reviewRisk: 'low',
    body: 'Kildeinnhold',
    warnings: [],
  });

  expect(result.success).toBe(false);
});

it('requires review scheduling metadata for high-risk source documents', () => {
  const result = SourceDocumentSchema.safeParse({
    id: 'src-high-risk',
    title: 'SRC - High risk',
    sourcePath: 'source-extracts/SRC - High risk.md',
    sourceType: 'source-extract',
    status: 'unverified',
    verifiedAt: '2026-06-03',
    owner: 'content-team',
    reviewer: 'fagansvarlig',
    reviewRisk: 'high',
    body: 'Kildeinnhold',
    warnings: ['Kontroller mot gjeldende planverk'],
  });

  expect(result.success).toBe(false);
});

it('rejects local filesystem source paths', () => {
  const base = {
    id: 'src-local',
    title: 'SRC - Local',
    sourceType: 'source-extract',
    status: 'unverified',
    body: 'Kildeinnhold',
    warnings: [],
  };

  for (const sourcePath of ['/tmp/private.md', '/etc/passwd', '~/vault/private.md', 'file:///tmp/private.md', '../private.md', String.raw`C:\Users\Reidar\x.md`, 'source-extracts/../private.md', 'curated-notes/../private.md']) {
    expect(SourceDocumentSchema.safeParse({ ...base, sourcePath }).success, sourcePath).toBe(false);
  }
});

it('requires source IDs for action cards', () => {
  const result = ActionCardSchema.safeParse({
    slug: 'fem-punktsordre',
    title: '5-punktsordre',
    phase: 'under',
    roles: ['lagforer'],
    scenarios: ['generelt'],
    priority: 'high',
    steps: ['Situasjon', 'Oppdrag', 'Utførelse', 'Administrasjon/forsyning', 'Ledelse/samband'],
    safety: [],
    reporting: ['Del ordre muntlig og skriftlig når mulig'],
    sourceIds: [],
    competenceRequired: ['FIG10'],
    warning: 'Beslutningsstøtte, ikke offisiell ordre',
  });
  expect(result.success).toBe(false);
});

it('requires checklist items', () => {
  const result = OperationalChecklistSchema.safeParse({
    slug: 'tom',
    title: 'Tom sjekkliste',
    phase: 'for',
    roles: ['mannskap'],
    scenarios: ['generelt'],
    items: [],
    sourceIds: ['src-5-punktsordre'],
  });
  expect(result.success).toBe(false);
});

it('accepts FIG10 as baseline training path', () => {
  expect(TrainingPathSchema.parse({
    slug: 'fig10-grunnkurs',
    courseCode: 'FIG10',
    title: 'Grunnkurs FIG/FIGP',
    targetRoles: ['mannskap'],
    duration: '3 uker',
    prerequisites: [],
    skills: ['egensikkerhet', 'samband', 'førstehjelp'],
    sourceIds: ['src-kursplan-grunnkurs-fig10'],
  })).toBeTruthy();
});

it('requires warnings for restricted protection data', () => {
  const result = ProtectionMeasureSchema.safeParse({
    slug: 'privat-tilfluktsrom-liste',
    title: 'Privat tilfluktsromliste',
    kind: 'tilfluktsrom',
    publicOrRestricted: 'restricted',
    responsibleAuthority: 'Kommune/eier/DSB',
    readinessChecks: [],
    operationalSteps: [],
    dataWarnings: [],
    sourceIds: ['src-deep-research-tilfluktsrom'],
  });
  expect(result.success).toBe(false);
});

it('supports glossary synonyms', () => {
  const result = GlossaryTermSchema.safeParse({
    term: 'RADIAC',
    definition: 'Radiologisk måletjeneste',
    synonyms: ['radiacmåling', 'dose'],
    sourceIds: ['src-bestemmelse-radiacmaletjeneste-del-i'],
  });
  expect(result.success).toBe(true);
});
