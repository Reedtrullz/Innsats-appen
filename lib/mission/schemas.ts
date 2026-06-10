import { z } from 'zod';
import { PhaseSchema, RoleSchema, ScenarioSchema } from '@/lib/content/schemas';
import { detectSensitiveOperationalText } from '@/lib/privacy/sensitive-text';

function sensitiveText(context: string) {
  return z.string().superRefine((value, ctx) => {
    const match = detectSensitiveOperationalText(value);
    if (!match) return;
    ctx.addIssue({
      code: 'custom',
      message: `Local operational text rejected at ${context}: possible persondata/pasientdata/skjermet/private-location risk (${match.kind}).`,
    });
  });
}

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
    rawRef: z.string().regex(/^[a-z]+:[a-z0-9-]+$/, 'rawRef must be a sanitized source reference'),
  })
  .strict();

export const MissionTaskStatusSchema = z.enum(['not-started', 'in-progress', 'done', 'blocked', 'needs-assistance']);
export const EquipmentStatusSchema = z.enum(['ready', 'missing', 'damaged', 'consumed', 'needs-wash', 'needs-service', 'quarantined']);

export const MissionTaskSchema = z
  .object({
    id: z.string().min(1),
    title: sensitiveText('mission.tasks.title').min(1),
    status: MissionTaskStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    notes: sensitiveText('mission.tasks.notes').optional(),
  })
  .strict();

export const QuickStatusMessageSchema = z.enum(['på posisjon', 'oppgave fullført', 'trenger assistanse']);

export const MissionStatusLogItemSchema = z
  .object({
    id: z.string().min(1),
    message: QuickStatusMessageSchema,
    createdAt: z.string().datetime(),
    note: sensitiveText('mission.statusLog.note').optional(),
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

export const SchematicMapPointSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })
  .strict();

export const FieldLogMapReferenceSchema = z
  .object({
    source: z.enum(['map-marker', 'map-drawing', 'map-point']),
    objectId: z.string().min(1).max(120).optional(),
    label: sensitiveText('fieldLog.mapReference.label').min(1).max(120),
    point: SchematicMapPointSchema,
  })
  .strict();

export const FieldLogEntrySchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().datetime(),
    locationText: sensitiveText('fieldLog.locationText').optional(),
    category: FieldLogCategorySchema,
    text: sensitiveText('fieldLog.text').min(1),
    mapReference: FieldLogMapReferenceSchema.optional(),
    linkedMissionId: z.string().optional(),
    criticalObservation: z.boolean().default(false),
    mustBeForwarded: z.boolean().default(false),
  })
  .strict();

export const RuhCategorySchema = z.enum(['hms', 'materiell', 'samband', 'nestenulykke', 'annet']);
export const RuhRiskSchema = z.enum(['lav', 'middels', 'hoy']);

export const RuhReportSchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().datetime(),
    category: RuhCategorySchema,
    whatHappened: sensitiveText('ruh.whatHappened').min(1),
    immediateMeasure: sensitiveText('ruh.immediateMeasure').min(1),
    risk: RuhRiskSchema,
    followUpNeeded: z.boolean().default(false),
    linkedMissionId: z.string().optional(),
  })
  .strict();

export const WelfareLoadSchema = z.enum(['lav', 'moderat', 'hoy']);

export const WelfareReminderSchema = z
  .object({
    water: z.boolean().default(false),
    food: z.boolean().default(false),
    warmth: z.boolean().default(false),
    rest: z.boolean().default(false),
    dryClothing: z.boolean().default(false),
  })
  .strict();

export const WelfareCheckSchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.string().datetime(),
    physicalLoad: WelfareLoadSchema,
    mentalLoad: WelfareLoadSchema,
    needsRest: z.boolean().default(false),
    needsRelief: z.boolean().default(false),
    reminders: WelfareReminderSchema.default({ water: false, food: false, warmth: false, rest: false, dryClothing: false }),
    note: sensitiveText('welfare.note').optional(),
  })
  .strict();

export const MissionResourceRequestSchema = z
  .object({
    id: z.string().min(1),
    kind: ResourceRequestKindSchema,
    status: MissionTaskStatusSchema,
    createdAt: z.string().datetime(),
    quantity: sensitiveText('mission.resourceRequests.quantity').optional(),
    note: sensitiveText('mission.resourceRequests.note').optional(),
  })
  .strict();

export const MissionLessonsLearnedSchema = z
  .object({
    summary: sensitiveText('mission.lessonsLearned.summary').default(''),
    whatWorked: sensitiveText('mission.lessonsLearned.whatWorked').default(''),
    improvements: sensitiveText('mission.lessonsLearned.improvements').default(''),
    followUp: sensitiveText('mission.lessonsLearned.followUp').default(''),
  })
  .strict();

export const MissionFeedbackSchema = z
  .object({
    leadership: sensitiveText('mission.feedback.leadership').default(''),
    equipment: sensitiveText('mission.feedback.equipment').default(''),
    procedures: sensitiveText('mission.feedback.procedures').default(''),
    training: sensitiveText('mission.feedback.training').default(''),
    safety: sensitiveText('mission.feedback.safety').default(''),
    communications: sensitiveText('mission.feedback.communications').default(''),
  })
  .strict();

export const MissionContextSchema = z
  .object({
    id: z.string().min(1),
    title: sensitiveText('mission.title').min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    phase: PhaseSchema,
    role: RoleSchema,
    scenario: ScenarioSchema,
    locationText: sensitiveText('mission.locationText').default(''),
    coordinates: CoordinatesSchema.optional(),
    municipality: sensitiveText('mission.municipality').optional(),
    externalSignals: z.array(ExternalContextSignalSchema).default([]),
    externalSignalHistory: z.array(ExternalContextSignalSchema).default([]),
    activeChecklistIds: z.array(z.string()).default([]),
    notes: sensitiveText('mission.notes').default(''),
    tasks: z.array(MissionTaskSchema).default([]),
    statusLog: z.array(MissionStatusLogItemSchema).default([]),
    resourceRequests: z.array(MissionResourceRequestSchema).default([]),
    fieldLogEntries: z.array(FieldLogEntrySchema).default([]),
    ruhReports: z.array(RuhReportSchema).default([]),
    welfareChecks: z.array(WelfareCheckSchema).default([]),
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
    notesByItemId: z.record(z.string(), sensitiveText('checklistRun.notesByItemId')).default({}),
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
export type SchematicMapPoint = z.infer<typeof SchematicMapPointSchema>;
export type FieldLogMapReference = z.infer<typeof FieldLogMapReferenceSchema>;
export type FieldLogEntry = z.infer<typeof FieldLogEntrySchema>;
export type RuhCategory = z.infer<typeof RuhCategorySchema>;
export type RuhRisk = z.infer<typeof RuhRiskSchema>;
export type RuhReport = z.infer<typeof RuhReportSchema>;
export type WelfareLoad = z.infer<typeof WelfareLoadSchema>;
export type WelfareCheck = z.infer<typeof WelfareCheckSchema>;
export type MissionLessonsLearned = z.infer<typeof MissionLessonsLearnedSchema>;
export type MissionFeedback = z.infer<typeof MissionFeedbackSchema>;
