'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const moduleLinks = [
  { href: '/moduler/cbrn', label: 'CBRN' },
  { href: '/moduler/mfe', label: 'MFE' },
  { href: '/moduler/radiac', label: 'RADIAC' },
  { href: '/moduler/tilfluktsrom', label: 'Tilfluktsrom' },
];

/** Pill row so module-to-module navigation does not bounce through home. */
export function ModuleSwitcher() {
  const pathname = usePathname();
  return (
    <nav aria-label="Spesialistmoduler" className="flex flex-wrap gap-2">
      {moduleLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-black ${
              active ? 'bg-[#082F49] text-white' : 'bg-white text-slate-900 ring-1 ring-slate-300'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
