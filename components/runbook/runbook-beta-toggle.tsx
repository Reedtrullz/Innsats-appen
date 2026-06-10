'use client';

import Link from 'next/link';
import { saveRunbookBeta } from '@/lib/runbook/runbook-beta';
import { useRunbookBeta } from './use-runbook-beta';

export function RunbookBetaToggle() {
  const enabled = useRunbookBeta();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => saveRunbookBeta(!enabled)}
        aria-pressed={enabled}
        className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900"
      >
        {enabled ? 'Slå av veiledet runbook' : 'Slå på veiledet runbook (beta)'}
      </button>
      {enabled ? (
        <Link href="/na" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">Åpne runbook</Link>
      ) : null}
    </div>
  );
}
