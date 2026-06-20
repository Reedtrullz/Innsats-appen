'use client';

import { RoleProvider } from '@/lib/role/role-context';
import { ModeProvider } from '@/lib/mode/mode-context';
import type { ReactNode } from 'react';

export function RoleProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <RoleProvider>
      <ModeProvider>{children}</ModeProvider>
    </RoleProvider>
  );
}
