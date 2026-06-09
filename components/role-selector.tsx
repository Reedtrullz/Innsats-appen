'use client';

import { useState, useRef, useEffect } from 'react';
import { useRole } from '@/lib/role/role-context';
import { ROLE_GROUP_LABELS, ROLE_GROUP_CANONICAL_ROLE, type RoleGroup } from '@/lib/role/role-groups';
import type { LocalProfileRole } from '@/lib/privacy/local-profile';

const groups: Array<{ group: RoleGroup; label: string }> = [
  { group: 'leder', label: ROLE_GROUP_LABELS.leder },
  { group: 'lagforer', label: ROLE_GROUP_LABELS.lagforer },
  { group: 'mannskap', label: ROLE_GROUP_LABELS.mannskap },
  { group: 'ikke-valgt', label: ROLE_GROUP_LABELS['ikke-valgt'] },
];

export function RoleSelector() {
  const { roleGroup, roleGroupLabel, setPreferredRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [open]);

  function select(group: RoleGroup) {
    const canonical = ROLE_GROUP_CANONICAL_ROLE[group];
    setPreferredRole((canonical ?? 'ikke-valgt') as LocalProfileRole);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative" data-testid="role-selector">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/15 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label={`Rolle: ${roleGroupLabel}. Klikk for å bytte.`}
      >
        {roleGroupLabel}
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {groups.map(({ group, label }) => (
            <button
              key={group}
              type="button"
              onClick={() => select(group)}
              className={`block w-full min-h-11 rounded-lg px-3 py-2 text-left text-sm font-bold ${roleGroup === group ? 'bg-sky-50 text-sky-900' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
