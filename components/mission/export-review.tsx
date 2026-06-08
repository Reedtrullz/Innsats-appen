'use client';

import type { ReactNode } from 'react';

interface ExportReviewProps {
  title: string;
  text: string;
  textareaId: string;
  onCopy?: (text: string) => void;
  copyLabel?: string;
  previewLabel?: string;
  formatLabel?: string;
  children?: ReactNode;
}

export function ExportReview({
  title,
  text,
  textareaId,
  onCopy,
  copyLabel = 'Kopier',
  previewLabel = 'Vis forhåndsvisning',
  formatLabel,
  children,
}: ExportReviewProps) {
  if (!text) return null;
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-black">{title} er klar</p>
          {formatLabel ? <p className="mt-1 text-xs font-black uppercase tracking-wide text-emerald-800">{formatLabel}</p> : null}
          <p className="mt-1 text-sm font-semibold">Se over innholdet før lokal bruk eller deling.</p>
        </div>
        {children}
      </div>
      {onCopy ? (
        <button type="button" onClick={() => onCopy(text)} className="mt-3 min-h-11 rounded-xl bg-white px-4 text-sm font-black text-emerald-950 ring-1 ring-emerald-200">
          {copyLabel}
        </button>
      ) : null}
      <details className="mt-3 rounded-xl bg-white p-3 ring-1 ring-emerald-200">
        <summary className="min-h-11 cursor-pointer list-none text-sm font-black">{previewLabel}</summary>
        <label htmlFor={textareaId} className="mt-3 block text-sm font-bold">
          {title}
          <textarea id={textareaId} readOnly value={text} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      </details>
    </section>
  );
}
