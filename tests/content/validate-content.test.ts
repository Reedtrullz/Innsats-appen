import { buildContentCoverageReport, validateContentGraph } from '@/scripts/validate-content';
import { SourceDocumentSchema } from '@/lib/content/schemas';

const knownSource = { id: 'src-known', title: 'Known', sourcePath: 'source-extracts/SRC - Known.md', sourceType: 'source-extract', status: 'verified', verifiedAt: '2026-06-03', reviewAfter: '2026-12-03', owner: 'content-team', reviewer: 'fagansvarlig', reviewRisk: 'low', body: 'Known', warnings: [] };

it('rejects suspicious sentence fragments in safety lists', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [{
      slug: 'fragmented-safety-card',
      title: 'Fragmented safety card',
      phase: 'under',
      roles: ['lagforer'],
      scenarios: ['generelt'],
      priority: 'high',
      steps: ['Stans arbeidet'],
      doNot: ['Hold avstand', 'og vent'],
      sourceIds: ['src-known'],
    }],
  } as any);

  expect(errors.join('\n')).toContain('fragmented-safety-card doNot[1] appears to be a sentence fragment');
});

it('keeps missing source governance metadata compatible with validation defaults', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [{ slug: 'ok-card', title: 'Ok', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], priority: 'high', steps: ['Ok'], sourceIds: ['src-known'] }],
  } as any);

  expect(errors.join('\n')).not.toContain('pilotReviewStatus');
  expect(SourceDocumentSchema.parse(knownSource)).toMatchObject({ pilotReviewStatus: 'not-reviewed', publicationStatus: 'needs-permission' });
});

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
      { ...knownSource, title: 'Known 1', sourcePath: 'source-extracts/SRC - Known 1.md' },
      { ...knownSource, title: 'Known 2', sourcePath: 'source-extracts/SRC - Known 2.md' },
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

