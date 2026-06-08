'use client';

import type { ReactNode } from 'react';

export function ExportGroup({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</p>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
