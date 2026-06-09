import { expect, it } from 'vitest';
import { roleGroup, ROLE_GROUP_MAP, ROLE_GROUP_CANONICAL_ROLE, ROLE_GROUP_LABELS, type RoleGroup } from '@/lib/role/role-groups';
import { roles, type Role } from '@/lib/content/taxonomy';

it('maps every taxonomy role to exactly one group', () => {
  for (const role of roles) {
    const group = roleGroup(role);
    expect(group).not.toBe('ikke-valgt');
    expect(ROLE_GROUP_LABELS[group]).toBeTruthy();
  }
});

it('maps canonical group roles correctly', () => {
  expect(roleGroup('leder')).toBe('leder');
  expect(roleGroup('lagforer')).toBe('lagforer');
  expect(roleGroup('mannskap')).toBe('mannskap');
});

it('maps beredskapsvakt to leder group', () => {
  expect(roleGroup('beredskapsvakt')).toBe('leder');
});

it('maps stab-logistikk and liaison to leder group', () => {
  expect(roleGroup('stab-logistikk')).toBe('leder');
  expect(roleGroup('liaison')).toBe('leder');
});

it('maps specialist roles (mre, rad, mfe, materiellansvarlig, atv-bat) to lagforer group', () => {
  for (const role of ['mre', 'rad', 'mfe', 'materiellansvarlig', 'atv-bat'] as Role[]) {
    expect(roleGroup(role)).toBe('lagforer');
  }
});

it('returns ikke-valgt for raw string ikke-valgt', () => {
  expect(roleGroup('ikke-valgt')).toBe('ikke-valgt');
});

it('returns ikke-valgt for unknown strings', () => {
  expect(roleGroup('unknown-role' as 'ikke-valgt')).toBe('ikke-valgt');
});

it('ROLE_GROUP_CANONICAL_ROLE picks correct canonical roles', () => {
  expect(ROLE_GROUP_CANONICAL_ROLE.leder).toBe('leder');
  expect(ROLE_GROUP_CANONICAL_ROLE.lagforer).toBe('lagforer');
  expect(ROLE_GROUP_CANONICAL_ROLE.mannskap).toBe('mannskap');
  expect(ROLE_GROUP_CANONICAL_ROLE['ikke-valgt']).toBeNull();
});

it('every role in ROLE_GROUP_MAP belongs to a valid group', () => {
  const validGroups: RoleGroup[] = ['leder', 'lagforer', 'mannskap'];
  for (const group of Object.values(ROLE_GROUP_MAP)) {
    expect(validGroups).toContain(group);
  }
});
