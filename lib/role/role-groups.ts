import type { Role } from '@/lib/content/taxonomy';
import type { LocalProfileRole } from '@/lib/privacy/local-profile';

export type RoleGroup = 'leder' | 'lagforer' | 'mannskap' | 'ikke-valgt';

export const ROLE_GROUP_MAP: Record<string, RoleGroup> = {
  leder: 'leder',
  beredskapsvakt: 'leder',
  'stab-logistikk': 'leder',
  liaison: 'leder',
  lagforer: 'lagforer',
  mre: 'lagforer',
  rad: 'lagforer',
  mfe: 'lagforer',
  materiellansvarlig: 'lagforer',
  'atv-bat': 'lagforer',
  mannskap: 'mannskap',
};

export const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  leder: 'Leder',
  lagforer: 'Lagfører',
  mannskap: 'Mannskap',
  'ikke-valgt': 'Ingen rolle valgt',
};

export const ROLE_GROUP_CANONICAL_ROLE: Record<RoleGroup, Role | null> = {
  leder: 'leder',
  lagforer: 'lagforer',
  mannskap: 'mannskap',
  'ikke-valgt': null,
};

export function roleGroup(role: LocalProfileRole): RoleGroup {
  if (role === 'ikke-valgt') return 'ikke-valgt';
  return ROLE_GROUP_MAP[role] ?? 'ikke-valgt';
}

/**
 * Depth ordering for the runbook role lens (rollelinse). A higher rank sees its
 * own steps plus everything below; planning/decision steps tagged for a higher
 * group appear locked — never hidden — to lower groups, so crew always know the
 * step exists. `ikke-valgt` ranks 0: with no role chosen, nothing is locked.
 */
export const ROLE_GROUP_RANK: Record<RoleGroup, number> = {
  'ikke-valgt': 0,
  mannskap: 1,
  lagforer: 2,
  leder: 3,
};

/** Minimum role group a step can require (mannskap steps are never gated). */
export type MinRoleGroup = Extract<RoleGroup, 'lagforer' | 'leder'>;

/**
 * Does the active role group reach the step's minimum? With no role chosen
 * (`ikke-valgt`) every step is shown unlocked — the lens only narrows once a
 * role is selected.
 */
export function roleGroupMeetsMinimum(active: RoleGroup, min: MinRoleGroup): boolean {
  if (active === 'ikke-valgt') return true;
  return ROLE_GROUP_RANK[active] >= ROLE_GROUP_RANK[min];
}
