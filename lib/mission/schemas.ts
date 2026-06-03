import { z } from 'zod';
import { PhaseSchema, RoleSchema, ScenarioSchema } from '@/lib/content/schemas';

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const ExternalContextSignalSchema = z
  .object({
    source: z.enum(['kartverket', 'met', 'nve']),
    kind: z.string().min(1),
    severity: z.enum(['info', 'yellow', 'orange', 'red', 'unknown']),
    title: z.string().min(1),
    summary: z.string().min(1),
    validFrom: z.string().nullable(),
    validTo: z.string().nullable(),
    fetchedAt: z.string().datetime(),
    staleness: z.enum(['fresh', 'stale', 'unavailable']),
    upstreamId: z.string().optional(),
    upstreamVersion: z.string().optional(),
    etag: z.string().optional(),
    upstreamHash: z.string().optional(),
    geometry: z.unknown().optional(),
    rawRef: z.string().regex(/^[a-z]+:[a-z0-9-]+$/, 'rawRef must be a sanitized source reference'),
  })
  .strict();

export const MissionTaskStatusSchema = z.enum(['not-started', 'in-progress', 'done', 'blocked', 'needs-assistance']);
export const EquipmentStatusSchema = z.enum(['ready', 'missing', 'damaged', 'consumed', 'needs-wash', 'needs-service', 'quarantined']);

export const MissionTaskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    status: MissionTaskStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    notes: z.string().optional(),
  })
  .strict();

export const QuickStatusMessageSchema = z.enum(['på posisjon', 'oppgave fullført', 'trenger assistanse']);

export const MissionStatusLogItemSchema = z
  .object({
    id: z.string().min(1),
    message: QuickStatusMessageSchema,
    createdAt: z.string().datetime(),
    note: z.string().optional(),
  })
  .strict();

export const ResourceRequestKindSchema = z.enum(['water', 'food', 'ppe', 'medical-support', 'transport', 'fuel', 'equipment']);

export const FieldLogCategorySchema = z.enum([
  'funn',
  'skadet-person',
  'ressursbehov',
  'hms-avvik',
  'observasjon',
  'samband',
  'materiell',
  'vaer-fare',
  'beslutning',
]);

export const FieldLogEntrySchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().datetime(),
    locationText: z.string().optional(),
    category: FieldLogCategorySchema,
    text: z.string().min(1),
    linkedMissionId: z.string().optional(),
    criticalObservation: z.boolean().default(false),
    mustBeForwarded: z.boolean().default(false),
  })
  .strict();

export const MissionResourceRequestSchema = z
  .object({
    id: z.string().min(1),
    kind: ResourceRequestKindSchema,
    status: MissionTaskStatusSchema,
    createdAt: z.string().datetime(),
    quantity: z.string().optional(),
    note: z.string().optional(),
  })
  .strict();

export const MissionLessonsLearnedSchema = z
  .object({
    summary: z.string().default(''),
    whatWorked: z.string().default(''),
    improvements: z.string().default(''),
    followUp: z.string().default(''),
  })
  .strict();

export const MissionFeedbackSchema = z
  .object({
    leadership: z.string().default(''),
    equipment: z.string().default(''),
    procedures: z.string().default(''),
    training: z.string().default(''),
    safety: z.string().default(''),
    communications: z.string().default(''),
  })
  .strict();

export const MissionContextSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    phase: PhaseSchema,
    role: RoleSchema,
    scenario: ScenarioSchema,
    locationText: z.string().min(1),
    coordinates: CoordinatesSchema.optional(),
    municipality: z.string().optional(),
    externalSignals: z.array(ExternalContextSignalSchema).default([]),
    activeChecklistIds: z.array(z.string()).default([]),
    notes: z.string().default(''),
    tasks: z.array(MissionTaskSchema).default([]),
    statusLog: z.array(MissionStatusLogItemSchema).default([]),
    resourceRequests: z.array(MissionResourceRequestSchema).default([]),
    fieldLogEntries: z.array(FieldLogEntrySchema).default([]),
    lessonsLearned: MissionLessonsLearnedSchema.optional(),
    feedback: MissionFeedbackSchema.optional(),
    completedAt: z.string().datetime().optional(),
    archivedAt: z.string().datetime().optional(),
    contentVersion: z.string().min(1),
    schemaVersion: z.number().int().positive().default(1),
  })
  .strict();

export const ChecklistRunSchema = z
  .object({
    id: z.string().min(1),
    missionId: z.string().min(1),
    templateSlug: z.string().min(1),
    checkedItemIds: z.array(z.string()).default([]),
    notesByItemId: z.record(z.string(), z.string()).default({}),
    equipmentStatusByItemId: z.record(z.string(), EquipmentStatusSchema).default({}),
    updatedAt: z.string().datetime(),
    schemaVersion: z.number().int().positive().default(1),
  })
  .strict();

export type MissionContext = z.infer<typeof MissionContextSchema>;
export type ChecklistRun = z.infer<typeof ChecklistRunSchema>;
export type ChecklistRunInput = z.input<typeof ChecklistRunSchema>;
export type EquipmentStatus = z.infer<typeof EquipmentStatusSchema>;
export type ExternalContextSignal = z.infer<typeof ExternalContextSignalSchema>;
export type MissionTaskStatus = z.infer<typeof MissionTaskStatusSchema>;
export type MissionTask = z.infer<typeof MissionTaskSchema>;
export type QuickStatusMessage = z.infer<typeof QuickStatusMessageSchema>;
export type MissionStatusLogItem = z.infer<typeof MissionStatusLogItemSchema>;
export type ResourceRequestKind = z.infer<typeof ResourceRequestKindSchema>;
export type MissionResourceRequest = z.infer<typeof MissionResourceRequestSchema>;
export type FieldLogCategory = z.infer<typeof FieldLogCategorySchema>;
export type FieldLogEntry = z.infer<typeof FieldLogEntrySchema>;
export type MissionLessonsLearned = z.infer<typeof MissionLessonsLearnedSchema>;
export type MissionFeedback = z.infer<typeof MissionFeedbackSchema>;