it('rejects sensitive free text anywhere in generated or public generated artifacts', async () => {
  const errors = await validateContentGraph({
    sources: [
      knownSource,
      { ...knownSource, id: 'src-public-sensitive', title: 'Public sensitive source', sourcePath: 'source-extracts/SRC - Public Sensitive.md', publicationStatus: 'approved-public', body: 'Pasient Ola Nordmann skal følges opp' },
      { ...knownSource, id: 'src-private-raw', title: 'Private raw source', sourcePath: 'source-extracts/SRC - Private Raw.md', publicationStatus: 'needs-permission', body: 'Dersom materiell feiler, kontakt beredskap.siv@dsb.no.' },
    ],
    actionCards: [{ slug: 'sensitive-card', title: 'Sensitive card', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], priority: 'high', steps: ['Pasient Ola Nordmann skal følges opp'], sourceIds: ['src-known'], warning: 'Kildevarsel' }],
    checklists: [],
    trainingPaths: [],
    protectionMeasures: [],
    glossary: [],
    faq: [],
    equipmentTaxonomy: [],
    exportTemplates: [],
    imageMetadata: [],
    localOverlays: [],
    changelog: [],
    mustRead: [],
    publicGraph: {
      sources: [knownSource],
      actionCards: [],
      checklists: [],
      trainingPaths: [],
      protectionMeasures: [],
      glossary: [],
      faq: [],
      equipmentTaxonomy: [],
      exportTemplates: [],
      imageMetadata: [],
      localOverlays: [],
      changelog: [],
      mustRead: [{ id: 'public-sensitive', title: 'Sensitive public notice', body: 'Ring +47 99999999 for privat adresse', severity: 'warning', changedAt: '2026-06-03' }],
    },
  } as any);
  const joined = errors.join('\n');

  expect(joined).toContain('sources[1].body contains sensitive operational text (patient-reference)');
  expect(joined).toContain('actionCards[0].steps[0] contains sensitive operational text (patient-reference)');
  expect(joined).toContain('publicGraph.mustRead[0].body contains sensitive operational text (contact-reference)');
  expect(joined).not.toContain('sources[2].body contains sensitive operational text');
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

it('validates taxonomy values and image publication metadata for expanded curated content', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [{ slug: 'bad-taxonomy', title: 'Bad taxonomy', phase: 'under', roles: ['ukjent-rolle'], scenarios: ['ukjent-scenario'], priority: 'high', steps: ['![Kart](/content-assets/missing.png)'], sourceIds: ['src-known'], competenceRequired: ['NOPE'], equipmentRequired: ['ukjent-utstyr'], warning: 'Varsel' }],
    checklists: [{ slug: 'bad-checklist', title: 'Bad checklist', phase: 'for', roles: ['mannskap'], scenarios: ['generelt'], items: [{ id: 'ok', label: 'Ok', sourceIds: ['src-known'] }], sourceIds: ['src-known'], equipmentRequired: ['ukjent-utstyr'] }],
    trainingPaths: [{ slug: 'bad-training', courseCode: 'FIG10', title: 'Bad training', targetRoles: ['mannskap'], duration: '1 dag', prerequisites: ['NOPE'], skills: ['Trygg'], sourceIds: ['src-known'] }],
    protectionMeasures: [],
    glossary: [],
    faq: [{ id: 'bad-faq', question: 'Bad?', answer: 'Bad', category: 'Test', roles: ['ukjent-rolle'], scenarios: ['generelt'], competenceCodes: ['NOPE'], equipmentTerms: ['ukjent-utstyr'], sourceIds: ['src-known'], updatedAt: '2026-06-03' }],
    equipmentTaxonomy: [{ id: 'ukjent-utstyr', label: 'Ukjent', category: 'annet', approvedForPublicUse: true }],
    exportTemplates: [],
    imageMetadata: [{ id: 'not-approved', publicPath: '/content-assets/missing.png', alt: 'Missing', sourceIds: ['src-known'], approvedForPublication: false, updatedAt: '2026-06-03' }],
    localOverlays: [],
    changelog: [{ id: 'bad-change', date: '2026-06-03', title: 'Bad', summary: 'Bad', changeType: 'updated', contentRefs: [{ kind: 'action-card', id: 'missing-card' }] }],
    mustRead: [{ id: 'bad-notice', title: 'Bad notice', body: 'Bad', severity: 'warning', changedAt: '2026-06-03', linkedCardSlugs: ['missing-card'], changelogEntryId: 'missing-change' }],
  } as any);
  const joined = errors.join('\n');

  expect(joined).toContain('bad-taxonomy roles references unknown taxonomy value ukjent-rolle');
  expect(joined).toContain('bad-taxonomy scenarios references unknown taxonomy value ukjent-scenario');
  expect(joined).toContain('bad-taxonomy competenceRequired references unknown taxonomy value NOPE');
  expect(joined).toContain('bad-taxonomy equipmentRequired references unknown taxonomy value ukjent-utstyr');
  expect(joined).toContain('image reference missing.png is not approved for publication');
  expect(joined).toContain('image reference missing.png points to missing public asset /content-assets/missing.png');
  expect(joined).toContain('bad-change references missing action-card missing-card');
  expect(joined).toContain('bad-notice links missing action card missing-card');
  expect(joined).toContain('bad-notice links missing changelog entry missing-change');
});

it('reports approved image metadata that points at a missing asset and handles malformed image URIs', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [{ slug: 'malformed-image-ref', title: 'Malformed image ref', phase: 'under', roles: ['mannskap'], scenarios: ['generelt'], priority: 'medium', steps: ['![Malformed](broken%zz.png)'], sourceIds: ['src-known'] }],
    checklists: [],
    trainingPaths: [],
    protectionMeasures: [],
    glossary: [],
    faq: [],
    equipmentTaxonomy: [],
    exportTemplates: [],
    imageMetadata: [{ id: 'approved-missing', publicPath: '/content-assets/approved-missing.png', alt: 'Approved missing', sourceIds: ['src-known'], approvedForPublication: true, updatedAt: '2026-06-03' }],
    localOverlays: [],
    changelog: [],
    mustRead: [],
  } as any);
  const joined = errors.join('\n');

  expect(joined).toContain('approved-missing points to missing public asset /content-assets/approved-missing.png');
  expect(joined).toContain('image reference broken-zz.png is missing approved publication metadata');
});

