import Link from 'next/link';
import { getSourceDocuments } from '@/lib/content/load-content';
import { SourceBadge } from '@/components/source-badge';

export const revalidate = 3600;

export default function SourcesPage() {
  const sources = getSourceDocuments();
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Kildebank</p>
        <h1 className="text-3xl font-black">Kilder</h1>
        <p className="mt-2 text-sm text-slate-700">Søk i nettleseren eller filtrer etter status. Advarsler vises før brødtekst.</p>
        <Link href="/kildegjennomgang" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-amber-100 px-4 text-sm font-black text-amber-900">Åpne kildegjennomgang</Link>
      </div>
      <div className="grid gap-3">
        {sources.map((source) => (
          <div key={source.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <SourceBadge source={source} />
          </div>
        ))}
      </div>
    </div>
  );
}
