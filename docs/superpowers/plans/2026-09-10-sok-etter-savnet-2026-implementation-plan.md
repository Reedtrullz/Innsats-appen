# Søk etter savnet 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate HRS-veilederen fra 2026 i Beredskapsboka og levere en egen, kildebelagt studieflate før neste søk- og redningsaksjon.

**Architecture:** Utvid den eksisterende YAML → Zod → generert JSON → server-loader → søkeindeks-pipelinen med én `StudyGuide`-type. Koble studiepakken til eksisterende operative kort, sjekklister, kildevisning og lokale må-leses-acknowledgementer. Hold raw PDF utenfor repoet og bruk eksisterende service-worker-liste for offline-cache.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, js-yaml, MiniSearch, Vitest, Playwright og eksisterende Obsidian-import.

**Spec:** `docs/superpowers/specs/2026-09-10-sok-etter-savnet-2026-design.md`

## Global Constraints

- Raw PDF skal ikke legges i kodebasen; source extract ligger i `/Users/reidar/Obsidian/Hvelvet/01_Projects/Beredskapsboka/source-extracts/`.
- Kildehashen er `104283948169d7b5f257f553446d23f9803d89182425870cb302fc0ed244cd34`.
- Den nye kilden er `unverified` med høy gjennomgangsrisiko, og nye/endrede operative kort er `pending-fagperson`.
- Studiepakken ligger på `/nytt/sok-og-redning` og skal lenkes fra «Hva er nytt», «Må leses», lokalt søk og offline app shell.
- FAKS skal omtales som arbeidsverktøy; ingen FAKS-integrasjon, live-sporing, aksjonsjournal, persondata, ekte sambandstalegrupper, tilgangskoder eller private koordinater.
- Lokalt acknowledgement er lesestatus, ikke sertifisering, ordre eller faglig godkjenning.
- Bruk Node 22 via `source ~/.nvm/nvm.sh && nvm use 22` før npm-/tsx-kommandoer.
- Bevar eksisterende brukerfiler og arbeidstreet; bruk `apply_patch` for filendringer.

## Filkart

- `lib/content/schemas.ts`: StudyGuide-, MustRead-, ContentRef- og manifestkontrakter.
- `scripts/compile-curated.ts`: lesing og speiling av `study-guides.yaml`.
- `scripts/import-obsidian.ts` og `scripts/sync-workplans.ts`: manifest-defaults som må tåle den nye telleren.
- `lib/content/load-content.ts`: server-loader for studiepakken.
- `content/curated/study-guides.yaml`: én ferdig studiepakke med proveniens og ordnede seksjoner.
- `/Users/reidar/Obsidian/Hvelvet/01_Projects/Beredskapsboka/source-extracts/SRC - Nasjonal veileder søk etter savnet person på land 2026.md`: kildeuttrekk.
- `content/curated/action-cards.yaml`, `checklists.yaml`, `glossary.yaml`, `faq.yaml`, `search-synonyms.yaml`, `changelog.yaml`, `must-read.yaml`: kildebelagt SAR-innhold.
- `lib/content/source-governance.ts`, `lib/content/coverage-report.ts`, `scripts/validate-content.ts`: referanser, counts, lenker, sensitive-text traversal og coverage.
- `lib/content/search-documents.ts`, `scripts/build-search-index.ts`, `app/(app)/sok/page.tsx`, `app/(app)/hurtigkort/page.tsx`: lokal søking.
- `lib/offline/static-app-shell.ts`, `public/sw.js`: statiske ruter og generert service-worker-metadata.
- `app/(app)/nytt/sok-og-redning/page.tsx`, `app/(app)/nytt/page.tsx`, `app/(app)/ma-leses/page.tsx`: studieflate og innganger.
- `tests/content/*.test.ts`, `tests/components/*.test.tsx`, `tests/offline/*.test.ts`: automatiserte porter.

### Task 1: StudyGuide-datamodell og content-pipeline

