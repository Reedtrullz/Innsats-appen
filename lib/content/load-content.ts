import fs from 'node:fs';
import path from 'node:path';
import {
  ActionCardSchema,
  ContentManifestSchema,
  GlossaryTermSchema,
  OperationalChecklistSchema,
  ProtectionMeasureSchema,
  SourceDocumentSchema,
  TrainingPathSchema,
  type ActionCard,
  type ContentManifest,
  type GlossaryTerm,
  type OperationalChecklist,
  type ProtectionMeasure,
  type SourceDocument,
  type TrainingPath,
} from './schemas';

const generatedRoot = path.join(process.cwd(), 'content/generated');

export function loadJsonArray(filePath: string, label: string): unknown[] {
  if (!fs.existsSync(filePath)) throw new Error(`Missing generated ${label}: ${filePath}`);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`Generated ${label} is empty or not an array`);
  return parsed;
}

function loadArray<T>(fileName: string, label: string, parse: (value: unknown) => T): T[] {
  return loadJsonArray(path.join(generatedRoot, fileName), label).map((value, index) => {
    try {
      return parse(value);
    } catch (error) {
      throw new Error(`${label}[${index}] invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

export function parseActionCards(filePath: string): ActionCard[] {
  return loadJsonArray(filePath, 'action cards').map((value) => ActionCardSchema.parse(value));
}

export function getActionCards(): ActionCard[] {
  return loadArray('action-cards.json', 'action cards', (value) => ActionCardSchema.parse(value));
}

export function getSourceDocuments(): SourceDocument[] {
  return loadArray('source-documents.json', 'source documents', (value) => SourceDocumentSchema.parse(value));
}

export function getChecklists(): OperationalChecklist[] {
  return loadArray('checklists.json', 'checklists', (value) => OperationalChecklistSchema.parse(value));
}

export function getTrainingPaths(): TrainingPath[] {
  return loadArray('training-paths.json', 'training paths', (value) => TrainingPathSchema.parse(value));
}

export function getProtectionMeasures(): ProtectionMeasure[] {
  return loadArray('protection-measures.json', 'protection measures', (value) => ProtectionMeasureSchema.parse(value));
}

export function getGlossaryTerms(): GlossaryTerm[] {
  return loadArray('glossary.json', 'glossary', (value) => GlossaryTermSchema.parse(value));
}

export function getContentManifest(): ContentManifest {
  const filePath = path.join(generatedRoot, 'manifest.json');
  if (!fs.existsSync(filePath)) throw new Error(`Missing generated manifest: ${filePath}`);
  return ContentManifestSchema.parse(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}
