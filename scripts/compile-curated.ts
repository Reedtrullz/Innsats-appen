import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';
import {
  ActionCardSchema,
  ContentChangelogEntrySchema,
  ContentManifestSchema,
  EquipmentTaxonomyRecordSchema,
  ExportTemplateMetadataSchema,
  FAQEntrySchema,
  GlossaryTermSchema,
  ImageMetadataSchema,
  LocalOverlayDeclarationSchema,
  MustReadNoticeSchema,
  OperationalChecklistSchema,
  ProtectionMeasureSchema,
  TrainingPathSchema,
  type ActionCard,
  type ContentChangelogEntry,
  type ContentManifest,
  type EquipmentTaxonomyRecord,
  type ExportTemplateMetadata,
  type FAQEntry,
  type GlossaryTerm,
  type ImageMetadata,
  type LocalOverlayDeclaration,
  type MustReadNotice,
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
  faq: FAQEntry[];
  equipmentTaxonomy: EquipmentTaxonomyRecord[];
  exportTemplates: ExportTemplateMetadata[];
  imageMetadata: ImageMetadata[];
  localOverlays: LocalOverlayDeclaration[];
  changelog: ContentChangelogEntry[];
  mustRead: MustReadNotice[];
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
      faqCount: 0,
      equipmentTaxonomyCount: 0,
      exportTemplateCount: 0,
      imageMetadataCount: 0,
      localOverlayCount: 0,
      changelogCount: 0,
      mustReadCount: 0,
      workplanCount: 0,
      copiedAssetCount: 0,
      usedPregeneratedFallback: false,
    };
  }
}

async function writeMirroredJson(generatedDir: string, publicGeneratedDir: string, fileName: string, value: unknown) {
  await writeJson(path.join(generatedDir, fileName), value);
  await writeJson(path.join(publicGeneratedDir, fileName), value);
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
  const faq = await readYamlArray(path.join(curatedDir, 'faq.yaml'), 'FAQ', (v) => FAQEntrySchema.parse(v));
  const publicFaq = faq.filter((entry) => entry.status === 'approved');
  const equipmentTaxonomy = await readYamlArray(path.join(curatedDir, 'equipment-taxonomy.yaml'), 'equipment taxonomy', (v) => EquipmentTaxonomyRecordSchema.parse(v));
  const exportTemplates = await readYamlArray(path.join(curatedDir, 'export-templates.yaml'), 'export templates', (v) => ExportTemplateMetadataSchema.parse(v));
  const imageMetadata = await readYamlArray(path.join(curatedDir, 'image-metadata.yaml'), 'image metadata', (v) => ImageMetadataSchema.parse(v));
  const localOverlays = await readYamlArray(path.join(curatedDir, 'local-overlays.yaml'), 'local overlays', (v) => LocalOverlayDeclarationSchema.parse(v));
  const changelog = await readYamlArray(path.join(curatedDir, 'changelog.yaml'), 'content changelog', (v) => ContentChangelogEntrySchema.parse(v));
  const mustRead = await readYamlArray(path.join(curatedDir, 'must-read.yaml'), 'must-read notices', (v) => MustReadNoticeSchema.parse(v));

  await writeMirroredJson(generatedDir, publicGeneratedDir, 'action-cards.json', actionCards);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'checklists.json', checklists);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'training-paths.json', trainingPaths);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'protection-measures.json', protectionMeasures);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'glossary.json', glossary);
  await writeJson(path.join(generatedDir, 'faq.json'), faq);
  await writeJson(path.join(publicGeneratedDir, 'faq.json'), publicFaq);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'equipment-taxonomy.json', equipmentTaxonomy);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'export-templates.json', exportTemplates);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'image-metadata.json', imageMetadata);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'local-overlays.json', localOverlays);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'changelog.json', changelog);
  await writeMirroredJson(generatedDir, publicGeneratedDir, 'must-read.json', mustRead);

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
    faqCount: publicFaq.length,
    equipmentTaxonomyCount: equipmentTaxonomy.length,
    exportTemplateCount: exportTemplates.length,
    imageMetadataCount: imageMetadata.length,
    localOverlayCount: localOverlays.length,
    changelogCount: changelog.length,
    mustReadCount: mustRead.length,
  };
  await writeJson(path.join(generatedDir, 'manifest.json'), manifest);
  await writeJson(path.join(publicGeneratedDir, 'manifest.json'), manifest);
  return { actionCards, checklists, trainingPaths, protectionMeasures, glossary, faq, equipmentTaxonomy, exportTemplates, imageMetadata, localOverlays, changelog, mustRead, manifest };
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