**Files:**
- Create: `content/curated/study-guides.yaml`
- Create: `/Users/reidar/Obsidian/Hvelvet/01_Projects/Beredskapsboka/source-extracts/SRC - Nasjonal veileder søk etter savnet person på land 2026.md`
- Modify: `lib/content/schemas.ts`
- Modify: `scripts/compile-curated.ts`
- Modify: `scripts/import-obsidian.ts`
- Modify: `scripts/sync-workplans.ts`
- Modify: `lib/content/load-content.ts`
- Modify: `lib/offline/service-worker-metadata.ts`
- Modify: `tests/content/schemas.test.ts`
- Modify: `tests/content/compile-curated.test.ts`
- Modify: `tests/content/import-obsidian.test.ts`
- Modify: `tests/release/release-notes.test.ts`

**Interfaces:**
- Produces `StudyGuideSchema`, `StudyGuide`, `getStudyGuides(): StudyGuide[]`, `CompileResult.studyGuides`, `ContentManifest.studyGuideCount`, and generated `study-guides.json`.
- `StudyGuideSchema` has `slug`, `title`, `summary`, `audienceRoles`, positive `estimatedMinutes`, `mustStudyBeforeNextSearch`, `provenanceNote`, `sourceIds`, `sections`, and `updatedAt`.
- Each section has `id`, `title`, `summary`, non-empty `keyPoints`, `linkedCardSlugs`, and `linkedChecklistSlugs`.
- Consumes existing `RoleSchema`, `DateOnlySchema`, `slugPattern`, `ActionCard` slugs and `OperationalChecklist` slugs without importing the UI.

- [ ] **Step 1: Write the failing schema and compiler tests.**

Add assertions equivalent to:

```ts
const guide = StudyGuideSchema.parse({
  slug: 'sok-etter-savnet-2026',
  title: 'Søk etter savnet på land 2026',
  summary: 'Kort studiepakke før neste søk.',
  audienceRoles: ['mannskap', 'lagforer', 'leder'],
  estimatedMinutes: 25,
  mustStudyBeforeNextSearch: true,
  provenanceNote: 'HRS nivå 3, 2026 · SHA-256: test',
  sourceIds: ['src-hrs-2026'],
  sections: [{
    id: 'sikkerhet',
    title: 'Sikkerhet',
    summary: 'Vurder risiko først.',
    keyPoints: ['Stans ved uakseptabel risiko.'],
    linkedCardSlugs: ['sok-og-redning-startkort'],
    linkedChecklistSlugs: ['sok-og-redning-sektor-under'],
  }],
  updatedAt: '2026-09-10',
});
expect(guide.sections[0].linkedCardSlugs).toContain('sok-og-redning-startkort');
```

Extend the isolated compiler test so it asserts `result.studyGuides.length === 1`, the temp generated and public directories both contain `study-guides.json`, and `result.manifest.studyGuideCount === 1`.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -- tests/content/schemas.test.ts tests/content/compile-curated.test.ts
```

Expected: FAIL because the schema, YAML loader, manifest field, and generated artifact do not exist yet.

- [ ] **Step 2: Add the schema and manifest contract.**

Use the existing Zod style beside `TrainingPathSchema`:

```ts
export const StudyGuideSectionSchema = z.object({
  id: z.string().min(1).regex(slugPattern),
  title: z.string().min(1),
  summary: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1),
  linkedCardSlugs: z.array(z.string().min(1)).default([]),
  linkedChecklistSlugs: z.array(z.string().min(1)).default([]),
});

