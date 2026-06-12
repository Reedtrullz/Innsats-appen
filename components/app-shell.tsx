import Link from 'next/link';

import { getMustReadNotices } from '@/lib/content/load-content';
import { BottomNav } from './bottom-nav';
import { DecisionSupportNotice } from './decision-support-notice';
import { ActiveMissionShortcut, FieldModeRuntime } from './field-mode-runtime';
import { OperationalStatus } from './operational-status';
import { OperationalIcon } from './ui/operational-icons';

export function AppShell({ children, currentPath }: { children: React.ReactNode; currentPath?: string }) {
  const mustReadCount = getMustReadNotices().length;
  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8FAFC] text-slate-950">
      <FieldModeRuntime />
      <header className="sticky top-0 z-30 border-b border-sky-950/20 bg-[#082F49] px-3 py-2 text-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/" aria-label="Beredskapsboka" className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-xl pr-2 text-base font-black tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <OperationalIcon name="shield" className="h-5 w-5 text-sky-100" />
            </span>
            <span className="min-w-0">
              <span className="block truncate leading-tight">Beredskapsboka</span>
              <span className="hidden text-[0.66rem] font-bold uppercase tracking-wide text-sky-100 sm:block">Kildebelagt feltstøtte</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Link href="/ma-leses" aria-label={`Må leses ${mustReadCount}`} className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-3 py-2 text-xs font-black text-white shadow-sm shadow-red-950/20">
              <span className="sm:hidden">Må {mustReadCount}</span>
              <span className="hidden sm:inline">Må leses {mustReadCount}</span>
            </Link>
            <Link href="/mer" className="hidden min-h-11 items-center rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/15 sm:inline-flex">Mer</Link>
          </div>
        </div>
      </header>
      <div className="border-b border-slate-200 bg-white px-3 py-0.5">
        <div className="mx-auto max-w-3xl">
          <OperationalStatus variant="compact" />
        </div>
      </div>
      <ActiveMissionShortcut />
      <main className="mx-auto max-w-3xl px-3 pb-28 pt-3 sm:px-4 sm:pt-4">
        <div className="mb-3">
          <DecisionSupportNotice compact />
        </div>
        {children}
      </main>
      <BottomNav currentPath={currentPath} />
    </div>
  );
}
