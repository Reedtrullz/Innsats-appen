import type { MissionContext } from '@/lib/mission/schemas';

export type MissionUpdate = (mission: MissionContext) => MissionContext;
