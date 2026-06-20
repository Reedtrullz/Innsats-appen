import { PhasePageContent } from '@/components/action-card-list';
import { TiltakCardRow } from '@/components/tiltak-card';
import { getActionCards, getChecklists, getSourceDocuments } from '@/lib/content/load-content';
import type { ActionCard } from '@/lib/content/schemas';
import { buildSourceTitleById } from '@/lib/content/source-titles';
import { getWhatNextCards } from '@/lib/content/what-next-cards';

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

function UnderWhatNextCards({ cards }: { cards: ActionCard[] }) {
  const whatNextCards = getWhatNextCards(cards, { phase: 'under', limit: 4 });

  if (whatNextCards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-3xl border border-sky-200 bg-sky-50 p-4" aria-labelledby="under-what-next-heading">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-800">Stresskort</p>
        <h2 id="under-what-next-heading" className="text-2xl font-black text-slate-950">Hva nå under innsats</h2>
        <p className="mt-1 text-sm font-semibold text-slate-700">Korte stopp-, avklarings- og rapporteringskort når oppgaven eller sikkerheten endrer seg.</p>
      </div>
      <div className="space-y-2">
        {whatNextCards.map((card) => <TiltakCardRow key={card.slug} card={card} />)}
      </div>
    </section>
  );
}

export default function Page() {
  const cards = getActionCards();

  return (
    <div className="space-y-5">
      <PhasePageContent
        phase="under"
        cards={cards}
        checklists={getChecklists()}
        sourceTitleById={buildSourceTitleById(getSourceDocuments())}
        primaryOperationalContent={(
          <>
            <UnderOperationalEntryPoints />
            <UnderWhatNextCards cards={cards} />
          </>
        )}
      />
    </div>
  );
}
