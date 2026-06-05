import { PhasePageContent } from '@/components/action-card-list';
import { getActionCards, getChecklists } from '@/lib/content/load-content';

function UnderOperationalEntryPoints() {
  return (
    <section className="rounded-3xl bg-sky-950 p-5 text-white" aria-labelledby="under-operational-tools-heading">
      <p className="text-sm font-black uppercase tracking-wide text-sky-200">Operativ flyt</p>
      <h2 id="under-operational-tools-heading" className="text-2xl font-black">Kart, logg og aktivt oppdrag</h2>
      <p className="mt-2 text-sm font-semibold text-sky-100">Kart og logg er lokal beslutningsstøtte. Kontroller alltid mot ordre, samband og innsatsleders føringer.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <a href="/oppdrag" className="rounded-2xl bg-white p-4 font-black text-slate-950">Åpne aktivt oppdrag</a>
        <a href="/kart" className="rounded-2xl bg-white p-4 font-black text-slate-950">Åpne kart</a>
        <a href="/oppdrag#hurtiglogg" className="rounded-2xl bg-white p-4 font-black text-slate-950">Hurtiglogg</a>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <div className="space-y-5">
      <PhasePageContent phase="under" cards={getActionCards()} checklists={getChecklists()} />
      <UnderOperationalEntryPoints />
    </div>
  );
}
