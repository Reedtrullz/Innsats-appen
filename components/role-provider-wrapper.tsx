'use client';

import { RoleProvider } from '@/lib/role/role-context';
import type { ReactNode } from 'react';

export function RoleProviderWrapper({ children }: { children: ReactNode }) {
  return <RoleProvider>{children}</RoleProvider>;
}
