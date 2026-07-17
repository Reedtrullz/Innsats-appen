'use client';

import Link from 'next/link';
import { useActiveMission } from '@/lib/mission/use-active-mission';

export function ActionCardMissionActions({ cardSlug }: { cardSlug: string }) {
  const { mission, loading } = useActiveMission();
  if (loading || !mission) return null;

  return (
    <nav aria-label="Aktivt oppdrag" className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-2">
      <Link href={`/oppdrag?fromCard=${encodeURIComponent(cardSlug)}#hurtiglogg`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#38bdf8] px-4 text-sm font-black text-[#04141f]">
        Logg fra dette kortet
      </Link>
      <Link href="/oppdrag" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-black text-[var(--text-primary)]">
        Tilbake til oppdrag
      </Link>
    </nav>
  );
}
