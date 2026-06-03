import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const publicSourcePathPattern = /^(?:\.hermes\/plans|content\/workplans)\/[A-Za-z0-9ÆØÅæøå._() -]+\.(?:md|json)$/;

export const WorkplanStageSchema = z.enum(['idea', 'scope', 'build', 'verify', 'release']);
export const WorkplanStatusSchema = z.enum(['planned', 'active', 'blocked', 'completed']);
export const WorkplanRiskSchema = z.enum(['low', 'medium', 'high']);
export const WorkplanSourceTypeSchema = z.enum(['hermes-plan', 'manual-snapshot']);

const EvidenceSchema = z.array(z.string().min(1)).optional();
const isoTimestampSchema = z.string().datetime({ offset: true }).optional();
const ownerSchema = z.string().min(1).max(48).optional();

export const WorkplanTaskSchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'workplan task id must be lowercase kebab-case'),
  title: z.string().min(1),
  status: WorkplanStatusSchema.default('planned'),
  stage: WorkplanStageSchema.default('build'),
  risk: WorkplanRiskSchema.default('medium'),
  owner: ownerSchema,
  completedAt: isoTimestampSchema,
  evidence: EvidenceSchema,
  sourceHeading: z.string().optional(),
});

export const WorkplanSchema = z.object({
  id: z.string().min(1).regex(slugPattern, 'workplan id must be lowercase kebab-case'),
  title: z.string().min(1),
  sourcePath: z.string().min(1).regex(publicSourcePathPattern, 'workplan sourcePath must be a safe repository-relative reference'),
  sourceType: WorkplanSourceTypeSchema,
  summary: z.string().min(1),
  stage: WorkplanStageSchema,
  risk: WorkplanRiskSchema,
  status: WorkplanStatusSchema,
  owner: ownerSchema,
  completedAt: isoTimestampSchema,
  evidence: EvidenceSchema,
  taskCount: z.number().int().nonnegative(),
  updatedAt: z.string().min(1),
  tasks: z.array(WorkplanTaskSchema),
}).superRefine((workplan, ctx) => {
  if (workplan.taskCount !== workplan.tasks.length) {
    ctx.addIssue({ code: 'custom', message: 'taskCount must match tasks.length', path: ['taskCount'] });
  }
  if (workplan.status === 'completed' && !workplan.completedAt) {
    ctx.addIssue({ code: 'custom', message: 'completed workplans must include completedAt', path: ['completedAt'] });
  }
});

export const WorkplansSnapshotSchema = z.object({
  generatedAt: z.string().min(1),
  sourceCount: z.number().int().nonnegative(),
  workplans: z.array(WorkplanSchema),
}).superRefine((snapshot, ctx) => {
  if (snapshot.sourceCount !== snapshot.workplans.length) {
    ctx.addIssue({ code: 'custom', message: 'sourceCount must match workplans.length', path: ['sourceCount'] });
  }
});

export type WorkplanStage = z.infer<typeof WorkplanStageSchema>;
export type WorkplanStatus = z.infer<typeof WorkplanStatusSchema>;
export type WorkplanRisk = z.infer<typeof WorkplanRiskSchema>;
export type WorkplanTask = z.infer<typeof WorkplanTaskSchema>;
export type Workplan = z.infer<typeof WorkplanSchema>;
export type WorkplansSnapshot = z.infer<typeof WorkplansSnapshotSchema>;
