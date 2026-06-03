import Link from 'next/link';
import type { SourceDocument } from '@/lib/content/schemas';
import { sourceExcerpt, sourceSectionAnchor, type SourceCardLink } from '@/lib/content/source-navigation';
import { sourceFreshness } from '@/lib/content/source-review';
import { WarningBanner } from './warning-banner';

function freshnessClasses(tone: ReturnType<typeof sourceFreshness>['tone']) {
  if (tone === 'red') return 'border-red-200 bg-red-50 text-red-700';
  if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function SourceBadge({ source, now, withAnchor = false }: { source: SourceDocument; now?: Date; withAnchor?: boolean }) {
  const freshness = sourceFreshness(source, now);
  const href = `/kilder/${source.id}${withAnchor ? `#${sourceSectionAnchor(source)}` : ''}`;
  return (
    <Link href={href} className="inline-flex min-h-11 flex-wrap items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
      <span>{source.title} · {source.status}</span>
      <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${freshnessClasses(freshness.tone)}`}>{freshness.label}</span>
    </Link>
  );
}

export function SourceDocumentView({ source, linkedCards = [], now }: { source: SourceDocument; linkedCards?: SourceCardLink[]; now?: Date }) {
  const freshness = sourceFreshness(source, now);
  return (
    <article className="space-y-4">
      <div id="metadata" className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Kilde</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{source.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Status: {source.status}</span>
          <span className={`rounded-full border px-3 py-1 ${freshnessClasses(freshness.tone)}`}>{freshness.label}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Risiko: {source.reviewRisk}</span>
        </div>
        <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
          <p>{`Verifisert: ${source.verifiedAt}`}</p>
          {source.reviewAfter ? <p>{`Ny gjennomgang: ${source.reviewAfter}`}</p> : null}
          {source.expiresAt ? <p>{`Utløper: ${source.expiresAt}`}</p> : null}
          <p>{`Eier: ${source.owner}`}</p>
          <p>{`Reviewer: ${source.reviewer}`}</p>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-600">{freshness.detail}</p>
        {source.reviewNotes ? <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">{source.reviewNotes}</p> : null}
        <p className="mt-2 break-all text-xs text-slate-500">Kildereferanse: {source.sourcePath}</p>
      </div>
      {source.warnings.map((warning) => <WarningBanner key={warning}>{warning}</WarningBanner>)}
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Brukt av kort</h2>
        {linkedCards.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-800">
            {linkedCards.map((card) => (
              <li key={card.slug}>
                <Link className="text-sky-800 underline" href={`/kort/${card.slug}`}>{card.title}</Link>
                <span className="ml-2 text-xs uppercase text-slate-500">{card.phase} · {card.priority}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-slate-600">Ingen kuraterte kort peker til denne kilden ennå.</p>}
      </section>
      <section id="excerpt" className="rounded-3xl bg-amber-50 p-5 shadow-sm">
        <h2 className="text-xl font-black text-amber-950">Kildeutdrag</h2>
        <p className="mt-2 rounded-2xl bg-amber-100 p-3 text-sm font-black text-amber-950">Utdrag – ikke fullstendig offisielt dokument. Kontroller alltid mot gjeldende originalkilde før operativ bruk.</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{sourceExcerpt(source)}</p>
      </section>
      <details className="rounded-3xl bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-black text-slate-800">Vis lengre importert tekst fra kildeutdraget</summary>
        <pre className="mt-3 max-h-[70vh] whitespace-pre-wrap text-sm leading-6 text-slate-800">{source.body}</pre>
      </details>
    </article>
  );
}
