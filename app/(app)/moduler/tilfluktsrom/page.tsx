import Link from 'next/link';
import { ActionCardList } from '@/components/action-card-list';
import { getActionCards, getChecklists, getProtectionMeasures } from '@/lib/content/load-content';
import type { ActionCard, OperationalChecklist, ProtectionMeasure } from '@/lib/content/schemas';

const workflow = [
  { title: 'Klargjøring', text: 'Avklar ansvarslinje, adgang, ventilasjon, nødstrøm, vann, sanitær, belysning og samband før publikum mottas.' },
  { title: 'Drift', text: 'Hold enkel driftstavle for status, avvik, ressursbehov og publikumsflyt uten persondata.' },
  { title: 'Teknisk status', text: 'Bruk sjekkliste for ventilasjon, nødstrøm, vann, sanitær, belysning, samband og adgangskontroll.' },
  { title: 'Rapportering', text: 'Rapporter åpning, kapasitet, teknisk status, avvik og behov gjennom godkjent linje.' },
  { title: 'Avslutning', text: 'Avklar stenging, etterkontroll, materiellstatus, renhold og rapporterte avvik før rommet frigis.' },
];

export function TilfluktsromModuleContent({
  cards,
  checklists,
  protectionMeasures,
}: {
  cards: ActionCard[];
  checklists: OperationalChecklist[];
  protectionMeasures: ProtectionMeasure[];
}) {
  const tilfluktsromCards = cards.filter((card) => card.scenarios.includes('tilfluktsrom'));
  const tilfluktsromChecklists = checklists.filter((checklist) => checklist.scenarios.includes('tilfluktsrom'));
  const publicMeasures = protectionMeasures.filter((measure) => measure.kind === 'tilfluktsrom' && measure.publicOrRestricted === 'public');

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide">Sivile beskyttelsestiltak</p>
        <h1 className="text-3xl font-black">Tilfluktsrom</h1>
        <p className="mt-2 text-sm text-sky-100">Modul for offentlig, godkjent og kildebelagt støtte til klargjøring, drift og avslutning.</p>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <h2 className="text-xl font-black">Datagrense</h2>
        <p className="mt-2 text-sm font-semibold">Bruk bare godkjent informasjon. Beredskapsboka publiserer ikke private/skjermede lokasjonslister, kapasiteter eller objektlister i MVP.</p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black">Arbeidsflyt</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {workflow.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 p-3">
              <h3 className="font-black">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black">Godkjente tiltak og ansvar</h2>
        <div className="mt-3 space-y-3">
          {publicMeasures.map((measure) => (
            <article key={measure.slug} className="rounded-2xl border border-slate-200 p-3">
              <h3 className="font-black">{measure.title}</h3>
              <p className="mt-1 text-sm text-slate-700">Ansvar: {measure.responsibleAuthority}</p>
              {measure.dataWarnings.map((warning) => <p key={warning} className="mt-2 text-sm font-semibold text-amber-900">{warning}</p>)}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black">Sjekklister</h2>
        <div className="mt-3 space-y-3">
          {tilfluktsromChecklists.map((checklist) => (
            <article key={checklist.slug} className="rounded-2xl border border-slate-200 p-3">
              <h3 className="font-black">{checklist.title}</h3>
              {checklist.warning ? <p className="mt-1 text-sm font-semibold text-amber-900">{checklist.warning}</p> : null}
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {checklist.items.slice(0, 5).map((item) => <li key={item.id}>{item.label}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Tiltakskort</h2>
          <Link className="text-sm font-bold text-sky-800" href="/hurtigkort">Alle hurtigkort</Link>
        </div>
        <ActionCardList cards={tilfluktsromCards} showFilters={false} />
      </section>
    </div>
  );
}

export default function TilfluktsromModulePage() {
  return <TilfluktsromModuleContent cards={getActionCards()} checklists={getChecklists()} protectionMeasures={getProtectionMeasures()} />;
}
