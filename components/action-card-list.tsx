'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ActionCard } from '@/lib/content/schemas';
import type { CardFilter } from '@/lib/content/filters';
import { filterActionCards, sortActionCards } from '@/lib/content/filters';
import { phaseLabels, priorityLabels, scenarioLabels, type Phase } from '@/lib/content/taxonomy';
import { PhaseTabs } from './phase-tabs';
import { RoleFilter } from './role-filter';
import { ScenarioFilter } from './scenario-filter';
import { WarningBanner } from './warning-banner';

function CardRow({ card }: { card: ActionCard }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-900">{priorityLabels[card.priority]}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{phaseLabels[card.phase]}</span>
        {card.scenarios.map((scenario) => (
          <span key={scenario} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">{scenarioLabels[scenario]}</span>
        ))}
      </div>
      <h2 className="text-xl font-black tracking-tight"><Link href={`/kort/${card.slug}`}>{card.title}</Link></h2>
      {card.warning ? <p className="mt-2 text-sm font-medium text-amber-900">{card.warning}</p> : null}
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        {card.steps.slice(0, 3).map((step) => <li key={step}>{step}</li>)}
      </ol>
      <Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white" href={`/kort/${card.slug}`}>Åpne kort</Link>
    </article>
  );
}

export function ActionCardList({ cards, initialFilter = {}, showFilters = true }: { cards: ActionCard[]; initialFilter?: CardFilter; showFilters?: boolean }) {
  const [filter, setFilter] = useState<CardFilter>(initialFilter);
  const visibleCards = useMemo(() => sortActionCards(filterActionCards(cards, filter)), [cards, filter]);
  return (
    <section className="space-y-4">
      {showFilters ? (
        <div className="space-y-3 rounded-3xl bg-slate-100 p-3">
          <PhaseTabs value={filter.phase} onChange={(phase) => setFilter((current) => ({ ...current, phase }))} />
          <RoleFilter value={filter.role} onChange={(role) => setFilter((current) => ({ ...current, role }))} />
          <ScenarioFilter value={filter.scenario} onChange={(scenario) => setFilter((current) => ({ ...current, scenario }))} />
          <p className="text-sm font-semibold text-slate-700">Valgte filtre: {filter.phase ? phaseLabels[filter.phase] : 'alle faser'} / {filter.scenario ? scenarioLabels[filter.scenario] : 'alle scenario'}</p>
        </div>
      ) : null}
      {visibleCards.length === 0 ? <WarningBanner>Ingen kort matcher filteret. Prøv et annet scenario eller søk.</WarningBanner> : null}
      <div className="space-y-3">
        {visibleCards.map((card) => <CardRow key={card.slug} card={card} />)}
      </div>
    </section>
  );
}

export function PhasePageContent({ phase, cards }: { phase: Phase; cards: ActionCard[] }) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide">Fase</p>
        <h1 className="text-3xl font-black">{phaseLabels[phase]}</h1>
        <p className="mt-2 text-sm text-sky-100">Kildebelagte kort for {phaseLabels[phase].toLowerCase()}-fasen.</p>
      </div>
      <ActionCardList cards={cards} initialFilter={{ phase }} showFilters={false} />
    </div>
  );
}
