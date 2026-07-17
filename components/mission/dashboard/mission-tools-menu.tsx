'use client';

import { useState, type ReactNode } from 'react';

export function MissionToolsMenu({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      id="mission-tools"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="scroll-mt-28 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm"
    >
      <summary className="min-h-11 cursor-pointer list-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]">
        <span className="block text-xs font-black uppercase tracking-wide text-sky-700">Ved behov</span>
        <span className="block text-lg font-black text-slate-950">Oppdragsverktøy</span>
        <span className="mt-1 block text-sm font-semibold text-slate-600">Logg, logistikk, kart og lokale støtteflater samlet på ett sted.</span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}
