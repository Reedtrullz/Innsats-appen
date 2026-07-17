'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import type { MustReadNotice } from '@/lib/content/schemas';
import { mustReadAcknowledgementSnapshot, subscribeMustReadAcknowledgements, unacknowledgedCriticalNotices } from '@/lib/content/must-read-acknowledgement';

export function MustReadStatusLink({ notices }: { notices: MustReadNotice[] }) {
  const snapshot = useSyncExternalStore(subscribeMustReadAcknowledgements, mustReadAcknowledgementSnapshot, () => '{}');
  const urgentCount = unacknowledgedCriticalNotices(notices, snapshot).length;

  return (
    <Link
      href="/ma-leses"
      aria-label={`Må leses ${urgentCount} nye`}
      className={urgentCount > 0
        ? 'inline-flex min-h-11 items-center rounded-full bg-red-600 px-3 py-2 font-mono text-xs font-bold text-white'
        : 'inline-flex min-h-11 items-center rounded-full bg-white/10 px-3 py-2 font-mono text-xs font-bold text-sky-100 ring-1 ring-white/15'}
    >
      <span className="sm:hidden">Må {urgentCount}</span>
      <span className="hidden sm:inline">Må leses {urgentCount}</span>
    </Link>
  );
}
