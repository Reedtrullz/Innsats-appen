import { ActionCardList } from '@/components/action-card-list';
import { filterActionCards } from '@/lib/content/filters';
import type { ActionCard } from '@/lib/content/schemas';
import { phaseLabels, phases, type Scenario } from '@/lib/content/taxonomy';

export interface SpecialistModuleConfig {
  title: string;
  eyebrow: string;
  summary: string;
  scenario: Scenario;
  sourceWarning: string;
}

export const specialistModuleConfigs = {
  cbrn: {
    title: 'CBRN/CBRNE',
    eyebrow: 'Spesialistmodul',
    summary: 'Hurtig tilgang til soneinndeling, rens, sikkerhet og rapportering ved kjemiske, biologiske, radiologiske, nukleære og eksplosive hendelser.',
    scenario: 'cbrn-cbrne',
    sourceWarning: 'Faglig støtte, ikke erstatning for innsatsleders ordre, lokal instruks eller fagmyndighet.',
  },
  radiac: {
    title: 'RADIAC',
    eyebrow: 'Spesialistmodul',
    summary: 'Støtte for radiologisk måletjeneste, dosekontroll, jod-/atomberedskap og strukturert rapportering.',
    scenario: 'radiac-nedfall',
    sourceWarning: 'Kontroller alltid mot gjeldende radiacbestemmelse, ordre og måleprosedyre.',
  },
  mfe: {
    title: 'MFE',
    eyebrow: 'Spesialistmodul',
    summary: 'Støtte for anmodning, mottak, oppdrag, logistikk og statusføring for mobile forsterkningsenheter.',
    scenario: 'mfe-stotte',
    sourceWarning: 'Kontroller mot gjeldende distriktets tiltakskort og oppsettende enhets føringer.',
  },
} satisfies Record<string, SpecialistModuleConfig>;

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function SpecialistModuleContent({ cards, config }: { cards: ActionCard[]; config: SpecialistModuleConfig }) {
  const moduleCards = filterActionCards(cards, { scenario: config.scenario });
  const warnings = unique(moduleCards.flatMap((card) => card.warning ? [card.warning] : []));
  const sourceIds = unique(moduleCards.flatMap((card) => card.sourceIds));
  const competence = unique(moduleCards.flatMap((card) => card.competenceRequired));

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-slate-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">{config.eyebrow}</p>
        <h1 className="text-3xl font-black">{config.title}</h1>
        <p className="mt-2 text-sm text-slate-200">{config.summary}</p>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <h2 className="text-xl font-black">Kildevarsel</h2>
        <p className="mt-2 text-sm font-semibold">{config.sourceWarning}</p>
        {warnings.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        ) : null}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-black">Kildegrunnlag og kompetanse</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 p-3">
            <h3 className="font-black">Kilder</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {sourceIds.map((sourceId) => <li key={sourceId}>{sourceId}</li>)}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 p-3">
            <h3 className="font-black">Kompetanse</h3>
            {competence.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2 text-sm text-slate-700">
                {competence.map((item) => <li key={item} className="rounded-full bg-slate-100 px-2.5 py-1 font-bold">{item}</li>)}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-700">Se tiltakskort og lokal ordre for kompetansekrav.</p>}
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black">Tiltakskort etter fase</h2>
        {phases.map((phase) => {
          const phaseCards = filterActionCards(moduleCards, { phase });
          if (phaseCards.length === 0) return null;
          return (
            <section key={phase} className="space-y-3">
              <h3 className="text-lg font-black">{phaseLabels[phase]}</h3>
              <ActionCardList cards={moduleCards} initialFilter={{ phase }} showFilters={false} />
            </section>
          );
        })}
      </section>
    </div>
  );
}
