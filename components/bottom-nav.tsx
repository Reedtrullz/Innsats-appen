'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Hjem' },
  { href: '/sok', label: 'Søk' },
  { href: '/oppdrag', label: 'Oppdrag' },
  { href: '/hurtigkort', label: 'Kort' },
  { href: '/mer', label: 'Mer' },
];

export function BottomNav({ currentPath }: { currentPath?: string }) {
  const pathname = usePathname();
  const activePath = currentPath ?? pathname;
  if (activePath === '/release' || activePath.startsWith('/release/')) return null;
  return (
    <nav aria-label="Hovednavigasjon" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-lg backdrop-blur">
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
        {items.map((item) => {
          const active = item.href === '/' ? activePath === '/' : activePath === item.href || activePath.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 w-full min-w-0 items-center justify-center rounded-xl px-1 text-center text-[0.68rem] font-semibold leading-tight ${
                  active ? 'bg-sky-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
