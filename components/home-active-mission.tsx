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
      className="mb-3 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]"
    >
      <span className="min-w-0">
        <span className="block text-xs font-black uppercase tracking-wide">Aktivt oppdrag</span>
        <span className="block truncate text-sm font-black">{mission.title} · {mission.locationText}</span>
      </span>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
        <OperationalIcon name="chevron" className="h-4 w-4" />
      </span>
    </Link>
  );
}
