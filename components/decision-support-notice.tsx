import Link from 'next/link';

export function DecisionSupportNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-label="Operativ grense og lokal datalagring">
      <p className="text-xs font-black uppercase tracking-wide">Operativ grense · lokal MVP</p>
      <p className="mt-1 text-sm font-semibold">
        Beredskapsboka er beslutningsstøtte og ikke et offisielt kommando-, ordre- eller hendelsessystem. Data lagres bare lokalt i denne nettleseren. Ikke legg inn persondata, pasientdata eller private/skjermede tilfluktsromdata.
      </p>
      {!compact ? (
        <nav aria-label="MVP-grenser" className="mt-3 flex flex-wrap gap-2 text-xs font-black">
          <Link href="/begrensninger" className="rounded-full bg-white px-3 py-1 text-amber-950 ring-1 ring-amber-200">Grenser</Link>
          <Link href="/kjente-begrensninger" className="rounded-full bg-white px-3 py-1 text-amber-950 ring-1 ring-amber-200">Kjente begrensninger</Link>
          <Link href="/data-pa-enheten" className="rounded-full bg-white px-3 py-1 text-amber-950 ring-1 ring-amber-200">Data på enheten</Link>
        </nav>
      ) : null}
    </section>
  );
}
