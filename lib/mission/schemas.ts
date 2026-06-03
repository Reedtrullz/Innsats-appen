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
    updatedAt: z.string().datetime(),
    schemaVersion: z.number().int().positive().default(1),
  })
  .strict();

export type MissionContext = z.infer<typeof MissionContextSchema>;
export type ChecklistRun = z.infer<typeof ChecklistRunSchema>;
export type ExternalContextSignal = z.infer<typeof ExternalContextSignalSchema>;
