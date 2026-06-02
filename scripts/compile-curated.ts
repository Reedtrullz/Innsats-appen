import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';
import {
  ActionCardSchema,
  ContentManifestSchema,
  GlossaryTermSchema,
  OperationalChecklistSchema,
  ProtectionMeasureSchema,
  TrainingPathSchema,
  type ActionCard,
  type ContentManifest,
  type GlossaryTerm,
  type OperationalChecklist,
  type ProtectionMeasure,
  type TrainingPath,
} from '@/lib/content/schemas';

export interface CompileOptions {
  curatedDir?: string;
  generatedDir?: string;
  publicGeneratedDir?: string;
}

export interface CompileResult {
  actionCards: ActionCard[];
  checklists: OperationalChecklist[];
  trainingPaths: TrainingPath[];
  protectionMeasures: ProtectionMeasure[];
  glossary: GlossaryTerm[];
  manifest: ContentManifest;
}

async function readYamlArray<T>(filePath: string, label: string, parse: (value: unknown) => T): Promise<T[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  const value = yaml.load(raw);
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a non-empty YAML array`);
  return value.map((entry, index) => {
    try {
      return parse(entry);
    } catch (error) {
      throw new Error(`${label}[${index}] invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readManifest(generatedDir: string): Promise<ContentManifest> {
  try {
    return ContentManifestSchema.parse(JSON.parse(await fs.readFile(path.join(generatedDir, 'manifest.json'), 'utf8')));
  } catch {
    return {
      contentVersion: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      sourceCount: 0,
      actionCardCount: 0,
      checklistCount: 0,
      trainingPathCount: 0,
      protectionMeasureCount: 0,
      glossaryCount: 0,
      copiedAssetCount: 0,
    };
  }
}

export async function compileCuratedContent(options: CompileOptions = {}): Promise<CompileResult> {
  const curatedDir = path.resolve(options.curatedDir ?? 'content/curated');
  const generatedDir = path.resolve(options.generatedDir ?? 'content/generated');
  const publicGeneratedDir = path.resolve(options.publicGeneratedDir ?? 'public/generated-content');

  const actionCards = await readYamlArray(path.join(curatedDir, 'action-cards.yaml'), 'action cards', (v) => ActionCardSchema.parse(v));
  const checklists = await readYamlArray(path.join(curatedDir, 'checklists.yaml'), 'checklists', (v) => OperationalChecklistSchema.parse(v));
  const trainingPaths = await readYamlArray(path.join(curatedDir, 'training-paths.yaml'), 'training paths', (v) => TrainingPathSchema.parse(v));
  const protectionMeasures = await readYamlArray(path.join(curatedDir, 'protection-measures.yaml'), 'protection measures', (v) => ProtectionMeasureSchema.parse(v));
  const glossary = await readYamlArray(path.join(curatedDir, 'glossary.yaml'), 'glossary', (v) => GlossaryTermSchema.parse(v));

  await writeJson(path.join(generatedDir, 'action-cards.json'), actionCards);
  await writeJson(path.join(generatedDir, 'checklists.json'), checklists);
  await writeJson(path.join(generatedDir, 'training-paths.json'), trainingPaths);
  await writeJson(path.join(generatedDir, 'protection-measures.json'), protectionMeasures);
  await writeJson(path.join(generatedDir, 'glossary.json'), glossary);
  await writeJson(path.join(publicGeneratedDir, 'action-cards.json'), actionCards);
  await writeJson(path.join(publicGeneratedDir, 'checklists.json'), checklists);
  await writeJson(path.join(publicGeneratedDir, 'training-paths.json'), trainingPaths);
  await writeJson(path.join(publicGeneratedDir, 'protection-measures.json'), protectionMeasures);
  await writeJson(path.join(publicGeneratedDir, 'glossary.json'), glossary);

  const previous = await readManifest(generatedDir);
  const now = new Date().toISOString();
  const manifest: ContentManifest = {
    ...previous,
    contentVersion: now,
    generatedAt: now,
    actionCardCount: actionCards.length,
    checklistCount: checklists.length,
    trainingPathCount: trainingPaths.length,
    protectionMeasureCount: protectionMeasures.length,
    glossaryCount: glossary.length,
  };
  await writeJson(path.join(generatedDir, 'manifest.json'), manifest);
  await writeJson(path.join(publicGeneratedDir, 'manifest.json'), manifest);
  return { actionCards, checklists, trainingPaths, protectionMeasures, glossary, manifest };
}

async function main() {
  await compileCuratedContent();
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
