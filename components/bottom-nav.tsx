'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OperationalIcon, type OperationalIconName } from './ui/operational-icons';

type NavItem = { href: string; label: string; icon: OperationalIconName };

// The nav order is identical for every role: spatial memory matters more in
// the field than per-role ranking. Role only adapts page content, never the
// position of navigation targets.
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
    <nav aria-label="Hovednavigasjon" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur">
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active = item.href === '/' ? activePath === '/' : activePath === item.href || activePath.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[0.66rem] font-black leading-tight transition ${
                  active ? 'bg-[#082F49] text-white shadow-sm shadow-sky-950/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <OperationalIcon name={item.icon} className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
