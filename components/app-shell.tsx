import { BottomNav } from './bottom-nav';
import { DecisionSupportNotice } from './decision-support-notice';
import { OfflineStatus } from './offline-status';

export function AppShell({ children, currentPath }: { children: React.ReactNode; currentPath?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <a href="/hurtigkort" className="text-base font-black tracking-tight">Beredskapsboka</a>
          <div className="flex items-center gap-2">
            <a href="/release" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">Release</a>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Kildebelagt MVP</span>
          </div>
        </div>
      </header>
      <OfflineStatus />
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
