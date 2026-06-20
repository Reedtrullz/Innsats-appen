'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OperationalIcon, type OperationalIconName } from './ui/operational-icons';

type NavItem = { href: string; label: string; icon: OperationalIconName };

// Nav order is identical for every role: spatial memory matters more in
// the field than per-role ranking. Role only adapts page content, never nav position.
const navItems: NavItem[] = [
  { href: '/', label: 'Hjem', icon: 'home' },
  { href: '/sok', label: 'Søk', icon: 'search' },
  { href: '/oppdrag', label: 'Oppdrag', icon: 'briefcase' },
  { href: '/hurtigkort', label: 'Kort', icon: 'shield' },
  { href: '/mer', label: 'Mer', icon: 'more' },
];

export function BottomNav({ currentPath }: { currentPath?: string }) {
  const pathname = usePathname();
  const activePath = currentPath ?? pathname;

  if (activePath === '/release' || activePath.startsWith('/release/')) return null;

  return (
    <nav
      aria-label="Hovednavigasjon"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active =
            item.href === '/'
              ? activePath === '/'
              : activePath === item.href || activePath.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center transition ${
                  active
                    ? 'bg-[var(--command-bg)] text-white ring-1 ring-[#38bdf8]/40'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <OperationalIcon name={item.icon} className="h-5 w-5" />
                <span className="text-[0.65rem] font-semibold leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
