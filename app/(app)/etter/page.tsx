import { PhasePageContent } from '@/components/action-card-list';
import { getActionCards } from '@/lib/content/load-content';

function EtterReportingEntryPoints() {
  return (
    <section className="rounded-3xl bg-slate-950 p-5 text-white" aria-labelledby="etter-reporting-heading">
      <p className="text-sm font-black uppercase tracking-wide text-sky-200">Dokumentasjon etter innsats</p>
      <h2 id="etter-reporting-heading" className="text-2xl font-black">Rapport, RUH/velferd og oppdragsmappe</h2>
      <p className="mt-2 text-sm font-semibold text-slate-200">Alt er lokal og ikke offisiell innsending. Kopier eller eksporter manuelt etter godkjente rutiner.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <a href="/oppdrag#etterrapport" className="rounded-2xl bg-white p-4 font-black text-slate-950">Åpne etterrapport</a>
        <a href="/oppdrag#ruh-velferd" className="rounded-2xl bg-white p-4 font-black text-slate-950">RUH og velferd</a>
        <a href="/oppdrag#oppdragsmappe" className="rounded-2xl bg-white p-4 font-black text-slate-950">Oppdragsmappe</a>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <div className="space-y-5">
      <PhasePageContent phase="etter" cards={getActionCards()} />
      <EtterReportingEntryPoints />
    </div>
  );
}
