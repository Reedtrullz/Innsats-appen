import { z } from 'zod';
import { phases, roles, scenarios } from './taxonomy';

export const PhaseSchema = z.enum(phases);
export const RoleSchema = z.enum(roles);
export const ScenarioSchema = z.enum(scenarios);
export const SourceStatusSchema = z.enum(['verified', 'unverified', 'historical', 'draft', 'expired']);

export const SourceDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourcePath: z.string().min(1),
  sourceType: z.enum(['source-extract', 'curated-note']),
  status: SourceStatusSchema,
  body: z.string().min(1),
  warnings: z.array(z.string()).default([]),
});

export const ActionCardSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  phase: PhaseSchema,
  roles: z.array(RoleSchema).min(1),
  scenarios: z.array(ScenarioSchema).min(1),
  priority: z.enum(['high', 'medium', 'low']),
  steps: z.array(z.string().min(1)).min(1),
  safety: z.array(z.string()).default([]),
  reporting: z.array(z.string()).default([]),
  sourceIds: z.array(z.string().min(1)).min(1),
  competenceRequired: z.array(z.string()).default([]),
  warning: z.string().optional(),
});

export const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().default(false),
  sourceIds: z.array(z.string().min(1)).default([]),
});

export const OperationalChecklistSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  phase: PhaseSchema,
  roles: z.array(RoleSchema).min(1),
  scenarios: z.array(ScenarioSchema).min(1),
  items: z.array(ChecklistItemSchema).min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  warning: z.string().optional(),
});

export const TrainingPathSchema = z.object({
  slug: z.string().min(1),
  courseCode: z.string().min(1),
  title: z.string().min(1),
  targetRoles: z.array(RoleSchema).min(1),
  duration: z.string().min(1),
  prerequisites: z.array(z.string()).default([]),
  skills: z.array(z.string().min(1)).min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  linkedCardSlugs: z.array(z.string().min(1)).default([]),
});

export const ProtectionMeasureSchema = z
  .object({
    slug: z.string().min(1),
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
  synonyms: z.array(z.string()).default([]),
  sourceIds: z.array(z.string().min(1)).min(1),
});

export const ContentManifestSchema = z.object({
  contentVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceCount: z.number().int().nonnegative().default(0),
  actionCardCount: z.number().int().nonnegative().default(0),
  checklistCount: z.number().int().nonnegative().default(0),
  trainingPathCount: z.number().int().nonnegative().default(0),
  protectionMeasureCount: z.number().int().nonnegative().default(0),
  glossaryCount: z.number().int().nonnegative().default(0),
  copiedAssetCount: z.number().int().nonnegative().default(0),
});

export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type ActionCard = z.infer<typeof ActionCardSchema>;
export type OperationalChecklist = z.infer<typeof OperationalChecklistSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type TrainingPath = z.infer<typeof TrainingPathSchema>;
export type ProtectionMeasure = z.infer<typeof ProtectionMeasureSchema>;
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;
export type ContentManifest = z.infer<typeof ContentManifestSchema>;
