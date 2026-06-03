import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ActionCardSchema,
  GlossaryTermSchema,
  OperationalChecklistSchema,
  ProtectionMeasureSchema,
  SourceDocumentSchema,
  TrainingPathSchema,
} from '@/lib/content/schemas';
import { WorkplansSnapshotSchema } from '@/lib/workplans/schemas';
import { containsSensitiveStructuredKey } from '@/lib/content/source-policy';
import { buildContentCoverageReport as buildCoverageReport } from '@/lib/content/coverage-report';

export { buildContentCoverageReport } from '@/lib/content/coverage-report';

interface GraphInput {
  sources?: any[];
  actionCards?: any[];
  checklists?: any[];
  trainingPaths?: any[];
  protectionMeasures?: any[];
  glossary?: any[];
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
    searchIndex: graph.searchIndex,
    publicGraph: graph.publicGraph,
  })) {
    if (items !== undefined) validateRestrictedShelterLocationText(errors, items, key);
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

function validateGeneratedArtifacts(errors: string[], graph: GraphInput) {
  const counts = {
    sourceCount: graph.sources?.length ?? 0,
    actionCardCount: graph.actionCards?.length ?? 0,
    checklistCount: graph.checklists?.length ?? 0,
    trainingPathCount: graph.trainingPaths?.length ?? 0,
    protectionMeasureCount: graph.protectionMeasures?.length ?? 0,
    glossaryCount: graph.glossary?.length ?? 0,
    workplanCount: Array.isArray(graph.workplans?.workplans) ? graph.workplans.workplans.length : 0,
  };

  if (graph.manifest) {
    for (const [key, expected] of Object.entries(counts)) {
      if (graph.manifest[key] !== expected) errors.push(`manifest ${key}=${graph.manifest[key]} does not match generated count ${expected}`);
    }
  }

  const publicGraph = graph.publicGraph;
  if (publicGraph) {
    if (graph.manifest && publicGraph.manifest && !sameJson(graph.manifest, publicGraph.manifest)) errors.push('public generated manifest does not mirror content generated manifest');
    for (const key of ['actionCards', 'checklists', 'trainingPaths', 'protectionMeasures', 'glossary', 'workplans'] as const) {
      if (!sameJson(graph[key] ?? [], publicGraph[key] ?? [])) errors.push(`public generated ${key} does not mirror content generated ${key}`);
    }
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
    compareIdSets(errors, 'search index source document ids', (graph.sources ?? []).map((source) => `kilde:${source.id}`), docs.filter((doc: any) => String(doc?.id ?? '').startsWith('kilde:')).map((doc: any) => String(doc.id)));
    const expectedDocCount = counts.sourceCount + counts.actionCardCount + counts.glossaryCount + counts.trainingPathCount + counts.protectionMeasureCount;
    if (docs.length !== expectedDocCount) errors.push(`search index document count ${docs.length} does not match generated count ${expectedDocCount}`);
    for (const doc of docs) {
      if (String(doc?.id ?? '').startsWith('kilde:') && !String(doc?.href ?? '').startsWith('/kilder/')) errors.push(`search index source document ${doc.id} has invalid href ${doc.href}`);
    }
  }
  if (publicGraph?.searchIndex && graph.searchIndex && !sameJson(graph.searchIndex, publicGraph.searchIndex)) errors.push('public generated search-index does not mirror content generated search-index');
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
  const workplans = graph.workplans;
  const sourceIds = new Set(sources.map((source: any) => source.id));
  const actionCardSlugs = new Set(actionCards.map((card: any) => card.slug));
  const sourceStatus = new Map(sources.map((source: any) => [source.id, source.status]));

  addDuplicateErrors(errors, 'source id', sources, (source: any) => source.id);
  addDuplicateErrors(errors, 'action card slug', actionCards, (card: any) => card.slug);
  addDuplicateErrors(errors, 'checklist slug', checklists, (checklist: any) => checklist.slug);
  addDuplicateErrors(errors, 'training path slug', trainingPaths, (training: any) => training.slug);
  addDuplicateErrors(errors, 'protection measure slug', protectionMeasures, (measure: any) => measure.slug);
  addDuplicateErrors(errors, 'glossary term', glossary, (term: any) => term.term);

  sources.forEach((source, index) => {
    const result = SourceDocumentSchema.safeParse(source);
    if (!result.success) errors.push(`sources[${index}] ${result.error.message}`);
  });
  actionCards.forEach((card, index) => {
    const result = ActionCardSchema.safeParse(card);
    if (!result.success) errors.push(`actionCards[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(card)) {
      if (!sourceIds.has(sourceId)) errors.push(`${card.slug ?? 'card'} references missing source ${sourceId}`);
    }
    const needsWarning = collectRefs(card).some((sourceId) => ['historical', 'unverified', 'draft', 'expired'].includes(String(sourceStatus.get(sourceId))));
    if (needsWarning && !card.warning) errors.push(`${card.slug ?? 'card'} uses non-verified source without visible warning`);
  });
  checklists.forEach((checklist, index) => {
    const result = OperationalChecklistSchema.safeParse(checklist);
    if (!result.success) errors.push(`checklists[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(checklist)) if (!sourceIds.has(sourceId)) errors.push(`${checklist.slug ?? 'checklist'} references missing source ${sourceId}`);
  });
  trainingPaths.forEach((training, index) => {
    const result = TrainingPathSchema.safeParse(training);
    if (!result.success) errors.push(`trainingPaths[${index}] ${result.error.message}`);
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
