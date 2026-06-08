import Link from 'next/link';

export function DecisionSupportNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`rounded-2xl border border-amber-200 bg-amber-50 text-amber-950 ${compact ? 'p-3' : 'p-4'}`} aria-label="Operativ grense og lokal datalagring">
      <p className="text-xs font-black uppercase tracking-wide">Operativ grense · lokal MVP</p>
      <p className={`${compact ? 'mt-1 text-xs leading-5' : 'mt-1 text-sm'} font-semibold`}>
        {compact
          ? 'Beslutningsstøtte, ikke et offisielt kommandosystem. Data lagres bare lokalt. Ikke legg inn persondata.'
          : 'Beredskapsboka er beslutningsstøtte og ikke et offisielt kommando-, ordre- eller hendelsessystem. Data lagres bare lokalt i denne nettleseren. Ikke legg inn persondata, pasientdata eller private/skjermede tilfluktsromdata.'}
      </p>
      <nav aria-label="MVP-grenser" className={`${compact ? 'mt-2' : 'mt-3'} flex flex-wrap gap-2 text-xs font-black`}>
        <Link href="/begrensninger" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-amber-950 ring-1 ring-amber-200">Grenser</Link>
        <Link href="/kjente-begrensninger" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-amber-950 ring-1 ring-amber-200">Kjente begrensninger</Link>
        <Link href="/data-pa-enheten" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-amber-950 ring-1 ring-amber-200">Data på enheten</Link>
      </nav>
    </section>
  );
}
