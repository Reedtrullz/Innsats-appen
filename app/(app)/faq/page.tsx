import Link from 'next/link';
import { getFAQEntries } from '@/lib/content/load-content';

export const revalidate = 3600;

export default function FAQPage() {
  const entries = getFAQEntries();
  const categories = [...new Set(entries.map((entry) => entry.category))].sort((a, b) => a.localeCompare(b, 'nb'));
  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Curated FAQ</p>
        <h1 className="text-3xl font-black">Ofte stilte spørsmål</h1>
        <p className="mt-2 text-sm text-slate-700">Svarene er offentlig, kildebelagt beslutningsstøtte. De er ikke fullstendige offisielle dokumenter eller operative ordre.</p>
        <Link href="/kilder" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-slate-100 px-4 text-sm font-black text-slate-800">Se kilder</Link>
      </section>
      {categories.map((category) => (
        <section key={category} className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">{category}</h2>
          <div className="mt-3 space-y-3">
            {entries.filter((entry) => entry.category === category).map((entry) => (
              <article key={entry.id} id={entry.id} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-lg font-black">{entry.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-800">{entry.answer}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                  {entry.mustRead ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-900">Må leses</span> : null}
                  {entry.roles.map((role) => <span key={role} className="rounded-full bg-slate-100 px-2.5 py-1">{role}</span>)}
                  {entry.scenarios.map((scenario) => <span key={scenario} className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-950">{scenario}</span>)}
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">Oppdatert {entry.updatedAt} · kilder: {entry.sourceIds.join(', ')}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
