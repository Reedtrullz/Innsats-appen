import { validateContentGraph } from '@/scripts/validate-content';

const knownSource = { id: 'src-known', title: 'Known', sourcePath: 'source-extracts/SRC - Known.md', sourceType: 'source-extract', status: 'verified', body: 'Known', warnings: [] };

it('reports missing source references', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [{ slug: 'bad-card', sourceIds: ['src-missing'] }],
  } as any);
  expect(errors.join('\n')).toContain('src-missing');
});

it('reports duplicate ids and slugs across generated content', async () => {
  const errors = await validateContentGraph({
    sources: [
      { id: 'src-known', title: 'Known 1', sourcePath: 'source-extracts/SRC - Known 1.md', sourceType: 'source-extract', status: 'verified', body: 'Known', warnings: [] },
      { id: 'src-known', title: 'Known 2', sourcePath: 'source-extracts/SRC - Known 2.md', sourceType: 'source-extract', status: 'verified', body: 'Known', warnings: [] },
    ],
    actionCards: [
      { slug: 'same-card', title: 'A', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], priority: 'high', steps: ['A'], sourceIds: ['src-known'], warning: 'A' },
      { slug: 'same-card', title: 'B', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], priority: 'high', steps: ['B'], sourceIds: ['src-known'], warning: 'B' },
    ],
  } as any);

  expect(errors.join('\n')).toContain('duplicate source id src-known');
  expect(errors.join('\n')).toContain('duplicate action card slug same-card');
});

it('reports training paths linked to missing action cards', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [],
    trainingPaths: [{ slug: 'course', courseCode: 'FIG10', title: 'Course', targetRoles: ['mannskap'], duration: '1 dag', skills: ['Trygg'], sourceIds: ['src-known'], linkedCardSlugs: ['missing-card'] }],
  } as any);

  expect(errors.join('\n')).toContain('course links missing action card missing-card');
});

it('reports broader private shelter publication phrases in public protection measures', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    protectionMeasures: [{ slug: 'bad-shelter', title: 'Bad', kind: 'tilfluktsrom', publicOrRestricted: 'public', responsibleAuthority: 'DSB', operationalSteps: ['Publiser skjermet tilfluktsromliste'], sourceIds: ['src-known'] }],
  } as any);

  expect(errors.join('\n')).toContain('bad-shelter appears to publish restricted shelter data as public content');
});

it('blocks private shelter structured fields and location patterns from generated public content', async () => {
  const restrictedLocation = 'Skjermet tilfluktsrom: Kongens gate 1, 7010 Trondheim';
  const errors = await validateContentGraph({
    sources: [
      knownSource,
      { ...knownSource, id: 'src-leak', title: 'Leak', sourcePath: 'source-extracts/SRC - Leak.md', body: restrictedLocation },
    ],
    actionCards: [{ slug: 'leaky-card', title: 'Leak card', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], priority: 'high', steps: [restrictedLocation], sourceIds: ['src-known'], warning: 'Kildevarsel' }],
    checklists: [{ slug: 'leaky-checklist', title: 'Leak checklist', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], items: [{ id: 'leak', label: restrictedLocation, sourceIds: ['src-known'] }], sourceIds: ['src-known'] }],
    protectionMeasures: [
      {
        slug: 'bad-private-field',
        title: 'Bad private field',
        kind: 'tilfluktsrom',
        publicOrRestricted: 'public',
        responsibleAuthority: 'DSB',
        operationalSteps: ['Bruk bare offentlige råd'],
        privateTilfluktsromLocations: ['Storgata 1, 7010 Trondheim'],
        sourceIds: ['src-known'],
      },
      {
        slug: 'bad-location-pattern',
        title: 'Bad location pattern',
        kind: 'tilfluktsrom',
        publicOrRestricted: 'public',
        responsibleAuthority: 'DSB',
        operationalSteps: ['Bruk bare offentlige råd'],
        dataWarnings: [restrictedLocation],
        sourceIds: ['src-known'],
      },
    ],
  } as any);
  const joined = errors.join('\n');

  expect(joined).toContain('generated content exposes sensitive structured key privateTilfluktsromLocations');
  expect(joined).toContain('sources[1].body appears to publish restricted shelter location details');
  expect(joined).toContain('actionCards[0].steps[0] appears to publish restricted shelter location details');
  expect(joined).toContain('checklists[0].items[0].label appears to publish restricted shelter location details');
  expect(joined).toContain('protectionMeasures[1].dataWarnings[0] appears to publish restricted shelter location details');
});

it('does not treat a generic shelter policy warning plus unrelated address as a restricted shelter location leak', async () => {
  const errors = await validateContentGraph({
    sources: [
      {
        ...knownSource,
        body: 'Ikke publiser private tilfluktsromdata. Oppmøtested for åpent kurs: Kongens gate 1.',
      },
    ],
    protectionMeasures: [
      {
        slug: 'segment-regression',
        title: 'Ikke publiser private tilfluktsromdata',
        kind: 'tilfluktsrom',
        publicOrRestricted: 'public',
        responsibleAuthority: 'DSB',
        operationalSteps: ['Oppmøtested for åpent kurs: Kongens gate 1.'],
        sourceIds: ['src-known'],
      },
    ],
  } as any);

  expect(errors.join('\n')).not.toContain('restricted shelter location details');
});

it('reports generated artifact manifest, public mirror, and search-index mismatches', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [],
    checklists: [],
    trainingPaths: [],
    protectionMeasures: [],
    glossary: [],
    manifest: { sourceCount: 2, actionCardCount: 0, checklistCount: 0, trainingPathCount: 0, protectionMeasureCount: 0, glossaryCount: 0 },
    searchIndex: { documents: [{ id: 'kilde:src-stale', href: '/kilder/src-stale' }] },
    publicGraph: {
      sources: [{ ...knownSource, title: 'Changed' }],
      actionCards: [],
      checklists: [],
      trainingPaths: [],
      protectionMeasures: [],
      glossary: [],
      manifest: { sourceCount: 1 },
      searchIndex: { documents: [] },
    },
  } as any);
  const joined = errors.join('\n');
  expect(joined).toContain('manifest sourceCount=2 does not match generated count 1');
  expect(joined).toContain('public generated manifest does not mirror content generated manifest');
  expect(joined).toContain('public source src-known field title does not mirror content generated source');
  expect(joined).toContain('search index source document ids missing kilde:src-known');
  expect(joined).toContain('search index source document ids has unexpected kilde:src-stale');
});