it('requires used equipment terms to exist in the curated equipment taxonomy artifact', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [{ slug: 'needs-equipment-taxonomy', title: 'Needs equipment taxonomy', phase: 'under', roles: ['mannskap'], scenarios: ['generelt'], priority: 'medium', steps: ['Bruk samband'], sourceIds: ['src-known'], equipmentRequired: ['samband'] }],
    checklists: [],
    trainingPaths: [],
    protectionMeasures: [],
    glossary: [],
    faq: [],
    equipmentTaxonomy: [],
    exportTemplates: [],
    imageMetadata: [],
    localOverlays: [],
    changelog: [],
    mustRead: [],
  } as any);

  expect(errors.join('\n')).toContain('needs-equipment-taxonomy equipmentRequired references equipment value missing from equipment taxonomy samband');
});

it('rejects equipment taxonomy records that are not approved for public use when public content references them', async () => {
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [{ slug: 'private-equipment', title: 'Private equipment', phase: 'under', roles: ['mannskap'], scenarios: ['generelt'], priority: 'medium', steps: ['Bruk samband'], sourceIds: ['src-known'], equipmentRequired: ['samband'] }],
    checklists: [],
    trainingPaths: [],
    protectionMeasures: [],
    glossary: [],
    faq: [],
    equipmentTaxonomy: [{ id: 'samband', label: 'Samband', category: 'samband', approvedForPublicUse: false, sourceIds: ['src-known'] }],
    exportTemplates: [],
    imageMetadata: [],
    localOverlays: [],
    changelog: [],
    mustRead: [],
  } as any);

  expect(errors.join('\n')).toContain('private-equipment equipmentRequired references equipment value not approved for public use samband');
});

it('allows draft and retired FAQ entries to stay out of the public mirror and search index counts', async () => {
  const approvedFaq = { id: 'approved-faq', question: 'Approved?', answer: 'Public answer.', category: 'Test', sourceIds: ['src-known'], updatedAt: '2026-06-03', status: 'approved' };
  const searchIndex = { documents: [{ id: 'kilde:src-known', href: '/kilder/src-known' }, { id: 'faq:approved-faq', href: '/faq#approved-faq' }] };
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [],
    checklists: [],
    trainingPaths: [],
    protectionMeasures: [],
    glossary: [],
    faq: [
      approvedFaq,
      { id: 'draft-faq', question: 'Draft?', answer: 'Not public.', category: 'Test', sourceIds: ['src-known'], updatedAt: '2026-06-03', status: 'draft' },
      { id: 'retired-faq', question: 'Retired?', answer: 'Not public.', category: 'Test', sourceIds: ['src-known'], updatedAt: '2026-06-03', status: 'retired' },
    ],
    equipmentTaxonomy: [],
    exportTemplates: [],
    imageMetadata: [],
    localOverlays: [],
    changelog: [],
    mustRead: [],
    searchIndex,
    publicGraph: {
      sources: [knownSource],
      actionCards: [],
      checklists: [],
      trainingPaths: [],
      protectionMeasures: [],
      glossary: [],
      faq: [approvedFaq],
      equipmentTaxonomy: [],
      exportTemplates: [],
      imageMetadata: [],
      localOverlays: [],
      changelog: [],
      mustRead: [],
      searchIndex,
    },
  } as any);

  expect(errors).toEqual([]);
});