export const StudyGuideSchema = z.object({
  slug: z.string().min(1).regex(slugPattern),
  title: z.string().min(1),
  summary: z.string().min(1),
  audienceRoles: z.array(RoleSchema).min(1),
  estimatedMinutes: z.number().int().positive(),
  mustStudyBeforeNextSearch: z.boolean(),
  provenanceNote: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  sections: z.array(StudyGuideSectionSchema).min(1),
  updatedAt: DateOnlySchema,
});
```

Add `linkedStudyGuideSlugs` with default `[]` to `MustReadNoticeSchema`, add `'study-guide'` to `ContentRefSchema.kind`, and add `studyGuideCount` with default `0` to `ContentManifestSchema`. Export the new section and guide types. Add `studyGuideCount: 0` to every typed manifest default in `compile-curated.ts`, `import-obsidian.ts`, `sync-workplans.ts`, `lib/offline/service-worker-metadata.ts`, and the release-notes test fixture.

- [ ] **Step 3: Add the source extract and one curated guide.**

The source note must have frontmatter with `source_status: unverified`, `reviewRisk: high`, `reviewAfter: 2026-12-09`, `publicationStatus: needs-permission`, `pilotReviewStatus: not-reviewed`, `verifiedAt: 2026-09-10`, owner `content-team`, and reviewer `fagansvarlig`. Its body must be a public-safe paraphrase with page anchors covering safety, organization, intelligence, tactics, phases, methods, resources, volunteers, rescue/deceased, FAKS/analog KO, and communications. Include the exact source title, 112 pages, 2026 edition, SHA-256, and the statement that it is not the complete official document.

Create one guide with slug `sok-etter-savnet-2026`, `estimatedMinutes: 25`, `mustStudyBeforeNextSearch: true`, and `provenanceNote` containing the exact edition and SHA-256. Use seven sections with these IDs and order: `sikkerhet-og-forsteinnsats`, `organisering-og-etterretning`, `taktikk-og-planlegging`, `metoder-og-ressurser`, `faser-og-kvalitetssikring`, `funn-redning-og-frivillige`, `faks-analog-drift-og-kommunikasjon`. Link existing SAR cards/checklists plus the planned slugs `sok-og-redning-planlegging`, `sok-og-redning-funn-og-redning`, `sok-og-redning-faks-og-analogt-ko`, and `sok-og-redning-kvalitetssikring`; cross-reference validation is completed in Task 2.

- [ ] **Step 4: Wire the compiler and loader.**

Import `StudyGuideSchema`/`StudyGuide`, add `studyGuides` to `CompileResult`, read `study-guides.yaml` beside the other curated arrays, mirror it with `writeMirroredJson`, set `studyGuideCount`, and return it. Add `getStudyGuides()` to `lib/content/load-content.ts` using `loadArray('study-guides.json', 'study guides', ...)`.

- [ ] **Step 5: Run the focused contract tests and commit.**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -- tests/content/schemas.test.ts tests/content/compile-curated.test.ts tests/content/import-obsidian.test.ts tests/release/release-notes.test.ts
git diff --check
git add lib/content/schemas.ts scripts/compile-curated.ts scripts/import-obsidian.ts scripts/sync-workplans.ts lib/content/load-content.ts lib/offline/service-worker-metadata.ts content/curated/study-guides.yaml tests/content/schemas.test.ts tests/content/compile-curated.test.ts tests/content/import-obsidian.test.ts tests/release/release-notes.test.ts
git commit -m "feat: add study guide content type"
```

The Obsidian source note is outside the git commit but must exist and be readable by the default importer.

### Task 2: HRS 2026 source-backed operational content

**Files:**
- Modify: `content/curated/action-cards.yaml`
- Modify: `content/curated/checklists.yaml`
- Modify: `content/curated/glossary.yaml`
- Modify: `content/curated/faq.yaml`
- Modify: `content/curated/search-synonyms.yaml`
- Modify: `content/curated/changelog.yaml`
- Modify: `content/curated/must-read.yaml`
- Modify: `tests/content/curated-fixtures.test.ts`
- Modify: `tests/content/donot-safety.test.ts`

**Interfaces:**
- Consumes source ID `src-nasjonal-veileder-sok-etter-savnet-person-pa-land-2026` and the guide links created in Task 1.
- Produces four updated SAR cards, three new SAR cards, one updated SAR sector checklist, one new SAR quality/closure checklist, eleven glossary terms, four FAQs, HRS search synonym groups, one changelog entry, and one must-read notice.

- [ ] **Step 1: Add failing fixture assertions for the content contract.**

