'use client';

import { useSyncExternalStore } from 'react';
import { readRunbookBeta, subscribeRunbookBeta } from '@/lib/runbook/runbook-beta';

export function useRunbookBeta(): boolean {
  return useSyncExternalStore(subscribeRunbookBeta, () => readRunbookBeta(), () => false);
}
