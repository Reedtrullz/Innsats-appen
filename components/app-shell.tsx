import { getContentManifest, getMustReadNotices } from '@/lib/content/load-content';
import { BottomNav } from './bottom-nav';
import { DecisionSupportNotice } from './decision-support-notice';
import { OfflineStatus } from './offline-status';

function shortVersion(version: string) {
  return version.length > 19 ? version.slice(0, 19).replace('T', ' ') : version;
}

export function AppShell({ children, currentPath }: { children: React.ReactNode; currentPath?: string }) {
  const manifest = getContentManifest();
  const mustReadCount = getMustReadNotices().length;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <a href="/hurtigkort" className="text-base font-black tracking-tight">Beredskapsboka</a>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a href="/ma-leses" className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-900">Må leses {mustReadCount}</a>
            <a href="/faq" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">FAQ</a>
            <a href="/endringer" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">Endringer</a>
            <a href="/kildegjennomgang" className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">Kildegjennomgang</a>
            <a href="/datakilder" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">Datakilder</a>
            <a href="/personvern" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">Personvern</a>
            <a href="/kart" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">Kart</a>
            <a href="/release" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">Release</a>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Kildebelagt MVP</span>
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-3xl text-right text-[0.68rem] font-semibold text-slate-500">
          Generert innholdsversjon: <span data-testid="shell-content-version">{shortVersion(manifest.contentVersion)}</span>
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