Add one focused test block that reads the YAML and asserts these exact slugs/terms: updated cards `sok-og-redning-startkort`, `soketeig-sektor`, `soketeig-plan-kart`, `ledelse-kommando-kontroll`; new cards `sok-og-redning-planlegging`, `sok-og-redning-funn-og-redning`, `sok-og-redning-faks-og-analogt-ko`; updated checklist `sok-og-redning-sektor-under`; new checklist `sok-og-redning-kvalitetssikring`; glossary terms `IPP`, `LKP`, `POI`, `POA`, `POD`, `POS`, `ledeline`, `sykkelhjulmodellen`, `FAKS`, `SEAO`, `søksfaser`; changelog ref `study-guide:sok-etter-savnet-2026`; and must-read link `sok-etter-savnet-2026`.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -- tests/content/curated-fixtures.test.ts tests/content/donot-safety.test.ts
```

Expected: FAIL because the new records and source references are absent.

- [ ] **Step 2: Update existing SAR cards with 2026 guidance.**

Keep the current slugs and user-facing structure. Add the new source ID without removing valid existing source IDs. The start card must cover IPP, rapid relevant lines/points, continuous risk reassessment, team control, reporting, and the distinction between tracklog/sensor presence and actual ground coverage. The sector card must state that the area between ledelines is not searched by a ledeline-only method. The local-map card must distinguish intelligence, planning, and result layers and retain its no-live-tracking boundary. The `ledelse-kommando-kontroll` card must include IL-KO, fagleder søk, søksplanlegger, ressurskontroller and organization leaders without turning a role description into official command authority.

Use capitalized, complete sentences in `safety`, `reporting`, and `doNot`; quote YAML strings containing commas. Keep `reviewStatus: pending-fagperson`, visible warnings, source IDs, existing taxonomy values, and no real communication details.

- [ ] **Step 3: Add the three smallest new cards.**

Create:

```yaml
- slug: sok-og-redning-planlegging
  title: Søk og redning planlegging
  phase: under
  roles: [lagforer, leder, beredskapsvakt]
  scenarios: [sok-og-redning]
  priority: high
  reviewStatus: pending-fagperson

- slug: sok-og-redning-funn-og-redning
  title: Funn og redning i søk
  phase: under
  roles: [mannskap, lagforer, leder]
  scenarios: [sok-og-redning]
  priority: high
  reviewStatus: pending-fagperson

- slug: sok-og-redning-faks-og-analogt-ko
  title: FAKS-bortfall og analogt KO
  phase: under
  roles: [lagforer, leder, beredskapsvakt]
  scenarios: [sok-og-redning]
  priority: medium
  reviewStatus: pending-fagperson
```

Complete each record with 5–7 action steps, source IDs including the HRS source, a warning, a competence requirement or rationale, and a `doNot` list. The planning card must cover reflex-/analyse-/formal planning, POA/POD/POS, sykkelhjulmodel and blocking/observation posts. The finding card must cover own safety, first aid/escalation, exact position via assigned local process, continued assignments, and discreet handling of a possible death. The FAKS card must cover manual log/map/resource fallback, three generic map-layer concepts, two communication paths in principle, and no access-code or live-system content.

- [ ] **Step 4: Update/add checklists, glossary, FAQ and search data.**

Update `sok-og-redning-sektor-under` with IPP/method confirmation, risk stop, observation quality, actual coverage, findings/avvik, and handover. Add `sok-og-redning-kvalitetssikring` for rechecking intelligence/search areas, deciding repeat versus expand, SEAO transition, debrief and SAR report. Link both to the HRS source.

Add short definitions for the eleven terms listed in Step 1. Add four approved, public-safe FAQ entries for method selection, sykkelhjulmodel, POA/POD/POS, and findings/volunteers/analog drift. Add synonym groups for IPP/LKP/POI, search planning/intelligence/observation, ledeline/point/area search, SEAO/FAKS/analog KO, and sykkelhjul. Bind each relevant group to at least one existing or new SAR card so current synonym schema remains sufficient.

- [ ] **Step 5: Add traceability and the must-read notice.**

Add changelog entry `hrs-sok-etter-savnet-2026-studiepakke` dated `2026-09-10`, change type `added`, `mustRead: true`, source ID for the HRS guide, and content refs for the study guide plus the updated/new SAR cards/checklists. Add must-read notice `sok-og-redning-2026-studiepakke` with severity `critical`, the title `Dette er nytt – studer før neste søk og redningsaksjon`, the guide slug in `linkedStudyGuideSlugs`, core card slugs in `linkedCardSlugs`, the changelog ID, and a body that says this is local decision support, not an official order.

- [ ] **Step 6: Run the focused content tests and commit.**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -- tests/content/curated-fixtures.test.ts tests/content/donot-safety.test.ts
git diff --check
git add content/curated/action-cards.yaml content/curated/checklists.yaml content/curated/glossary.yaml content/curated/faq.yaml content/curated/search-synonyms.yaml content/curated/changelog.yaml content/curated/must-read.yaml tests/content/curated-fixtures.test.ts tests/content/donot-safety.test.ts
git commit -m "content: add HRS 2026 land-search guidance"
```

