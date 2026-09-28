import actionCards from '@/content/generated/action-cards.json';
import changelog from '@/content/generated/changelog.json';
import checklists from '@/content/generated/checklists.json';
import equipmentTaxonomy from '@/content/generated/equipment-taxonomy.json';
import exportTemplates from '@/content/generated/export-templates.json';
import faq from '@/content/generated/faq.json';
import glossary from '@/content/generated/glossary.json';
import imageMetadata from '@/content/generated/image-metadata.json';
import localOverlays from '@/content/generated/local-overlays.json';
import manifest from '@/content/generated/manifest.json';
import mustRead from '@/content/generated/must-read.json';
import protectionMeasures from '@/content/generated/protection-measures.json';
import referenceVideos from '@/content/generated/reference-videos.json';
import searchIndex from '@/content/generated/search-index.json';
import searchSynonyms from '@/content/generated/search-synonyms.json';
import sourceDocuments from '@/content/generated/source-documents.json';
import studyGuides from '@/content/generated/study-guides.json';
import trainingPaths from '@/content/generated/training-paths.json';
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
  ReferenceVideoSchema,
  SearchSynonymGroupSchema,
  SourceDocumentSchema,
  TrainingPathSchema,
  StudyGuideSchema,
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
  type ReferenceVideo,
  type SearchSynonymGroup,
  type SourceDocument,
  type TrainingPath,
  type StudyGuide,
} from './schemas';

const generated: Record<string, unknown> = {
  'action-cards.json': actionCards,
  'changelog.json': changelog,
  'checklists.json': checklists,
  'equipment-taxonomy.json': equipmentTaxonomy,
  'export-templates.json': exportTemplates,
  'faq.json': faq,
  'glossary.json': glossary,
  'image-metadata.json': imageMetadata,
  'local-overlays.json': localOverlays,
  'must-read.json': mustRead,
  'protection-measures.json': protectionMeasures,
  'reference-videos.json': referenceVideos,
  'search-synonyms.json': searchSynonyms,
  'source-documents.json': sourceDocuments,
  'study-guides.json': studyGuides,
  'training-paths.json': trainingPaths,
};

function loadArray<T>(fileName: string, label: string, parse: (value: unknown) => T): T[] {
  const values = generated[fileName];
  if (!Array.isArray(values) || values.length === 0) throw new Error(`Generated ${label} is empty or not an array`);
  return values.map((value, index) => {
    try {
      return parse(value);
    } catch (error) {
      throw new Error(`${label}[${index}] invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
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

export function getStudyGuides(): StudyGuide[] {
  return loadArray('study-guides.json', 'study guides', (value) => StudyGuideSchema.parse(value));
}

export function getProtectionMeasures(): ProtectionMeasure[] {
  return loadArray('protection-measures.json', 'protection measures', (value) => ProtectionMeasureSchema.parse(value));
}

export function getGlossaryTerms(): GlossaryTerm[] {
  return loadArray('glossary.json', 'glossary', (value) => GlossaryTermSchema.parse(value));
}

export function getFAQEntries(): FAQEntry[] {
  return loadArray('faq.json', 'FAQ', (value) => FAQEntrySchema.parse(value)).filter((entry) => entry.status === 'approved');
}

export function getEquipmentTaxonomy(): EquipmentTaxonomyRecord[] {
  return loadArray('equipment-taxonomy.json', 'equipment taxonomy', (value) => EquipmentTaxonomyRecordSchema.parse(value));
}

export function getExportTemplates(): ExportTemplateMetadata[] {
  return loadArray('export-templates.json', 'export templates', (value) => ExportTemplateMetadataSchema.parse(value));
}

export function getImageMetadata(): ImageMetadata[] {
  return loadArray('image-metadata.json', 'image metadata', (value) => ImageMetadataSchema.parse(value));
}

export function getReferenceVideos(): ReferenceVideo[] {
  return loadArray('reference-videos.json', 'reference videos', (value) => ReferenceVideoSchema.parse(value));
}

export function getLocalOverlays(): LocalOverlayDeclaration[] {
  return loadArray('local-overlays.json', 'local overlays', (value) => LocalOverlayDeclarationSchema.parse(value));
}

export function getContentChangelog(): ContentChangelogEntry[] {
  return loadArray('changelog.json', 'content changelog', (value) => ContentChangelogEntrySchema.parse(value)).sort((a, b) => b.date.localeCompare(a.date));
}

export function getMustReadNotices(): MustReadNotice[] {
  return loadArray('must-read.json', 'must-read notices', (value) => MustReadNoticeSchema.parse(value)).sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}

export function getContentManifest(): ContentManifest {
  return ContentManifestSchema.parse(manifest);
}

export function getSearchIndexGeneratedAt(): string | undefined {
  return typeof searchIndex.generatedAt === 'string' ? searchIndex.generatedAt : undefined;
}

export function getSearchSynonyms(): SearchSynonymGroup[] {
  return loadArray('search-synonyms.json', 'search synonyms', (value) => SearchSynonymGroupSchema.parse(value));
}
