'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ActionCard, ContentChangelogEntry, MustReadNotice, OperationalChecklist } from '@/lib/content/schemas';
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

function PhaseChecklistSummary({ checklists }: { checklists: OperationalChecklist[] }) {
  if (checklists.length === 0) return null;
  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Sjekkliste/workflow</p>
        <h2 className="text-2xl font-black">Fasekontroller</h2>
        <p className="mt-1 text-sm font-semibold text-slate-700">Kildebelagte sjekklister kan kjøres på lokal oppdragstavle og eksporteres uten remote sync.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {checklists.map((checklist) => (
          <article key={checklist.slug} className="rounded-2xl border border-slate-200 p-3">
            <h3 className="text-lg font-black">{checklist.title}</h3>
            {checklist.warning ? <p className="mt-1 text-sm font-semibold text-amber-900">{checklist.warning}</p> : null}
            <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
              {checklist.items.slice(0, 5).map((item) => <li key={item.id}>• {item.label}</li>)}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Kilder: {(checklist.sourceIds ?? []).join(', ')}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LatestProcedureNotice({ latestChange }: { latestChange?: ContentChangelogEntry }) {
  if (!latestChange) return null;
  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
      <p className="text-xs font-black uppercase tracking-wide">Sist oppdatert prosedyre</p>
      <h2 className="mt-1 text-xl font-black">{latestChange.title}</h2>
      <p className="mt-1 text-sm font-semibold">{latestChange.summary}</p>
      <p className="mt-2 text-xs font-bold">Dato: {latestChange.date} · Kilder: {(latestChange.sourceIds ?? []).join(', ')}</p>
    </section>
  );
}

function MustReadBeforeDeployment({ notices }: { notices: MustReadNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <p className="text-xs font-black uppercase tracking-wide">Må leses før utrykning</p>
      <div className="mt-3 space-y-3">
        {notices.map((notice) => (
          <article key={notice.id} className="rounded-2xl bg-white/70 p-3 ring-1 ring-amber-200">
            <h2 className="text-lg font-black">{notice.title}</h2>
            <p className="mt-1 text-sm font-semibold">{notice.body}</p>
            <p className="mt-2 text-xs font-bold">Alvorlighet: {notice.severity} · Oppdatert: {notice.changedAt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PhasePageContent({ phase, cards, checklists = [], latestChange, mustRead = [] }: { phase: Phase; cards: ActionCard[]; checklists?: OperationalChecklist[]; latestChange?: ContentChangelogEntry; mustRead?: MustReadNotice[] }) {
  const phaseChecklists = checklists.filter((checklist) => checklist.phase === phase);
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide">Fase</p>
        <h1 className="text-3xl font-black">{phaseLabels[phase]}</h1>
        <p className="mt-2 text-sm text-sky-100">Kildebelagte kort for {phaseLabels[phase].toLowerCase()}-fasen.</p>
      </div>
      <LatestProcedureNotice latestChange={latestChange} />
      <MustReadBeforeDeployment notices={phase === 'for' ? mustRead : []} />
      <PhaseChecklistSummary checklists={phaseChecklists} />
      <ActionCardList cards={cards} initialFilter={{ phase }} showFilters={false} />
    </div>
  );
}
