import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ActionCardSchema,
  ContentChangelogEntrySchema,
  EquipmentTaxonomyRecordSchema,
  ExportTemplateMetadataSchema,
  FAQEntrySchema,
  GlossaryTermSchema,
  ImageMetadataSchema,
  LocalOverlayDeclarationSchema,
  MustReadNoticeSchema,
  OperationalChecklistSchema,
  ProtectionMeasureSchema,
  SourceDocumentSchema,
  TrainingPathSchema,
} from '@/lib/content/schemas';
import { WorkplansSnapshotSchema } from '@/lib/workplans/schemas';
import { containsSensitiveStructuredKey } from '@/lib/content/source-policy';
import { detectSensitiveOperationalText } from '@/lib/privacy/sensitive-text';
import { buildContentCoverageReport as buildCoverageReport } from '@/lib/content/coverage-report';
import { competenceCodes, equipmentTerms, roles, scenarios } from '@/lib/content/taxonomy';

export { buildContentCoverageReport } from '@/lib/content/coverage-report';

interface GraphInput {
  sources?: any[];
  actionCards?: any[];
  checklists?: any[];
  trainingPaths?: any[];
  protectionMeasures?: any[];
  glossary?: any[];
  faq?: any[];
  equipmentTaxonomy?: any[];
  exportTemplates?: any[];
  imageMetadata?: any[];
  localOverlays?: any[];
  changelog?: any[];
  mustRead?: any[];
  workplans?: any;
  manifest?: any;
  searchIndex?: any;
  publicGraph?: GraphInput;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readGeneratedGraph(generatedDir = 'content/generated', publicGeneratedDir = 'public/generated-content'): Promise<GraphInput> {
  return {
    sources: await readJson(path.join(generatedDir, 'source-documents.json')),
    actionCards: await readJson(path.join(generatedDir, 'action-cards.json')),
    checklists: await readJson(path.join(generatedDir, 'checklists.json')),
    trainingPaths: await readJson(path.join(generatedDir, 'training-paths.json')),
    protectionMeasures: await readJson(path.join(generatedDir, 'protection-measures.json')),
    glossary: await readJson(path.join(generatedDir, 'glossary.json')),
    faq: await readJson(path.join(generatedDir, 'faq.json')),
    equipmentTaxonomy: await readJson(path.join(generatedDir, 'equipment-taxonomy.json')),
    exportTemplates: await readJson(path.join(generatedDir, 'export-templates.json')),
    imageMetadata: await readJson(path.join(generatedDir, 'image-metadata.json')),
    localOverlays: await readJson(path.join(generatedDir, 'local-overlays.json')),
    changelog: await readJson(path.join(generatedDir, 'changelog.json')),
    mustRead: await readJson(path.join(generatedDir, 'must-read.json')),
    workplans: await readJson(path.join(generatedDir, 'workplans.json')),
    manifest: await readJson(path.join(generatedDir, 'manifest.json')),
    searchIndex: await readJson(path.join(generatedDir, 'search-index.json')),
    publicGraph: {
      sources: await readJson(path.join(publicGeneratedDir, 'source-documents.json')),
      actionCards: await readJson(path.join(publicGeneratedDir, 'action-cards.json')),
      checklists: await readJson(path.join(publicGeneratedDir, 'checklists.json')),
      trainingPaths: await readJson(path.join(publicGeneratedDir, 'training-paths.json')),
      protectionMeasures: await readJson(path.join(publicGeneratedDir, 'protection-measures.json')),
      glossary: await readJson(path.join(publicGeneratedDir, 'glossary.json')),
      faq: await readJson(path.join(publicGeneratedDir, 'faq.json')),
      equipmentTaxonomy: await readJson(path.join(publicGeneratedDir, 'equipment-taxonomy.json')),
      exportTemplates: await readJson(path.join(publicGeneratedDir, 'export-templates.json')),
      imageMetadata: await readJson(path.join(publicGeneratedDir, 'image-metadata.json')),
      localOverlays: await readJson(path.join(publicGeneratedDir, 'local-overlays.json')),
      changelog: await readJson(path.join(publicGeneratedDir, 'changelog.json')),
      mustRead: await readJson(path.join(publicGeneratedDir, 'must-read.json')),
      workplans: await readJson(path.join(publicGeneratedDir, 'workplans.json')),
      manifest: await readJson(path.join(publicGeneratedDir, 'manifest.json')),
      searchIndex: await readJson(path.join(publicGeneratedDir, 'search-index.json')),
    },
  };
}

function collectRefs(item: any): string[] {
  const refs = new Set<string>();
  if (Array.isArray(item?.sourceIds)) item.sourceIds.forEach((id: string) => refs.add(id));
  if (Array.isArray(item?.items)) {
    item.items.forEach((child: any) => child?.sourceIds?.forEach((id: string) => refs.add(id)));
  }
  return [...refs];
}

function addDuplicateErrors<T>(errors: string[], label: string, items: T[], keyOf: (item: T) => unknown) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = String(keyOf(item) ?? '').trim();
    if (!key) continue;
    if (seen.has(key)) errors.push(`duplicate ${label} ${key}`);
    seen.add(key);
  }
}

