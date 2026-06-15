import { z } from 'zod';
import { competenceCodes, equipmentTerms, phases, roles, scenarios } from './taxonomy';

export const PhaseSchema = z.enum(phases);
export const RoleSchema = z.enum(roles);
export const ScenarioSchema = z.enum(scenarios);
export const CompetenceCodeSchema = z.enum(competenceCodes);
export const EquipmentTermSchema = z.enum(equipmentTerms);
export const SourceStatusSchema = z.enum(['verified', 'unverified', 'historical', 'draft', 'expired']);
export const SourceReviewRiskSchema = z.enum(['low', 'medium', 'high']);
export const SourcePilotReviewStatusSchema = z.enum(['not-reviewed', 'approved-for-pilot', 'rejected-for-pilot']);
export const SourcePublicationApprovalSchema = z.enum(['approved-public', 'internal-only', 'needs-permission']);
export const PublicationStatusSchema = z.enum(['approved', 'draft', 'retired']);

const sourcePathPattern = /^(?:source-extracts|curated-notes)\/[A-Za-z0-9ÆØÅæøå._() -]+\.md$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const DateOnlySchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z
    .string()
    .regex(datePattern, 'date must use YYYY-MM-DD')
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
    }, 'date must be a real calendar date'),
);

export const SourceDocumentSchema = z
  .object({
    id: z.string().min(1).regex(slugPattern, 'source id must be lowercase kebab-case'),
    title: z.string().min(1),
    sourcePath: z.string().min(1).regex(sourcePathPattern, 'sourcePath must be a canonical public reference such as source-extracts/<file>.md'),
    sourceType: z.enum(['source-extract', 'curated-note']),
    status: SourceStatusSchema,
    verifiedAt: DateOnlySchema,
    reviewAfter: DateOnlySchema.optional(),
    expiresAt: DateOnlySchema.optional(),
    owner: z.string().min(1),
    reviewer: z.string().min(1),
    reviewRisk: SourceReviewRiskSchema.default('medium'),
    reviewNotes: z.string().optional(),
    pilotReviewStatus: SourcePilotReviewStatusSchema.default('not-reviewed'),
    publicationStatus: SourcePublicationApprovalSchema.default('needs-permission'),
    body: z.string().min(1),
    warnings: z.array(z.string()).default([]),
  })
  .superRefine((value, ctx) => {
    const requiresSchedule = value.reviewRisk === 'high' || ['unverified', 'historical', 'draft', 'expired'].includes(value.status);
    if (requiresSchedule && !value.reviewAfter && !value.expiresAt) {
      ctx.addIssue({ code: 'custom', message: 'High-risk or non-current sources require reviewAfter or expiresAt', path: ['reviewAfter'] });
    }
  });

export const ActionCardAuthoritySchema = z.enum(['leder', 'lagforer', 'mannskap', 'beredskapsvakt']);

// Fagperson sign-off as data, not a checkbox in a plan doc. `unreviewed` is the
// historical baseline (short, generic cards). `pending-fagperson` marks content
// that has been expanded source-faithfully but still needs a subject-matter
// expert before it can be trusted as field-grade. `reviewed` requires a named
// reviewer. The coverage report and /release board gate on this; the card UI
// shows a visible banner for anything not yet `reviewed`.
export const ActionCardReviewStatusSchema = z.enum(['unreviewed', 'pending-fagperson', 'reviewed']);

// Steps are a backward-compatible union (P2-2): a plain string (the legacy
// form, still valid) or an object that carries the always-visible `action`
// plus optional «hvordan/hvor» detail (`how`) and linked illustration ids
// (`imageIds`). Consumers normalize via `normalizeStep`/`stepText` so they only
// ever deal with the object shape. `how` content is fagperson-authored.
export const ActionCardStepSchema = z.union([
  z.string().min(1),
  z.object({
    action: z.string().min(1),
    how: z.string().min(1).optional(),
    imageIds: z.array(z.string().min(1)).default([]),
    sourceIds: z.array(z.string().min(1)).default([]),
  }),
]);
export type ActionCardStep = z.input<typeof ActionCardStepSchema>;
export type NormalizedActionCardStep = { action: string; how?: string; imageIds: string[]; sourceIds: string[] };

export const ActionCardSchema = z.object({
  slug: z.string().min(1).regex(slugPattern, 'action card slug must be lowercase kebab-case'),
  title: z.string().min(1),
  phase: PhaseSchema,
  roles: z.array(RoleSchema).min(1),
  scenarios: z.array(ScenarioSchema).min(1),
  priority: z.enum(['high', 'medium', 'low']),
  steps: z.array(ActionCardStepSchema).min(1),
  safety: z.array(z.string()).default([]),
  reporting: z.array(z.string()).default([]),
  sourceIds: z.array(z.string().min(1)).min(1),
  competenceRequired: z.array(CompetenceCodeSchema).default([]),
  competenceRationale: z.string().optional(),
  equipmentRequired: z.array(EquipmentTermSchema).default([]),
  warning: z.string().optional(),
  authority: ActionCardAuthoritySchema.optional(),
  doNot: z.array(z.string().min(1)).default([]),
  reviewStatus: ActionCardReviewStatusSchema.default('unreviewed'),
  reviewedBy: z.string().min(1).optional(),
  reviewedAt: z.string().min(1).optional(),
});

