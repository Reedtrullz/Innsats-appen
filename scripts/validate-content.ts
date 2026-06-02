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
import { containsSensitiveStructuredKey } from '@/lib/content/source-policy';

interface GraphInput {
  sources?: any[];
  actionCards?: any[];
  checklists?: any[];
  trainingPaths?: any[];
  protectionMeasures?: any[];
  glossary?: any[];
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function readGeneratedGraph(generatedDir = 'content/generated'): Promise<GraphInput> {
  return {
    sources: await readJson(path.join(generatedDir, 'source-documents.json')),
    actionCards: await readJson(path.join(generatedDir, 'action-cards.json')),
    checklists: await readJson(path.join(generatedDir, 'checklists.json')),
    trainingPaths: await readJson(path.join(generatedDir, 'training-paths.json')),
    protectionMeasures: await readJson(path.join(generatedDir, 'protection-measures.json')),
    glossary: await readJson(path.join(generatedDir, 'glossary.json')),
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

export async function validateContentGraph(input?: GraphInput): Promise<string[]> {
  const graph = input ?? (await readGeneratedGraph());
  const errors: string[] = [];
  const sources = graph.sources ?? [];
  const sourceIds = new Set(sources.map((source: any) => source.id));
  const sourceStatus = new Map(sources.map((source: any) => [source.id, source.status]));

  sources.forEach((source, index) => {
    const result = SourceDocumentSchema.safeParse(source);
    if (!result.success) errors.push(`sources[${index}] ${result.error.message}`);
  });
  (graph.actionCards ?? []).forEach((card, index) => {
    const result = ActionCardSchema.safeParse(card);
    if (!result.success) errors.push(`actionCards[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(card)) {
      if (!sourceIds.has(sourceId)) errors.push(`${card.slug ?? 'card'} references missing source ${sourceId}`);
    }
    const needsWarning = collectRefs(card).some((sourceId) => ['historical', 'unverified', 'draft', 'expired'].includes(String(sourceStatus.get(sourceId))));
    if (needsWarning && !card.warning) errors.push(`${card.slug ?? 'card'} uses non-verified source without visible warning`);
  });
  (graph.checklists ?? []).forEach((checklist, index) => {
    const result = OperationalChecklistSchema.safeParse(checklist);
    if (!result.success) errors.push(`checklists[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(checklist)) if (!sourceIds.has(sourceId)) errors.push(`${checklist.slug ?? 'checklist'} references missing source ${sourceId}`);
  });
  (graph.trainingPaths ?? []).forEach((training, index) => {
    const result = TrainingPathSchema.safeParse(training);
    if (!result.success) errors.push(`trainingPaths[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(training)) if (!sourceIds.has(sourceId)) errors.push(`${training.slug ?? 'training'} references missing source ${sourceId}`);
  });
  (graph.protectionMeasures ?? []).forEach((measure, index) => {
    const result = ProtectionMeasureSchema.safeParse(measure);
    if (!result.success) errors.push(`protectionMeasures[${index}] ${result.error.message}`);
    if (measure.publicOrRestricted === 'public' && /privat(e)?\s+tilfluktsromliste/i.test(JSON.stringify(measure))) {
      errors.push(`${measure.slug ?? 'measure'} appears to publish private shelter list as public content`);
    }
    for (const sourceId of collectRefs(measure)) if (!sourceIds.has(sourceId)) errors.push(`${measure.slug ?? 'measure'} references missing source ${sourceId}`);
  });
  (graph.glossary ?? []).forEach((term, index) => {
    const result = GlossaryTermSchema.safeParse(term);
    if (!result.success) errors.push(`glossary[${index}] ${result.error.message}`);
    for (const sourceId of collectRefs(term)) if (!sourceIds.has(sourceId)) errors.push(`${term.term ?? 'term'} references missing source ${sourceId}`);
  });

  const sensitiveKeys = containsSensitiveStructuredKey(graph);
  sensitiveKeys.forEach((key) => errors.push(`generated content exposes sensitive structured key ${key}`));
  return errors;
}

async function main() {
  const errors = await validateContentGraph();
  if (errors.length > 0) {
    errors.forEach((error) => console.error(error));
    process.exit(1);
  }
  console.log('Content graph valid');
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
