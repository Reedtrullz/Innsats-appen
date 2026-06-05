import { MissionContextSchema, type MissionContext } from '@/lib/mission/schemas';

export type MissionFixtureOverrides = Partial<MissionContext> & Pick<MissionContext, 'id' | 'title'>;

export function buildMission(overrides: MissionFixtureOverrides): MissionContext {
  return MissionContextSchema.parse({
    createdAt: '2026-06-04T08:00:00.000Z',
    updatedAt: '2026-06-04T08:00:00.000Z',
    phase: 'under',
    role: 'lagforer',
    scenario: 'generelt',
    locationText: 'Lokalt område',
    externalSignals: [],
    externalSignalHistory: [],
    activeChecklistIds: [],
    notes: '',
    tasks: [],
    statusLog: [],
    resourceRequests: [],
    fieldLogEntries: [],
    ruhReports: [],
    welfareChecks: [],
    contentVersion: 'test-v1',
    schemaVersion: 1,
    ...overrides,
  });
}
