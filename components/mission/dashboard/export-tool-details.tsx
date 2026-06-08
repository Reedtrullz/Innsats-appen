'use client';

import type { ReactNode } from 'react';

export function ExportToolDetails({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="min-h-11 cursor-pointer list-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]">
        <span className="block text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</span>
        <span className="block text-lg font-black text-slate-950">{title}</span>
      </summary>
      <div className="mt-4 space-y-3">
        {children}
      </div>
    </details>
  );
}
