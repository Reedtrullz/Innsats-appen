import Link from 'next/link';

import { getMustReadNotices } from '@/lib/content/load-content';
import { BottomNav } from './bottom-nav';
import { DecisionSupportNotice } from './decision-support-notice';
import { ActiveMissionShortcut, FieldModeRuntime } from './field-mode-runtime';
import { FieldModeHeaderToggle } from './field-mode-header-toggle';
import { OperationalStatus } from './operational-status';
import { OperationalIcon } from './ui/operational-icons';

export function AppShell({ children, currentPath }: { children: React.ReactNode; currentPath?: string }) {
  const mustReadNotices = getMustReadNotices();
  const mustReadCount = mustReadNotices.length;
  const hasCriticalNotice = mustReadNotices.some((notice) => notice.severity === 'critical');

  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: 'var(--app-bg)', color: 'var(--text-primary)' }}>
      <FieldModeRuntime />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#082f49] px-3 py-2 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Beredskapsboka"
            className="inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <OperationalIcon name="shield" className="h-5 w-5 text-sky-200" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight tracking-tight">Beredskapsboka</span>
              <span className="hidden font-mono text-[0.6rem] font-medium uppercase tracking-widest text-sky-300/80 sm:block">
                Kildebelagt feltstøtte
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <FieldModeHeaderToggle />
            <Link
              href="/ma-leses"
              aria-label={`Må leses ${mustReadCount}`}
              className={
                hasCriticalNotice
                  ? 'inline-flex min-h-11 items-center rounded-full bg-red-600 px-3 py-2 font-mono text-xs font-bold text-white'
                  : 'inline-flex min-h-11 items-center rounded-full bg-white/10 px-3 py-2 font-mono text-xs font-bold text-sky-100 ring-1 ring-white/15'
              }
            >
              <span className="sm:hidden">Må {mustReadCount}</span>
              <span className="hidden sm:inline">Må leses {mustReadCount}</span>
            </Link>
            <Link
              href="/mer"
              className="hidden min-h-11 items-center rounded-full bg-white/10 px-3 py-2 font-mono text-xs font-bold text-sky-100 ring-1 ring-white/15 sm:inline-flex"
            >
              Mer
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-0.5">
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
