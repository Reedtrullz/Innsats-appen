import Link from 'next/link';
import type { SourceDocument } from '@/lib/content/schemas';
import { WarningBanner } from './warning-banner';

export function SourceBadge({ source }: { source: SourceDocument }) {
  return (
    <Link href={`/kilder/${source.id}`} className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
      {source.title} · {source.status}
    </Link>
  );
}

export function SourceDocumentView({ source }: { source: SourceDocument }) {
  return (
    <article className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Kilde</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{source.title}</h1>
        <p className="mt-2 text-sm font-semibold text-amber-900">Status: {source.status}</p>
        <p className="mt-2 break-all text-xs text-slate-500">Kildereferanse: {source.sourcePath}</p>
      </div>
      {source.warnings.map((warning) => <WarningBanner key={warning}>{warning}</WarningBanner>)}
      <pre className="max-h-[70vh] whitespace-pre-wrap rounded-3xl bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">{source.body}</pre>
    </article>
  );
}
