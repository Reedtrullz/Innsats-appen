import Link from 'next/link';
import { getContentChangelog, getMustReadNotices } from '@/lib/content/load-content';

export const revalidate = 3600;

function severityTone(severity: string) {
  if (severity === 'critical') return 'border-red-300 bg-red-50 text-red-950';
  if (severity === 'warning') return 'border-amber-300 bg-amber-50 text-amber-950';
  return 'border-sky-300 bg-sky-50 text-sky-950';
}

export default function MustReadPage() {
  const notices = getMustReadNotices();
  const changelogById = new Map(getContentChangelog().map((entry) => [entry.id, entry]));

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-red-700">Kritiske innholdsendringer</p>
        <h1 className="text-3xl font-black">Må leses</h1>
        <p className="mt-2 text-sm text-slate-700">Dette er kritiske innholdsendringer i Beredskapsboka. Det er ikke Nødvarsel, ikke pushvarsel og ikke offisiell befolkningsvarsling. Dette er beslutningsstøtte og erstatter ikke lokal ordre, samband eller offisielt planverk.</p>
        <Link href="/endringer" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-slate-100 px-4 text-sm font-black text-slate-800">Se full endringslogg</Link>
      </section>

      <section className="space-y-3">
        {notices.map((notice) => {
          const changelog = notice.changelogEntryId ? changelogById.get(notice.changelogEntryId) : undefined;
          return (
            <article key={notice.id} className={`rounded-3xl border p-5 shadow-sm ${severityTone(notice.severity)}`}>
              <p className="text-xs font-black uppercase tracking-wide">{notice.severity} · {notice.changedAt}</p>
              <h2 className="mt-1 text-2xl font-black">{notice.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6">{notice.body}</p>
              {notice.linkedCardSlugs.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {notice.linkedCardSlugs.map((slug) => <Link key={slug} href={`/kort/${slug}`} className="rounded-full bg-white/80 px-3 py-1 text-xs font-black underline">Kort: {slug}</Link>)}
                </div>
              ) : null}
              {changelog ? <p className="mt-3 text-xs font-semibold">Endringslogg: {changelog.title}</p> : null}
              <p className="mt-2 text-xs font-semibold">Kilder: {notice.sourceIds.join(', ')}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
