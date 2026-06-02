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
    sourcePath: '/Users/reidar/Obsidian/Hvelvet/01_Projects/Beredskapsboka/source-extracts/SRC - 5-punktsordre.md',
    sourceType: 'source-extract',
    status: 'unverified',
    body: 'Kildeinnhold',
    warnings: ['Kontroller mot gjeldende planverk'],
  });
  expect(result.success).toBe(true);
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
