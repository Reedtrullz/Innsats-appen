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
