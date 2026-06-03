import Link from 'next/link';
import { getSourceDocuments } from '@/lib/content/load-content';
import { buildSourceReviewDashboard } from '@/lib/content/source-review';

export const revalidate = 3600;

export default function SourceReviewPage() {
  const dashboard = buildSourceReviewDashboard(getSourceDocuments());
  const sections = [
    { title: 'Utløpte kilder', items: dashboard.expired },
    { title: 'Forfalt gjennomgang', items: dashboard.stale },
    { title: 'Uten verifikasjon', items: dashboard.unreviewed },
    { title: 'Høy risiko', items: dashboard.highRisk },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Kildebank</p>
        <h1 className="text-3xl font-black">Kildegjennomgang</h1>
        <p className="mt-2 text-sm text-slate-700">Dashboard for stale, expired, unreviewed og high-risk kilder. Brukes som redaksjonell kø; ikke som operativ status.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-red-50 p-3"><p className="text-2xl font-black text-red-700">{dashboard.expired.length}</p><p className="text-xs font-bold text-red-700">utløpt</p></div>
          <div className="rounded-2xl bg-amber-50 p-3"><p className="text-2xl font-black text-amber-800">{dashboard.stale.length}</p><p className="text-xs font-bold text-amber-800">forfalt</p></div>
          <div className="rounded-2xl bg-slate-100 p-3"><p className="text-2xl font-black text-slate-700">{dashboard.unreviewed.length}</p><p className="text-xs font-bold text-slate-700">uverifisert</p></div>
          <div className="rounded-2xl bg-amber-50 p-3"><p className="text-2xl font-black text-amber-800">{dashboard.highRisk.length}</p><p className="text-xs font-bold text-amber-800">høy risiko</p></div>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">{section.title}</h2>
          {section.items.length === 0 ? <p className="mt-3 text-sm font-semibold text-slate-500">Ingen kilder i denne køen.</p> : null}
          <div className="mt-3 grid gap-3">
            {section.items.map(({ source, freshness }) => (
              <Link key={`${section.title}-${source.id}`} href={`/kilder/${source.id}`} className="rounded-2xl border border-slate-200 p-4">
                <span className="block text-base font-black">{source.title}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-600">{freshness.label} · {freshness.detail}</span>
                <span className="mt-1 block text-xs font-bold text-slate-500">Owner: {source.owner} · Reviewer: {source.reviewer} · Status: {source.status}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