export const ChecklistItemSchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'checklist item id must be lowercase kebab-case'),
  label: z.string().min(1),
  required: z.boolean().default(false),
  sourceIds: z.array(z.string().min(1)).default([]),
});

export const OperationalChecklistSchema = z.object({
  slug: z.string().min(1).regex(slugPattern, 'checklist slug must be lowercase kebab-case'),
  title: z.string().min(1),
  phase: PhaseSchema,
  roles: z.array(RoleSchema).min(1),
  scenarios: z.array(ScenarioSchema).min(1),
  items: z.array(ChecklistItemSchema).min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  equipmentRequired: z.array(EquipmentTermSchema).default([]),
  warning: z.string().optional(),
});

export const TrainingPathSchema = z.object({
  slug: z.string().min(1).regex(slugPattern, 'training path slug must be lowercase kebab-case'),
  courseCode: CompetenceCodeSchema,
  title: z.string().min(1),
  targetRoles: z.array(RoleSchema).min(1),
  duration: z.string().min(1),
  prerequisites: z.array(CompetenceCodeSchema).default([]),
  skills: z.array(z.string().min(1)).min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  linkedCardSlugs: z.array(z.string().min(1)).default([]),
});

export const ProtectionMeasureSchema = z
  .object({
    slug: z.string().min(1).regex(slugPattern, 'protection measure slug must be lowercase kebab-case'),
    title: z.string().min(1),
    kind: z.enum(['tilfluktsrom', 'evakuering', 'egenberedskap', 'annen']),
    publicOrRestricted: z.enum(['public', 'restricted']),
    responsibleAuthority: z.string().min(1),
    readinessChecks: z.array(z.string()).default([]),
    operationalSteps: z.array(z.string()).default([]),
    dataWarnings: z.array(z.string()).default([]),
    sourceIds: z.array(z.string().min(1)).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.publicOrRestricted === 'restricted' && value.dataWarnings.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Restricted protection measures require data warnings', path: ['dataWarnings'] });
    }
  });

export const GlossaryTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  synonyms: z.array(z.string()).default([]),
  sourceIds: z.array(z.string().min(1)).min(1),
});

export const FAQEntrySchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'FAQ id must be lowercase kebab-case'),
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  roles: z.array(RoleSchema).default([]),
  scenarios: z.array(ScenarioSchema).default([]),
  competenceCodes: z.array(CompetenceCodeSchema).default([]),
  equipmentTerms: z.array(EquipmentTermSchema).default([]),
  sourceIds: z.array(z.string().min(1)).min(1),
  updatedAt: DateOnlySchema,
  status: PublicationStatusSchema.default('approved'),
  mustRead: z.boolean().default(false),
});

export const EquipmentTaxonomyRecordSchema = z.object({
  id: EquipmentTermSchema,
  label: z.string().min(1),
  category: z.enum(['personlig', 'samband', 'radiac', 'cbrn', 'tilfluktsrom', 'logistikk', 'annet']),
  aliases: z.array(z.string()).default([]),
  approvedForPublicUse: z.boolean().default(true),
  sourceIds: z.array(z.string().min(1)).default([]),
});

export const ExportTemplateMetadataSchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'export template id must be lowercase kebab-case'),
  title: z.string().min(1),
  description: z.string().min(1),
  format: z.enum(['markdown', 'json', 'pdf']),
  audienceRoles: z.array(RoleSchema).default([]),
  sourceIds: z.array(z.string().min(1)).default([]),
  updatedAt: DateOnlySchema,
});

const publicAssetPathPattern = /^\/content-assets\/[A-Za-z0-9._-]+\.(?:png|jpg|jpeg|svg|webp)$/;

export const ImageMetadataSchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'image id must be lowercase kebab-case'),
  publicPath: z.string().min(1).regex(publicAssetPathPattern, 'publicPath must point to /content-assets/<approved file>'),
  alt: z.string().min(1),
  caption: z.string().optional(),
  sourceIds: z.array(z.string().min(1)).min(1),
  approvedForPublication: z.boolean(),
  usedByCardSlugs: z.array(z.string().min(1)).default([]),
  updatedAt: DateOnlySchema,
});

