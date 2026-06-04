import Link from 'next/link';

import { getContentManifest, getMustReadNotices } from '@/lib/content/load-content';
import { BottomNav } from './bottom-nav';
import { DecisionSupportNotice } from './decision-support-notice';
import { ActiveMissionShortcut, FieldModeRuntime } from './field-mode-runtime';
import { OfflineStatus } from './offline-status';
import { OperationalStatusPills } from './operational-status-pills';

function shortVersion(version: string) {
  return version.length > 19 ? version.slice(0, 19).replace('T', ' ') : version;
}

export function AppShell({ children, currentPath }: { children: React.ReactNode; currentPath?: string }) {
  const manifest = getContentManifest();
  const mustReadCount = getMustReadNotices().length;
  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50 text-slate-950">
      <FieldModeRuntime />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-base font-black tracking-tight">Beredskapsboka</Link>
          <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
            <Link href="/ma-leses" className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-900">Må leses {mustReadCount}</Link>
            <Link href="/mer" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">Mer</Link>
            <OperationalStatusPills compact limit={2} />
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-3xl text-right text-[0.68rem] font-semibold text-slate-500">
          Generert innholdsversjon: <span data-testid="shell-content-version">{shortVersion(manifest.contentVersion)}</span>
        </div>
      </header>
      <OfflineStatus />
      <ActiveMissionShortcut />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <div className="mb-4">
          <DecisionSupportNotice />
        </div>
        {children}
      </main>
      <BottomNav currentPath={currentPath} />
    </div>
  );
}