### Task 3: Validation, source governance, search and offline integration

**Files:**
- Modify: `scripts/validate-content.ts`
- Modify: `lib/content/coverage-report.ts`
- Modify: `lib/content/source-governance.ts`
- Modify: `lib/content/search-documents.ts`
- Modify: `scripts/build-search-index.ts`
- Modify: `app/(app)/sok/page.tsx`
- Modify: `app/(app)/hurtigkort/page.tsx`
- Modify: `lib/offline/static-app-shell.ts`
- Modify: `tests/content/validate-content.test.ts`
- Modify: `tests/content/source-governance-report.test.ts`
- Modify: `tests/content/search-documents.test.ts`
- Modify: `tests/offline/service-worker-metadata.test.ts`
- Modify: `tests/offline/service-worker-behavior.test.ts`

**Interfaces:**
- Consumes `StudyGuide`, `studyGuideCount`, `linkedStudyGuideSlugs`, new content refs, and the three new card/checklist slugs.
- Produces validated generated/public mirrors, `studieguide:<slug>` search documents, `/generated-content/study-guides.json`, and cached `/nytt/sok-og-redning`.

- [ ] **Step 1: Write failing graph, governance and search tests.**

Add tests that:

```ts
expect(await validateContentGraph({
  sources: [knownSource],
  studyGuides: [{ slug: 'guide', title: 'Guide', summary: 'Summary', audienceRoles: ['leder'], estimatedMinutes: 10, mustStudyBeforeNextSearch: true, provenanceNote: 'Source', sourceIds: ['src-known'], updatedAt: '2026-06-03', sections: [{ id: 'section', title: 'Section', summary: 'Summary', keyPoints: ['Point'], linkedCardSlugs: ['missing-card'], linkedChecklistSlugs: ['missing-checklist'] }] }],
} as any)).toEqual(expect.arrayContaining([
  expect.stringContaining('guide links missing action card missing-card'),
  expect.stringContaining('guide links missing checklist missing-checklist'),
]));
```

