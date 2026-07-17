'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { localProfileSnapshot, readLocalProfile, saveLocalProfile, subscribeLocalProfile, type LocalProfileRole } from '@/lib/privacy/local-profile';
import { roleGroup, ROLE_GROUP_LABELS, type RoleGroup } from '@/lib/role/role-groups';
import type { Role } from '@/lib/content/taxonomy';

export interface RoleContextValue {
  role: LocalProfileRole;
  roleGroup: RoleGroup;
  roleGroupLabel: string;
  setPreferredRole: (role: LocalProfileRole) => void;
}

const RoleContext = createContext<RoleContextValue>({
  role: 'ikke-valgt',
  roleGroup: 'ikke-valgt',
  roleGroupLabel: ROLE_GROUP_LABELS['ikke-valgt'],
  setPreferredRole: () => undefined,
});

export function useRole(): RoleContextValue {
  return useContext(RoleContext);
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const profileSnapshot = useSyncExternalStore(
    subscribeLocalProfile,
    localProfileSnapshot,
    () => 'null',
  );
  const role = useMemo<LocalProfileRole>(() => {
    try {
      return (JSON.parse(profileSnapshot) as { preferredRole?: LocalProfileRole } | null)?.preferredRole ?? 'ikke-valgt';
    } catch {
      return 'ikke-valgt';
    }
  }, [profileSnapshot]);

  const group = useMemo(() => roleGroup(role), [role]);
  const groupLabel = useMemo(() => ROLE_GROUP_LABELS[group], [group]);

  const setPreferredRole = useCallback((newRole: LocalProfileRole) => {
    try {
      // Merge with the stored profile so selecting a role preserves mode,
      // display name and other fields (saveLocalProfile replaces, not merges).
      saveLocalProfile({ ...(readLocalProfile() ?? {}), preferredRole: newRole });
    } catch {
      // Keep the last stable external-store snapshot when browser storage fails.
    }
  }, []);

  const value = useMemo<RoleContextValue>(() => ({
    role,
    roleGroup: group,
    roleGroupLabel: groupLabel,
    setPreferredRole,
  }), [role, group, groupLabel, setPreferredRole]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}