export const ReferenceVideoSchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'reference video id must be lowercase kebab-case'),
  title: z.string().min(1),
  publisher: z.string().min(1),
  channelUrl: z.string().url(),
  vimeoId: z.string().regex(/^\d+$/).nullish(),
  topic: z.string().min(1),
  relatedCardSlugs: z.array(z.string()).default([]),
  permissionStatus: z.enum(['needs-permission', 'approved', 'denied']).default('needs-permission'),
  note: z.string().optional(),
});

export const LocalOverlayDeclarationSchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'overlay id must be lowercase kebab-case'),
  districtName: z.string().min(1),
  status: z.enum(['planned', 'approved', 'disabled']).default('planned'),
  scopeNote: z.string().min(1),
  appliesToScenarios: z.array(ScenarioSchema).default([]),
  sourceIds: z.array(z.string().min(1)).default([]),
});

export const ContentRefSchema = z.object({
  kind: z.enum(['action-card', 'checklist', 'source', 'faq', 'training-path', 'protection-measure']),
  id: z.string().min(1),
});

export const ContentChangelogEntrySchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'changelog id must be lowercase kebab-case'),
  date: DateOnlySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  changeType: z.enum(['added', 'updated', 'critical', 'deprecated']),
  contentRefs: z.array(ContentRefSchema).min(1),
  sourceIds: z.array(z.string().min(1)).default([]),
  mustRead: z.boolean().default(false),
});

export const SearchSynonymGroupSchema = z.object({
  canonical: z.string().min(1),
  aliases: z.array(z.string().min(1)).min(1),
  cardIds: z.array(z.string().min(1)).default([]),
});

export const MustReadNoticeSchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'must-read id must be lowercase kebab-case'),
  title: z.string().min(1),
  body: z.string().min(1),
  severity: z.enum(['info', 'warning', 'critical']),
  changedAt: DateOnlySchema,
  sourceIds: z.array(z.string().min(1)).default([]),
  linkedCardSlugs: z.array(z.string().min(1)).default([]),
  changelogEntryId: z.string().min(1).optional(),
});

export const ContentManifestSchema = z.object({
  contentVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceSnapshotGeneratedAt: z.string().min(1).optional(),
  sourceSnapshotHash: z.string().min(1).optional(),
  usedPregeneratedFallback: z.boolean(),
  sourceCount: z.number().int().nonnegative().default(0),
  actionCardCount: z.number().int().nonnegative().default(0),
  checklistCount: z.number().int().nonnegative().default(0),
  trainingPathCount: z.number().int().nonnegative().default(0),
  protectionMeasureCount: z.number().int().nonnegative().default(0),
  glossaryCount: z.number().int().nonnegative().default(0),
  faqCount: z.number().int().nonnegative().default(0),
  equipmentTaxonomyCount: z.number().int().nonnegative().default(0),
  exportTemplateCount: z.number().int().nonnegative().default(0),
  imageMetadataCount: z.number().int().nonnegative().default(0),
  localOverlayCount: z.number().int().nonnegative().default(0),
  changelogCount: z.number().int().nonnegative().default(0),
  mustReadCount: z.number().int().nonnegative().default(0),
  workplanCount: z.number().int().nonnegative().default(0),
  searchSynonymCount: z.number().int().nonnegative().default(0),
  copiedAssetCount: z.number().int().nonnegative().default(0),
});

type SourceDocumentOutput = z.infer<typeof SourceDocumentSchema>;
export type SourceDocument = Omit<SourceDocumentOutput, 'pilotReviewStatus' | 'publicationStatus'> &
  Partial<Pick<SourceDocumentOutput, 'pilotReviewStatus' | 'publicationStatus'>>;
export type ActionCard = z.input<typeof ActionCardSchema>;
export type OperationalChecklist = z.input<typeof OperationalChecklistSchema>;
export type ChecklistItem = z.input<typeof ChecklistItemSchema>;
export type TrainingPath = z.infer<typeof TrainingPathSchema>;
export type ProtectionMeasure = z.infer<typeof ProtectionMeasureSchema>;
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;
export type FAQEntry = z.infer<typeof FAQEntrySchema>;
export type EquipmentTaxonomyRecord = z.infer<typeof EquipmentTaxonomyRecordSchema>;
export type ExportTemplateMetadata = z.infer<typeof ExportTemplateMetadataSchema>;
export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;
export type ReferenceVideo = z.infer<typeof ReferenceVideoSchema>;
export type LocalOverlayDeclaration = z.infer<typeof LocalOverlayDeclarationSchema>;
export type ContentChangelogEntry = z.infer<typeof ContentChangelogEntrySchema>;
export type SearchSynonymGroup = z.infer<typeof SearchSynonymGroupSchema>;
export type MustReadNotice = z.infer<typeof MustReadNoticeSchema>;
export type ContentManifest = z.infer<typeof ContentManifestSchema>;