Assert that the source-governance report includes `studyguide:sok-etter-savnet-2026` in `referencedBy`, that `buildSearchDocuments` creates `studieguide:sok-etter-savnet-2026` with href `/nytt/sok-og-redning` and `sourceStatus: 'unverified'`, and that the static shell/generated routes contain the new app and JSON paths.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -- tests/content/validate-content.test.ts tests/content/source-governance-report.test.ts tests/content/search-documents.test.ts tests/offline/service-worker-metadata.test.ts tests/offline/service-worker-behavior.test.ts
```

Expected: FAIL until graph sets, counts, builder inputs and routes are wired.

- [ ] **Step 2: Extend graph validation and coverage.**

Add `studyGuides?: any[]` to `GraphInput` and `ContentCoverageGraph`; read it from generated and public JSON. Include `studyGuideCount` in generated counts, compare the public study-guide mirror, validate `StudyGuideSchema`, source IDs, duplicate guide slugs, audience roles, section IDs, linked card slugs and linked checklist slugs. Add `'study-guide': studyGuideSlugs` to content-ref sets and validate `MustReadNotice.linkedStudyGuideSlugs`. Traverse study guides through sensitive operational text and restricted-location checks. Include guide source IDs in coverage/source-governance reference collection and update orphan-source detail wording to include study guides.

- [ ] **Step 3: Extend source governance and search.**

Add `studyGuides?: ReferencingItem[]` to `BuildSourceGovernanceReportInput`, loop through them with labels `studyguide:<slug>`, and add the field to tests. Extend `BuildSearchDocumentsInput` with `studyGuides?: StudyGuide[]`. Build one document per guide:

```ts
{
  id: `studieguide:${guide.slug}`,
  title: guide.title,
  body: [guide.summary, guide.provenanceNote, guide.sections.map((section) => [section.title, section.summary, section.keyPoints])].flat(Infinity).join(' '),
  role: guide.audienceRoles.join(' '),
  type: 'studieguide',
  href: '/nytt/sok-og-redning',
  sourceStatus: sourceStatusFor(guide.sourceIds, sourcesById),
  sourceIds: guide.sourceIds,
}
```

Use a typed `joinSearchText` input if needed so the final body is a string. Load `study-guides.json` in `scripts/build-search-index.ts`, and pass `getStudyGuides()` to the two server pages that build local search documents. Do not add a new search engine or dependency. Add a small `typeMetadataLabel` mapping for `studieguide` only if visible text needs a Norwegian label.

- [ ] **Step 4: Add offline metadata and regenerate the service worker.**

Add `/nytt/sok-og-redning` to `APP_SHELL_ROUTES` and `/generated-content/study-guides.json` to `GENERATED_CONTENT_ROUTES`. Keep the guide out of dynamic route discovery because it has one stable route. Update offline tests to assert the new paths and run the existing generator:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm run build:content
npm run build:search
npm run build:sw
npm run check:sw
```

- [ ] **Step 5: Run graph and offline verification, then commit.**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -- tests/content/validate-content.test.ts tests/content/source-governance-report.test.ts tests/content/search-documents.test.ts tests/offline/service-worker-metadata.test.ts tests/offline/service-worker-behavior.test.ts
npm run validate:content
git diff --check
git add scripts/validate-content.ts lib/content/coverage-report.ts lib/content/source-governance.ts lib/content/search-documents.ts scripts/build-search-index.ts 'app/(app)/sok/page.tsx' 'app/(app)/hurtigkort/page.tsx' lib/offline/static-app-shell.ts public/sw.js tests/content/validate-content.test.ts tests/content/source-governance-report.test.ts tests/content/search-documents.test.ts tests/offline/service-worker-metadata.test.ts tests/offline/service-worker-behavior.test.ts content/generated/source-documents.json content/generated/source-snapshot-metadata.json
git commit -m "feat: index and cache missing-person search guide"
```

### Task 4: Study surface and navigation

**Files:**
- Create: `app/(app)/nytt/sok-og-redning/page.tsx`
- Modify: `app/(app)/nytt/page.tsx`
- Modify: `app/(app)/ma-leses/page.tsx`
- Create: `tests/components/study-guide-page.test.tsx`
- Modify: `tests/components/must-read-page.test.tsx`

**Interfaces:**
- Consumes `getStudyGuides()`, `getActionCards()`, `getChecklists()`, `getSourceDocuments()`, `MustReadAcknowledgementButton`, `SourceBadge`, `buildSourceTitleById`, and the validated guide/link slugs.
- Produces the user-visible route `/nytt/sok-og-redning`, prominent entry links, and local acknowledgement behavior.

- [ ] **Step 1: Write failing UI tests.**

Add tests that render the page and assert:

```ts
render(<StudyGuidePage />);
expect(screen.getByRole('heading', { name: /Dette er nytt.*søk etter savnet/i })).toBeInTheDocument();
expect(screen.getByText(/studer.*før neste søk/i)).toBeInTheDocument();
expect(screen.getByRole('link', { name: /søk etter savnet planlegging/i })).toHaveAttribute('href', '/kort/sok-og-redning-planlegging');
expect(screen.getByText(/SHA-256/i)).toBeInTheDocument();
```

Extend the existing must-read test to assert the new notice renders a link to `/nytt/sok-og-redning` while the acknowledgement button remains versioned by `changedAt`.

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -- tests/components/study-guide-page.test.tsx tests/components/must-read-page.test.tsx
```

