import type { MissionContext } from '@/lib/mission/schemas';
import { phaseLabels } from '@/lib/content/taxonomy';

const flowLinks = [
  { href: '#mission-now-panel', label: 'Neste' },
  { href: '#sjekkliste', label: 'Sjekkliste' },
  { href: '#mission-tools', label: 'Verktøy' },
  { href: '#mission-export-panel', label: 'Avslutt' },
] as const;

export function MissionStickyHeader({ mission }: { mission: MissionContext }) {
  return (
    <div className="sticky top-[5.65rem] z-20 -mx-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/85">
      <div className="flex items-center justify-between gap-3 px-2 pb-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--text-primary)]">{mission.title}</p>
          <p className="text-xs font-semibold text-[var(--text-muted)]">{phaseLabels[mission.phase]} · {mission.locationText || 'Sted ikke angitt'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#082F49] px-3 py-1 text-xs font-black text-white">{phaseLabels[mission.phase]}</span>
      </div>
      <nav aria-label="Oppdragsflyt" className="grid grid-cols-4 gap-1">
        {flowLinks.map((link) => (
          <a key={link.href} href={link.href} className="inline-flex min-h-11 items-center justify-center rounded-xl px-2 text-center text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]">
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
