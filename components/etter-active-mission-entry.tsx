'use client';

import Link from 'next/link';
import { useActiveMission } from '@/lib/mission/use-active-mission';

export function ActiveMissionClientEntry() {
  const { mission, loading, hasActiveMission } = useActiveMission();

  if (loading) return null;

  if (!hasActiveMission) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-5">
        <h2 className="text-xl font-black text-slate-900">Ingen aktivt oppdrag</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">Opprett eller velg et oppdrag for å forhåndsutfylle etterrapport, RUH/velferd og oppdragsmappe fra feltloggen.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/oppdrag/ny" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 font-black text-white">Nytt oppdrag</Link>
          <Link href="/oppdrag" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950">Velg oppdrag</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
      <h2 className="text-xl font-black text-sky-950">Aktivt oppdrag: {mission?.title}</h2>
      <p className="mt-1 text-sm font-semibold text-sky-800">{mission?.locationText} · {mission?.phase} · {mission?.scenario}</p>
      <p className="mt-2 text-sm font-semibold text-sky-700">Feltlogg fra dette oppdraget forhåndsutfyller etterrapport, RUH/velferd og oppdragsmappe.</p>
      <p className="mt-1 text-sm font-semibold text-sky-700">Feltloggposter: {mission?.fieldLogEntries?.length ?? 0}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/oppdrag#etterrapport" className="inline-flex min-h-11 items-center rounded-xl bg-sky-900 px-4 font-black text-white">Åpne etterrapport</Link>
        <Link href="/oppdrag#ruh-velferd" className="inline-flex min-h-11 items-center rounded-xl border border-sky-300 bg-white px-4 font-black text-sky-950">RUH og velferd</Link>
        <Link href="/oppdrag#oppdragsmappe" className="inline-flex min-h-11 items-center rounded-xl border border-sky-300 bg-white px-4 font-black text-sky-950">Oppdragsmappe</Link>
      </div>
    </section>
  );
}