const restrictedShelterPublicationPattern = /(?:privat\w*|skjermet\w*|hemmelig\w*|gradert\w*)[^.\n]{0,80}tilfluktsrom|tilfluktsrom[^.\n]{0,80}(?:liste|data|lokasjon|plassering)/i;
const restrictedShelterMarkerPattern = /(?:privat\w*|skjermet\w*|hemmelig\w*|gradert\w*)[^.\n]{0,80}tilfluktsrom|tilfluktsrom[^.\n]{0,80}(?:privat\w*|skjermet\w*|hemmelig\w*|gradert\w*)/i;
const shelterLocationDetailPattern = /\b(?:(?:[A-ZÆØÅ][A-Za-zÆØÅæøå-]+\s+){0,4}(?:[A-ZÆØÅ][A-Za-zÆØÅæøå-]*(?:gata|gaten|veien|vegen|bakken|plassen|torget|alléen|alleen|stien|lia)|gate|gata|gaten|vei|veien|veg|vegen|bakke|bakken|plass|plassen|torg|torget|allé|alle|alléen|alleen|sti|stien|lia)\s+\d+[A-Za-z]?|(?:koordinat|coord|utm|lat|lon|lng)[^\n]{0,40}\d{2}[.,]\d{3,}|\b\d{2}[.,]\d{3,}\s*,\s*\d{1,2}[.,]\d{3,})/i;

function publicProtectionText(measure: any) {
  return JSON.stringify({ title: measure?.title, readinessChecks: measure?.readinessChecks, operationalSteps: measure?.operationalSteps });
}

