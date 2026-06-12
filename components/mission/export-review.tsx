'use client';

import { useState, type ReactNode } from 'react';

interface ExportReviewProps {
  title: string;
  text: string;
  textareaId: string;
  copyLabel?: string;
  previewLabel?: string;
  formatLabel?: string;
  children?: ReactNode;
}

export function ExportReview({
  title,
  text,
  textareaId,
  copyLabel = 'Kopier',
  previewLabel = 'Vis forhåndsvisning',
  formatLabel,
  children,
}: ExportReviewProps) {
  // Tied to the copied text so regenerating the export clears stale feedback.
  const [copyState, setCopyState] = useState<{ text: string; status: 'copied' | 'failed' } | null>(null);
  if (!text) return null;
  const copyStatus = copyState?.text === text ? copyState.status : null;

  async function copyToClipboard() {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(text);
      setCopyState({ text, status: 'copied' });
    } catch {
      setCopyState({ text, status: 'failed' });
    }
  }

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
      <button type="button" onClick={() => void copyToClipboard()} className="mt-3 min-h-11 rounded-xl bg-white px-4 text-sm font-black text-emerald-950 ring-1 ring-emerald-200">
        {copyLabel}
      </button>
      <p role="status" aria-live="polite" className={`mt-2 text-sm font-bold ${copyStatus === 'failed' ? 'text-amber-900' : 'text-emerald-800'}`}>
        {copyStatus === 'copied' ? 'Kopiert til utklippstavlen.' : null}
        {copyStatus === 'failed' ? 'Kunne ikke kopiere automatisk. Åpne forhåndsvisningen og kopier teksten manuelt.' : null}
      </p>
      <details className="mt-3 rounded-xl bg-white p-3 ring-1 ring-emerald-200" open={copyStatus === 'failed' || undefined}>
        <summary className="min-h-11 cursor-pointer list-none text-sm font-black">{previewLabel}</summary>
        <label htmlFor={textareaId} className="mt-3 block text-sm font-bold">
          {title}
          <textarea id={textareaId} readOnly value={text} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      </details>
    </section>
  );
}
