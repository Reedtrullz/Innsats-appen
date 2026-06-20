'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { listMissions } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';
import { OperationalIcon } from './ui/operational-icons';

export function HomeActiveMission() {
  const [mission, setMission] = useState<MissionContext | null>(null);

  useEffect(() => {
    let active = true;
    listMissions().then((missions) => {
      if (!active) return;
      setMission(selectActiveMission(missions, readSelectedActiveMissionId()));
    });
    return () => {
      active = false;
    };
  }, []);

  if (!mission) return null;

  return (
    <Link
      href="/oppdrag"
      className="mb-3 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#38bdf8]/30 bg-[var(--surface-elevated)] px-4 py-3 shadow-[0_4px_16px_rgba(56,189,248,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8] transition hover:border-[#38bdf8]/50"
    >
      <span className="min-w-0">
        <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--accent-fg)]">Aktivt oppdrag</span>
        <span className="mt-0.5 block truncate text-sm font-bold text-[var(--text-primary)]">{mission.title} · {mission.locationText}</span>
      </span>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#38bdf8]/15 text-[var(--accent-fg)]">
        <OperationalIcon name="chevron" className="h-4 w-4" />
      </span>
    </Link>
  );
}
