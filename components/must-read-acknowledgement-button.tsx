'use client';

import { useSyncExternalStore } from 'react';
import type { MustReadNotice } from '@/lib/content/schemas';
import { acknowledgeMustReadNotice, mustReadAcknowledgementSnapshot, parseMustReadAcknowledgements, subscribeMustReadAcknowledgements } from '@/lib/content/must-read-acknowledgement';

export function MustReadAcknowledgementButton({ notice }: { notice: Pick<MustReadNotice, 'id' | 'title' | 'changedAt'> }) {
  const snapshot = useSyncExternalStore(subscribeMustReadAcknowledgements, mustReadAcknowledgementSnapshot, () => '{}');
  const acknowledged = parseMustReadAcknowledgements(snapshot)[notice.id] === notice.changedAt;

  return (
    <button
      type="button"
      disabled={acknowledged}
      aria-label={acknowledged ? `${notice.title} er lest` : `Merk ${notice.title} som lest`}
      onClick={() => acknowledgeMustReadNotice(notice)}
      className="mt-3 inline-flex min-h-11 items-center rounded-full bg-slate-950 px-4 text-sm font-black text-white disabled:bg-white/70 disabled:text-slate-700"
    >
      {acknowledged ? 'Lest for denne versjonen' : 'Merk som lest'}
    </button>
  );
}
