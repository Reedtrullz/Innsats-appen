'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readLocalProfile, saveLocalProfile, subscribeLocalProfile, type LocalProfileRole } from '@/lib/privacy/local-profile';
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
  const [role, setRole] = useState<LocalProfileRole>(() => {
    if (typeof window === 'undefined') return 'ikke-valgt';
    try {
      return readLocalProfile()?.preferredRole ?? 'ikke-valgt';
    } catch {
      return 'ikke-valgt';
    }
  });

  const group = useMemo(() => roleGroup(role), [role]);
  const groupLabel = useMemo(() => ROLE_GROUP_LABELS[group], [group]);

  const setPreferredRole = useCallback((newRole: LocalProfileRole) => {
    try {
      const updated = saveLocalProfile({ preferredRole: newRole });
      setRole(updated.preferredRole);
    } catch {
      setRole(newRole);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeLocalProfile(() => {
      try {
        const profile = readLocalProfile();
        if (profile) setRole(profile.preferredRole);
      } catch {
        // Keep current role on read failure.
      }
    });
    return unsubscribe;
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