it('rejects draft or retired FAQ IDs in the generated search index', async () => {
  const approvedFaq = { id: 'approved-faq', question: 'Approved?', answer: 'Public answer.', category: 'Test', sourceIds: ['src-known'], updatedAt: '2026-06-03', status: 'approved' };
  const draftFaq = { id: 'draft-faq', question: 'Draft?', answer: 'Not public.', category: 'Test', sourceIds: ['src-known'], updatedAt: '2026-06-03', status: 'draft' };
  const errors = await validateContentGraph({
    sources: [knownSource],
    actionCards: [],
    checklists: [],
    trainingPaths: [],
    protectionMeasures: [],
    glossary: [],
    faq: [approvedFaq, draftFaq],
    equipmentTaxonomy: [],
    exportTemplates: [],
    imageMetadata: [],
    localOverlays: [],
    changelog: [],
    mustRead: [],
    searchIndex: { documents: [{ id: 'kilde:src-known', href: '/kilder/src-known' }, { id: 'faq:draft-faq', href: '/faq#draft-faq' }] },
  } as any);
  const joined = errors.join('\n');

  expect(joined).toContain('search index FAQ document ids missing faq:approved-faq');
  expect(joined).toContain('search index FAQ document ids has unexpected faq:draft-faq');
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
  expect(joined).toContain('manifest sourceSnapshotGeneratedAt is required to distinguish source snapshot freshness from build time');
  expect(joined).toContain('manifest sourceSnapshotHash is required to identify the source snapshot used by the build');
  expect(joined).toContain('manifest usedPregeneratedFallback must be a boolean');
  expect(joined).toContain('public generated manifest does not mirror content generated manifest');
  expect(joined).toContain('public source src-known field title does not mirror content generated source');
  expect(joined).toContain('search index source document ids missing kilde:src-known');
  expect(joined).toContain('search index source document ids has unexpected kilde:src-stale');
});

it('builds CI content coverage reports for source links, high-risk cards, glossary gaps, and coverage dimensions', () => {
  const report = buildContentCoverageReport({
    sources: [
      knownSource,
      { ...knownSource, id: 'src-orphan', title: 'Orphan', sourcePath: 'source-extracts/SRC - Orphan.md', status: 'unverified', reviewRisk: 'high' },
      { ...knownSource, id: 'src-risk', title: 'Risk', sourcePath: 'source-extracts/SRC - Risk.md', status: 'expired', reviewRisk: 'high', expiresAt: '2026-01-01' },
    ],
    actionCards: [
      { slug: 'risk-card', title: 'Risk [[MissingTerm]]', phase: 'under', roles: ['lagforer'], scenarios: ['generelt'], priority: 'high', steps: ['Use MissingAlias'], sourceIds: ['src-risk'], competenceRequired: [] },
      { slug: 'no-source-card', title: 'No source', phase: 'for', roles: ['mannskap'], scenarios: ['flom'], priority: 'medium', steps: ['Step'], sourceIds: [] },
    ],
    checklists: [],
    trainingPaths: [],
    protectionMeasures: [],
    glossary: [{ term: 'KnownTerm', definition: 'Defined', synonyms: ['MissingAlias'], sourceIds: ['src-known'] }],
  } as any);

  expect(report.linkage.sourcesWithoutReferences).toEqual(['src-orphan']);
  expect(report.linkage.cardsWithoutSources).toEqual(['no-source-card']);
  expect(report.risk.highRiskCardsWithoutWarnings).toEqual(['risk-card']);
  expect(report.risk.highRiskCardsWithoutCompetenceOrRationale).toEqual(['risk-card']);
  expect(report.glossary.referencedButUndefined).toEqual(['MissingTerm']);
  expect(report.coverage.byRole.lagforer.cardCount).toBe(1);
  expect(report.coverage.byPhase.under.cardCount).toBe(1);
  expect(report.coverage.byScenario.generelt.cardCount).toBe(1);
  expect(report.coverage.byCompetence.unassigned.cardCount).toBe(2);
  expect(report.coverage.bySourceStatus.expired.sourceCount).toBe(1);
  expect(report.releaseBoard.gaps.some((gap) => gap.id === 'content-high-risk-card-warnings')).toBe(true);
});
