'use client';

import { StatusPill } from '@/components/ui/operational-primitives';

export function MissionStatusStrip() {
  return (
    <section aria-label="Oppdragets lokale status" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <StatusPill label="Lokal" tone="success" compact />
        <StatusPill label="Ikke delt" tone="slate" compact />
        <StatusPill label="Ikke kommandosystem" tone="warning" compact />
        <StatusPill label="Kildebelagt" tone="sky" compact />
      </div>
    </section>
  );
}
