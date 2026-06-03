import Link from 'next/link';
import { getContentChangelog } from '@/lib/content/load-content';

export const revalidate = 3600;

function label(changeType: string) {
  if (changeType === 'added') return 'Ny';
  if (changeType === 'updated') return 'Oppdatert';
  if (changeType === 'critical') return 'Kritisk';
  return 'Utgår';
}

export default function ChangelogPage() {
  const entries = getContentChangelog();
  const newOrUpdatedProcedures = entries.filter((entry) => entry.contentRefs.some((ref) => ['action-card', 'checklist'].includes(ref.kind)) && ['added', 'updated', 'critical'].includes(entry.changeType));
  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Innholdsendringer</p>
        <h1 className="text-3xl font-black">Endringslogg</h1>
        <p className="mt-2 text-sm text-slate-700">Generert fra kuratert innhold. Brukes for å se nye og oppdaterte prosedyrer, ikke som operativ ordre.</p>
        <Link href="/ma-leses" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-red-100 px-4 text-sm font-black text-red-900">Åpne må-leses-varsler</Link>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Nye og oppdaterte prosedyrer</h2>
        <div className="mt-3 space-y-3">
          {newOrUpdatedProcedures.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-black uppercase text-sky-800">{label(entry.changeType)} · {entry.date}</p>
              <h3 className="mt-1 text-lg font-black">{entry.title}</h3>
              <p className="mt-2 text-sm text-slate-800">{entry.summary}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Innhold: {entry.contentRefs.map((ref) => `${ref.kind}:${ref.id}`).join(', ')}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Alle endringer</h2>
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => <li key={entry.id} className="rounded-2xl bg-slate-50 p-3 text-sm"><strong>{entry.date} · {label(entry.changeType)}:</strong> {entry.title}</li>)}
        </ul>
      </section>
    </div>
  );
}