function validateRestrictedShelterLocationText(errors: string[], value: unknown, currentPath: string) {
  if (typeof value === 'string') {
    const segments = value.split(/(?:[.!?]\s+|\n+)/);
    if (segments.some((segment) => restrictedShelterMarkerPattern.test(segment) && shelterLocationDetailPattern.test(segment))) {
      errors.push(`${currentPath} appears to publish restricted shelter location details`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateRestrictedShelterLocationText(errors, item, `${currentPath}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      validateRestrictedShelterLocationText(errors, child, `${currentPath}.${key}`);
    }
  }
}

function validateRestrictedShelterLocationSurfaces(errors: string[], graph: GraphInput) {
  for (const [key, items] of Object.entries({
    sources: graph.sources,
    actionCards: graph.actionCards,
    checklists: graph.checklists,
    trainingPaths: graph.trainingPaths,
    protectionMeasures: graph.protectionMeasures,
    glossary: graph.glossary,
    faq: graph.faq,
    equipmentTaxonomy: graph.equipmentTaxonomy,
    exportTemplates: graph.exportTemplates,
    imageMetadata: graph.imageMetadata,
    localOverlays: graph.localOverlays,
    changelog: graph.changelog,
    mustRead: graph.mustRead,
    searchIndex: graph.searchIndex,
    publicGraph: graph.publicGraph,
  })) {
    if (items !== undefined) validateRestrictedShelterLocationText(errors, items, key);
  }
}

function looksLikeGenericPolicyWarning(value: string) {
  return /\b(?:ikke|ingen|uten|aldri|nei|skal ikke|må ikke|unngå)\b/i.test(value) && !/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}|\+47\s*(?:\d[\s.-]?){8}|\d{2}[.,]\d{3,}|\b\d{1,5}\s*[A-Za-z]?\b/u.test(value);
}

function shouldIgnoreSensitiveOperationalText(value: string, currentPath: string, kind: string) {
  const normalized = value.trim().toLowerCase();
  if ((kind === 'shielded-location' || kind === 'private-location') && /(?:^|\.)aliases\[\d+\]$/.test(currentPath) && /^(?:skjermet lokasjon|skjermet adresse|private data|privat adresse)$/.test(normalized)) return true;
  if ((kind === 'shielded-location' || kind === 'private-location') && looksLikeGenericPolicyWarning(value)) return true;
  return false;
}

function validateSensitiveOperationalText(errors: string[], value: unknown, currentPath: string, seen = new WeakSet<object>()) {
  if (typeof value === 'string') {
    const match = detectSensitiveOperationalText(value);
    if (match && !shouldIgnoreSensitiveOperationalText(value, currentPath, match.kind)) errors.push(`${currentPath} contains sensitive operational text (${match.kind})`);
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    value.forEach((item, index) => validateSensitiveOperationalText(errors, item, `${currentPath}[${index}]`, seen));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    validateSensitiveOperationalText(errors, child, `${currentPath}.${key}`, seen);
  }
}

function sourceSurfaceForSensitiveValidation(source: any) {
  if (source?.publicationStatus === 'approved-public') return source;
  const { body: _body, ...withoutBody } = source ?? {};
  return withoutBody;
}

function validateSensitiveOperationalTextSurfaces(errors: string[], graph: GraphInput) {
  const generatedSources = (graph.sources ?? []).map(sourceSurfaceForSensitiveValidation);
  for (const [key, items] of Object.entries({
    sources: generatedSources,
    actionCards: graph.actionCards,
    checklists: graph.checklists,
    trainingPaths: graph.trainingPaths,
    protectionMeasures: graph.protectionMeasures,
    glossary: graph.glossary,
    faq: graph.faq,
    equipmentTaxonomy: graph.equipmentTaxonomy,
    exportTemplates: graph.exportTemplates,
    imageMetadata: graph.imageMetadata,
    localOverlays: graph.localOverlays,
    changelog: graph.changelog,
    mustRead: graph.mustRead,
    workplans: graph.workplans,
    manifest: graph.manifest,
    searchIndex: graph.searchIndex,
    publicGraph: graph.publicGraph,
  })) {
    if (items !== undefined) validateSensitiveOperationalText(errors, items, key);
  }
}

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function compareIdSets(errors: string[], label: string, expected: Iterable<string>, actual: Iterable<string>) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  for (const id of expectedSet) if (!actualSet.has(id)) errors.push(`${label} missing ${id}`);
  for (const id of actualSet) if (!expectedSet.has(id)) errors.push(`${label} has unexpected ${id}`);
}

function approvedFaqEntries(graph: Pick<GraphInput, 'faq'>) {
  return (graph.faq ?? []).filter((entry: any) => String(entry.status ?? 'approved') === 'approved');
}

function validateGeneratedArtifacts(errors: string[], graph: GraphInput) {
  const publicFaq = approvedFaqEntries(graph);
  const counts = {
    sourceCount: graph.sources?.length ?? 0,
    actionCardCount: graph.actionCards?.length ?? 0,
    checklistCount: graph.checklists?.length ?? 0,
    trainingPathCount: graph.trainingPaths?.length ?? 0,
    protectionMeasureCount: graph.protectionMeasures?.length ?? 0,
    glossaryCount: graph.glossary?.length ?? 0,
    faqCount: publicFaq.length,
    equipmentTaxonomyCount: graph.equipmentTaxonomy?.length ?? 0,
    exportTemplateCount: graph.exportTemplates?.length ?? 0,
    imageMetadataCount: graph.imageMetadata?.length ?? 0,
    localOverlayCount: graph.localOverlays?.length ?? 0,
    changelogCount: graph.changelog?.length ?? 0,
    mustReadCount: graph.mustRead?.length ?? 0,
    workplanCount: Array.isArray(graph.workplans?.workplans) ? graph.workplans.workplans.length : 0,
  };

  if (graph.manifest) {
    for (const [key, expected] of Object.entries(counts)) {
      if (graph.manifest[key] !== expected) errors.push(`manifest ${key}=${graph.manifest[key]} does not match generated count ${expected}`);
    }
    if (typeof graph.manifest.sourceSnapshotGeneratedAt !== 'string' || graph.manifest.sourceSnapshotGeneratedAt.trim().length === 0) {
      errors.push('manifest sourceSnapshotGeneratedAt is required to distinguish source snapshot freshness from build time');
    }
    if (typeof graph.manifest.sourceSnapshotHash !== 'string' || graph.manifest.sourceSnapshotHash.trim().length === 0) {
      errors.push('manifest sourceSnapshotHash is required to identify the source snapshot used by the build');
    }
    if (typeof graph.manifest.usedPregeneratedFallback !== 'boolean') {
      errors.push('manifest usedPregeneratedFallback must be a boolean');
    }
  }

  const publicGraph = graph.publicGraph;
  if (publicGraph) {
    if (graph.manifest && publicGraph.manifest && !sameJson(graph.manifest, publicGraph.manifest)) errors.push('public generated manifest does not mirror content generated manifest');
    for (const key of ['actionCards', 'checklists', 'trainingPaths', 'protectionMeasures', 'glossary', 'equipmentTaxonomy', 'exportTemplates', 'imageMetadata', 'localOverlays', 'changelog', 'mustRead', 'workplans'] as const) {
      if (!sameJson(graph[key] ?? [], publicGraph[key] ?? [])) errors.push(`public generated ${key} does not mirror content generated ${key}`);
    }
    if (!sameJson(publicFaq, publicGraph.faq ?? [])) errors.push('public generated faq does not mirror approved content generated faq');
    compareIdSets(errors, 'public source documents', (graph.sources ?? []).map((source) => String(source.id)), (publicGraph.sources ?? []).map((source) => String(source.id)));
    for (const source of graph.sources ?? []) {
      const publicSource = (publicGraph.sources ?? []).find((candidate) => candidate.id === source.id);
      if (!publicSource) continue;
      for (const key of ['id', 'title', 'sourcePath', 'sourceType', 'status', 'verifiedAt', 'reviewAfter', 'expiresAt', 'owner', 'reviewer', 'reviewRisk', 'reviewNotes'] as const) {
        if (source[key] !== publicSource[key]) errors.push(`public source ${source.id} field ${key} does not mirror content generated source`);
      }
      if (!String(source.body ?? '').startsWith(String(publicSource.body ?? ''))) errors.push(`public source ${source.id} body is not a prefix of content generated body`);
    }
  }

  const docs = Array.isArray(graph.searchIndex?.documents) ? graph.searchIndex.documents : undefined;
  if (docs) {
    const searchableSources = (graph.sources ?? []).filter((source) => source.pilotReviewStatus !== 'rejected-for-pilot');
    const sourceDocs = docs.filter((doc: any) => String(doc?.id ?? '').startsWith('kilde:'));
    compareIdSets(errors, 'search index source document ids', searchableSources.map((source) => `kilde:${source.id}`), sourceDocs.map((doc: any) => String(doc.id)));
    compareIdSets(errors, 'search index checklist document ids', (graph.checklists ?? []).map((checklist) => `sjekkliste:${checklist.slug}`), docs.filter((doc: any) => String(doc?.id ?? '').startsWith('sjekkliste:')).map((doc: any) => String(doc.id)));
    compareIdSets(errors, 'search index FAQ document ids', publicFaq.map((entry: any) => `faq:${entry.id}`), docs.filter((doc: any) => String(doc?.id ?? '').startsWith('faq:')).map((doc: any) => String(doc.id)));
    const expectedDocCount = searchableSources.length + counts.actionCardCount + counts.checklistCount + counts.glossaryCount + counts.trainingPathCount + counts.protectionMeasureCount + publicFaq.length;
    if (docs.length !== expectedDocCount) errors.push(`search index document count ${docs.length} does not match generated count ${expectedDocCount}`);
    const sourceById = new Map((graph.sources ?? []).map((source) => [String(source.id), source]));
    for (const doc of docs) {
      if (String(doc?.id ?? '').startsWith('kilde:') && !String(doc?.href ?? '').startsWith('/kilder/')) errors.push(`search index source document ${doc.id} has invalid href ${doc.href}`);
      if (String(doc?.id ?? '').startsWith('kilde:')) {
        const sourceId = String(doc.id).replace(/^kilde:/, '');
        const source = sourceById.get(sourceId);
        const body = String(source?.body ?? '').trim();
        if (source?.publicationStatus !== 'approved-public' && body.length > 0 && String(doc?.body ?? '').includes(body.slice(0, Math.min(80, body.length)))) {
          errors.push(`search index source document ${doc.id} exposes non-public source body`);
        }
      }
    }
  }
  if (publicGraph?.searchIndex && graph.searchIndex && !sameJson(graph.searchIndex, publicGraph.searchIndex)) errors.push('public generated search-index does not mirror content generated search-index');
}

function validateTaxonomyValues(errors: string[], label: string, values: unknown[] | undefined, allowed: Set<string>) {
  for (const value of values ?? []) {
    if (!allowed.has(String(value))) errors.push(`${label} references unknown taxonomy value ${String(value)}`);
  }
}

function validateEquipmentValues(errors: string[], label: string, values: unknown[] | undefined, allowed: Set<string>, declared: Map<string, any>) {
  validateTaxonomyValues(errors, label, values, allowed);
  for (const value of values ?? []) {
    const term = String(value);
    const record = declared.get(term);
    if (allowed.has(term) && !record) errors.push(`${label} references equipment value missing from equipment taxonomy ${term}`);
    if (record && record.approvedForPublicUse !== true) errors.push(`${label} references equipment value not approved for public use ${term}`);
  }
}

function validateSafetySentenceFragments(errors: string[], card: any) {
  for (const field of ['doNot', 'safety', 'reporting'] as const) {
    const values = Array.isArray(card?.[field]) ? card[field] : [];
    values.forEach((value: unknown, index: number) => {
      const text = String(value ?? '').trim();
      if (/^[a-zæøå]/u.test(text)) {
        errors.push(`${card.slug ?? 'card'} ${field}[${index}] appears to be a sentence fragment`);
      }
    });
  }
}

function safeAssetNameFromReference(ref: string): string | null {
  const clean = ref.split('|')[0]?.trim().replace(/^<|>$/g, '');
  if (!clean) return null;
  try {
    const decoded = decodeURIComponent(clean).replace(/\\/g, '/');
    const fileName = decoded.split('/').pop();
    if (!fileName || !/\.(png|jpe?g|svg|webp)$/i.test(fileName)) return null;
    return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  } catch {
    const fallbackFileName = clean.replace(/\\/g, '/').split('/').pop();
    if (!fallbackFileName || !/\.(png|jpe?g|svg|webp)$/i.test(fallbackFileName)) return null;
    return fallbackFileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  }
}

function collectImageRefs(value: unknown, refs = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/!\[[^\]]*\]\(([^)]+)\)|!\[\[([^\]]+)\]\]|(?:\/content-assets\/|content-assets\/)([A-Za-z0-9._-]+\.(?:png|jpg|jpeg|svg|webp))/gi)) {
      const normalized = match[3] ?? safeAssetNameFromReference(match[1] ?? match[2] ?? '');
      if (normalized) refs.add(normalized);
    }
    return refs;
  }
  if (Array.isArray(value)) value.forEach((item) => collectImageRefs(item, refs));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectImageRefs(item, refs));
  return refs;
}

async function publicAssetExists(publicPath: string) {
  if (!publicPath.startsWith('/content-assets/')) return true;
  try {
    await fs.access(path.join(process.cwd(), 'public', publicPath.replace(/^\//, '')));
    return true;
  } catch {
    return false;
  }
}

async function validateImagePublication(errors: string[], graph: GraphInput) {
  const approvedImages = new Map((graph.imageMetadata ?? []).map((image: any) => [String(image.publicPath ?? '').split('/').pop() ?? '', image]));
  for (const image of graph.imageMetadata ?? []) {
    const publicPath = String(image.publicPath ?? '');
    if (image.approvedForPublication === true && !(await publicAssetExists(publicPath))) {
      errors.push(`${image.id ?? 'image'} points to missing public asset ${publicPath}`);
    }
  }
  const refs = collectImageRefs({ sources: graph.sources, actionCards: graph.actionCards, checklists: graph.checklists, faq: graph.faq });
  for (const ref of refs) {
    const metadata = approvedImages.get(ref);
    if (!metadata) {
      errors.push(`image reference ${ref} is missing approved publication metadata`);
      continue;
    }
    if (metadata.approvedForPublication !== true) errors.push(`image reference ${ref} is not approved for publication`);
    const publicPath = String(metadata.publicPath ?? '');
    if (!(await publicAssetExists(publicPath))) {
      errors.push(`image reference ${ref} points to missing public asset ${publicPath}`);
    }
  }
}

function validateContentRef(errors: string[], ref: any, sets: Record<string, Set<string>>, label: string) {
  const kind = String(ref?.kind ?? '');
  const id = String(ref?.id ?? '');
  const set = sets[kind];
  if (set && !set.has(id)) errors.push(`${label} references missing ${kind} ${id}`);
}

export async function validateContentGraph(input?: GraphInput): Promise<string[]> {
  const graph = input ?? (await readGeneratedGraph());
  const errors: string[] = [];
  const sources = graph.sources ?? [];
  const actionCards = graph.actionCards ?? [];
  const checklists = graph.checklists ?? [];
  const trainingPaths = graph.trainingPaths ?? [];
  const protectionMeasures = graph.protectionMeasures ?? [];
  const glossary = graph.glossary ?? [];
  const faq = graph.faq ?? [];
  const equipmentTaxonomy = graph.equipmentTaxonomy ?? [];
  const exportTemplates = graph.exportTemplates ?? [];
  const imageMetadata = graph.imageMetadata ?? [];
  const localOverlays = graph.localOverlays ?? [];
  const changelog = graph.changelog ?? [];
  const mustRead = graph.mustRead ?? [];
  const workplans = graph.workplans;
  const sourceIds = new Set(sources.map((source: any) => source.id));
  const actionCardSlugs = new Set(actionCards.map((card: any) => card.slug));
  const checklistSlugs = new Set(checklists.map((checklist: any) => checklist.slug));
  const trainingPathSlugs = new Set(trainingPaths.map((training: any) => training.slug));
  const protectionMeasureSlugs = new Set(protectionMeasures.map((measure: any) => measure.slug));
  const faqIds = new Set(faq.map((entry: any) => entry.id));
  const sourceStatus = new Map(sources.map((source: any) => [source.id, source.status]));
  const roleSet = new Set<string>(roles);
  const scenarioSet = new Set<string>(scenarios);
  const equipmentSet = new Set<string>(equipmentTerms);
  const declaredEquipmentById = new Map<string, any>(equipmentTaxonomy.map((record: any) => [String(record.id), record]));
  const competenceSet = new Set<string>(competenceCodes);

  addDuplicateErrors(errors, 'source id', sources, (source: any) => source.id);
  addDuplicateErrors(errors, 'action card slug', actionCards, (card: any) => card.slug);
  addDuplicateErrors(errors, 'checklist slug', checklists, (checklist: any) => checklist.slug);
  addDuplicateErrors(errors, 'training path slug', trainingPaths, (training: any) => training.slug);
  addDuplicateErrors(errors, 'protection measure slug', protectionMeasures, (measure: any) => measure.slug);
  addDuplicateErrors(errors, 'glossary term', glossary, (term: any) => term.term);
  addDuplicateErrors(errors, 'FAQ id', faq, (entry: any) => entry.id);
  addDuplicateErrors(errors, 'equipment taxonomy id', equipmentTaxonomy, (record: any) => record.id);
  addDuplicateErrors(errors, 'export template id', exportTemplates, (template: any) => template.id);
  addDuplicateErrors(errors, 'image metadata id', imageMetadata, (image: any) => image.id);
  addDuplicateErrors(errors, 'local overlay id', localOverlays, (overlay: any) => overlay.id);
  addDuplicateErrors(errors, 'changelog id', changelog, (entry: any) => entry.id);
  addDuplicateErrors(errors, 'must-read id', mustRead, (notice: any) => notice.id);

  sources.forEach((source, index) => {
    const result = SourceDocumentSchema.safeParse(source);
    if (!result.success) errors.push(`sources[${index}] ${result.error.message}`);
  });
  actionCards.forEach((card, index) => {
    const result = ActionCardSchema.safeParse(card);
    if (!result.success) errors.push(`actionCards[${index}] ${result.error.message}`);
    validateTaxonomyValues(errors, `${card.slug ?? `actionCards[${index}]`} roles`, card.roles, roleSet);
    validateTaxonomyValues(errors, `${card.slug ?? `actionCards[${index}]`} scenarios`, card.scenarios, scenarioSet);
    validateTaxonomyValues(errors, `${card.slug ?? `actionCards[${index}]`} competenceRequired`, card.competenceRequired, competenceSet);
    validateEquipmentValues(errors, `${card.slug ?? `actionCards[${index}]`} equipmentRequired`, card.equipmentRequired, equipmentSet, declaredEquipmentById);
    for (const sourceId of collectRefs(card)) {
      if (!sourceIds.has(sourceId)) errors.push(`${card.slug ?? 'card'} references missing source ${sourceId}`);
    }
    const needsWarning = collectRefs(card).some((sourceId) => ['historical', 'unverified', 'draft', 'expired'].includes(String(sourceStatus.get(sourceId))));
    if (needsWarning && !card.warning) errors.push(`${card.slug ?? 'card'} uses non-verified source without visible warning`);
    validateSafetySentenceFragments(errors, card);
  });
  checklists.forEach((checklist, index) => {
    const result = OperationalChecklistSchema.safeParse(checklist);
    if (!result.success) errors.push(`checklists[${index}] ${result.error.message}`);
    validateTaxonomyValues(errors, `${checklist.slug ?? `checklists[${index}]`} roles`, checklist.roles, roleSet);
    validateTaxonomyValues(errors, `${checklist.slug ?? `checklists[${index}]`} scenarios`, checklist.scenarios, scenarioSet);
    validateEquipmentValues(errors, `${checklist.slug ?? `checklists[${index}]`} equipmentRequired`, checklist.equipmentRequired, equipmentSet, declaredEquipmentById);
    for (const sourceId of collectRefs(checklist)) if (!sourceIds.has(sourceId)) errors.push(`${checklist.slug ?? 'checklist'} references missing source ${sourceId}`);
  });
  trainingPaths.forEach((training, index) => {
    const result = TrainingPathSchema.safeParse(training);
    if (!result.success) errors.push(`trainingPaths[${index}] ${result.error.message}`);
    validateTaxonomyValues(errors, `${training.slug ?? `trainingPaths[${index}]`} targetRoles`, training.targetRoles, roleSet);
    validateTaxonomyValues(errors, `${training.slug ?? `trainingPaths[${index}]`} competence codes`, [training.courseCode, ...(training.prerequisites ?? [])], competenceSet);
    for (const sourceId of collectRefs(training)) if (!sourceIds.has(sourceId)) errors.push(`${training.slug ?? 'training'} references missing source ${sourceId}`);
    for (const cardSlug of training.linkedCardSlugs ?? []) if (!actionCardSlugs.has(cardSlug)) errors.push(`${training.slug ?? 'training'} links missing action card ${cardSlug}`);
  });
  protectionMeasures.forEach((measure, index) => {
    const result = ProtectionMeasureSchema.safeParse(measure);
    if (!result.success) errors.push(`protectionMeasures[${index}] ${result.error.message}`);
    const protectionText = publicProtectionText(measure);
    if (measure.publicOrRestricted === 'public' && restrictedShelterPublicationPattern.test(protectionText)) {
      errors.push(`${measure.slug ?? 'measure'} appears to publish restricted shelter data as public content`);
    }
    for (const sourceId of collectRefs(measure)) if (!sourceIds.has(sourceId)) errors.push(`${measure.slug ?? 'measure'} references missing source ${sourceId}`);
  });
  glossary.forEach((term, index) => {
    const result = GlossaryTermSchema.safeParse(term);
    if (!result.success) errors.push(`glossary[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(term)) if (!sourceIds.has(sourceId)) errors.push(`${term.term ?? 'term'} references missing source ${sourceId}`);
  });
  faq.forEach((entry, index) => {
    const result = FAQEntrySchema.safeParse(entry);
    if (!result.success) errors.push(`faq[${index}] ${result.error.message}`);
    validateTaxonomyValues(errors, `${entry.id ?? `faq[${index}]`} roles`, entry.roles, roleSet);
    validateTaxonomyValues(errors, `${entry.id ?? `faq[${index}]`} scenarios`, entry.scenarios, scenarioSet);
    validateTaxonomyValues(errors, `${entry.id ?? `faq[${index}]`} competenceCodes`, entry.competenceCodes, competenceSet);
    validateEquipmentValues(errors, `${entry.id ?? `faq[${index}]`} equipmentTerms`, entry.equipmentTerms, equipmentSet, declaredEquipmentById);
    for (const sourceId of collectRefs(entry)) if (!sourceIds.has(sourceId)) errors.push(`${entry.id ?? 'FAQ'} references missing source ${sourceId}`);
  });
  equipmentTaxonomy.forEach((record, index) => {
    const result = EquipmentTaxonomyRecordSchema.safeParse(record);
    if (!result.success) errors.push(`equipmentTaxonomy[${index}] ${result.error.message}`);
    validateTaxonomyValues(errors, `${record.id ?? `equipmentTaxonomy[${index}]`} id`, [record.id], equipmentSet);
    for (const sourceId of collectRefs(record)) if (!sourceIds.has(sourceId)) errors.push(`${record.id ?? 'equipment'} references missing source ${sourceId}`);
  });
  exportTemplates.forEach((template, index) => {
    const result = ExportTemplateMetadataSchema.safeParse(template);
    if (!result.success) errors.push(`exportTemplates[${index}] ${result.error.message}`);
    validateTaxonomyValues(errors, `${template.id ?? `exportTemplates[${index}]`} audienceRoles`, template.audienceRoles, roleSet);
    for (const sourceId of collectRefs(template)) if (!sourceIds.has(sourceId)) errors.push(`${template.id ?? 'export template'} references missing source ${sourceId}`);
  });
  imageMetadata.forEach((image, index) => {
    const result = ImageMetadataSchema.safeParse(image);
    if (!result.success) errors.push(`imageMetadata[${index}] ${result.error.message}`);
    if (image.approvedForPublication !== true) errors.push(`${image.id ?? 'image'} is not approved for publication`);
    for (const sourceId of collectRefs(image)) if (!sourceIds.has(sourceId)) errors.push(`${image.id ?? 'image'} references missing source ${sourceId}`);
    for (const slug of image.usedByCardSlugs ?? []) if (!actionCardSlugs.has(slug)) errors.push(`${image.id ?? 'image'} links missing action card ${slug}`);
  });
  localOverlays.forEach((overlay, index) => {
    const result = LocalOverlayDeclarationSchema.safeParse(overlay);
    if (!result.success) errors.push(`localOverlays[${index}] ${result.error.message}`);
    validateTaxonomyValues(errors, `${overlay.id ?? `localOverlays[${index}]`} appliesToScenarios`, overlay.appliesToScenarios, scenarioSet);
    for (const sourceId of collectRefs(overlay)) if (!sourceIds.has(sourceId)) errors.push(`${overlay.id ?? 'overlay'} references missing source ${sourceId}`);
  });
  const contentRefSets: Record<string, Set<string>> = {
    'action-card': actionCardSlugs,
    checklist: checklistSlugs,
    source: sourceIds,
    faq: faqIds,
    'training-path': trainingPathSlugs,
    'protection-measure': protectionMeasureSlugs,
  };
  changelog.forEach((entry, index) => {
    const result = ContentChangelogEntrySchema.safeParse(entry);
    if (!result.success) errors.push(`changelog[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(entry)) if (!sourceIds.has(sourceId)) errors.push(`${entry.id ?? 'changelog'} references missing source ${sourceId}`);
    for (const ref of entry.contentRefs ?? []) validateContentRef(errors, ref, contentRefSets, entry.id ?? 'changelog');
  });
  const changelogIds = new Set(changelog.map((entry: any) => entry.id));
  mustRead.forEach((notice, index) => {
    const result = MustReadNoticeSchema.safeParse(notice);
    if (!result.success) errors.push(`mustRead[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(notice)) if (!sourceIds.has(sourceId)) errors.push(`${notice.id ?? 'must-read'} references missing source ${sourceId}`);
    for (const slug of notice.linkedCardSlugs ?? []) if (!actionCardSlugs.has(slug)) errors.push(`${notice.id ?? 'must-read'} links missing action card ${slug}`);
    if (notice.changelogEntryId && !changelogIds.has(notice.changelogEntryId)) errors.push(`${notice.id ?? 'must-read'} links missing changelog entry ${notice.changelogEntryId}`);
  });
  await validateImagePublication(errors, graph);
  if (workplans !== undefined) {
    const workplansResult = WorkplansSnapshotSchema.safeParse(workplans);
    if (!workplansResult.success) {
      errors.push(`workplans ${workplansResult.error.message}`);
    } else {
      addDuplicateErrors(errors, 'workplan id', workplansResult.data.workplans, (workplan: any) => workplan.id);
    }
  }

  const sensitiveKeys = containsSensitiveStructuredKey(graph);
  sensitiveKeys.forEach((key) => errors.push(`generated content exposes sensitive structured key ${key}`));
  validateRestrictedShelterLocationSurfaces(errors, graph);
  validateSensitiveOperationalTextSurfaces(errors, graph);
  validateGeneratedArtifacts(errors, graph);
  return errors;
}

async function main() {
  const graph = await readGeneratedGraph();
  const report = buildCoverageReport(graph);
  await writeJson(path.join('content/generated', 'content-coverage-report.json'), report);
  await writeJson(path.join('public/generated-content', 'content-coverage-report.json'), report);
  const errors = await validateContentGraph(graph);
  if (errors.length > 0) {
    errors.forEach((error) => console.error(error));
    process.exit(1);
  }
  console.log(`Content graph valid. Coverage report generated with ${report.releaseBoard.gaps.length} release-board gaps.`);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