Expected: FAIL because the route and notice links are not rendered.

- [ ] **Step 2: Implement the route as one small server page.**

Load the single guide by slug and call `notFound()` if it is absent. Render:

- a back link to `/nytt`
- a high-visibility amber/red study warning stating that this is learning support and not official order or certification
- title, summary, audience roles and estimated minutes
- a seven-section ordered reading sequence with key-point lists
- linked action-card and checklist links resolved through maps so stale slugs do not render broken links
- a source section using `SourceBadge`/source title data, `provenanceNote`, source status and the registered source link
- the existing `MustReadAcknowledgementButton` for the matching must-read notice when present

Keep all content server-rendered and avoid client state, quiz code or new components unless the page becomes difficult to read. Do not render the raw unapproved source body on this study page.

- [ ] **Step 3: Add entry links.**

Add a prominent `Link` from `/nytt` directly below the version summary with the exact visible idea `Studer HRS 2026-veilederen før neste søk`. On `/ma-leses`, render `linkedStudyGuideSlugs` as links with labels `Studiepakke: <guide title>` and retain existing card links/source status/acknowledgement.

- [ ] **Step 4: Run UI tests and commit.**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -- tests/components/study-guide-page.test.tsx tests/components/must-read-page.test.tsx
git diff --check
git add 'app/(app)/nytt/sok-og-redning/page.tsx' 'app/(app)/nytt/page.tsx' 'app/(app)/ma-leses/page.tsx' tests/components/study-guide-page.test.tsx tests/components/must-read-page.test.tsx
git commit -m "feat: add missing-person search study surface"
```

### Task 5: Integrated verification and handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-09-10-sok-etter-savnet-2026-implementation-plan.md` only for checked task status/ledger bookkeeping
- Generated: `content/generated/source-documents.json`, `content/generated/source-snapshot-metadata.json`, and `public/sw.js` as produced by the existing scripts

- [ ] **Step 1: Rebuild the complete content graph with Node 22.**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm run build:content
npm run check:generated
npm run build:sw
npm run check:sw
npm run validate:content
```

Expected: source import finds at least 62 extracts, the HRS source is present with its source ID, the guide count is 1, generated/public mirrors validate, and the content coverage report records the new source as referenced but not pilot-approved.

- [ ] **Step 2: Run focused and project gates.**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm run typecheck
npm run lint
npm test
npm run build:app
```

For route behavior, run the smallest production E2E smoke that covers `/nytt/sok-og-redning`, `/nytt`, `/ma-leses`, `/sok?q=FAKS`, and offline app-shell loading. If the existing E2E suite is the only supported runner, run `npm run e2e:prod:no-build` after `npm run build:app`.

- [ ] **Step 3: Inspect the final diff and content boundaries.**

```bash
git diff --check
git status --short --branch
git diff --stat origin/main...HEAD
rg -n -i 'ISSI|tilgangskode|SAR talkgroup|private coordinates|pasientjournal|fødselsnummer|live tracking' content/curated content/generated public/generated-content 'app/(app)/nytt' || true
```

Confirm that no raw PDF or temporary extraction directory is tracked, all new/changed operational cards remain `pending-fagperson`, and no generated public source body is exposed while the source remains `needs-permission`.

- [ ] **Step 4: Complete the handoff.**

Record exact local commands/results, final commit SHAs, source review non-claims, and the Obsidian daily-log path. State explicitly that fagperson review, field exercise, official FAKS use, live deployment, and external acceptance were not verified unless those checks were actually performed.

## Synthesis and review gates

- The controller reviews each implementer commit against the task brief and the designspec before the next task.
- Task-level review must cover both spec compliance and code quality; implementation self-review is not sufficient.
- If an implementer raises a concern, preserve it in the SDD ledger and resolve it before dependent work.
- Final report must distinguish local build/test evidence from fagperson/field/deployment evidence.
