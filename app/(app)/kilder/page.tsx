import Link from 'next/link';
import { getSourceDocuments } from '@/lib/content/load-content';

export default function SourcesPage() {
  const sources = getSourceDocuments();
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Kildebank</p>
        <h1 className="text-3xl font-black">Kilder</h1>
        <p className="mt-2 text-sm text-slate-700">Søk i nettleseren eller filtrer etter status. Advarsler vises før brødtekst.</p>
      </div>
      <div className="grid gap-3">
        {sources.map((source) => (
          <Link key={source.id} href={`/kilder/${source.id}`} className="rounded-2xl bg-white p-4 shadow-sm">
            <span className="block text-lg font-black">{source.title}</span>
            <span className="text-sm font-semibold text-amber-900">{source.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
