'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { ActionCard, ContentChangelogEntry, MustReadNotice, OperationalChecklist } from '@/lib/content/schemas';
import type { CardFilter } from '@/lib/content/filters';
import { filterActionCards, sortActionCards } from '@/lib/content/filters';
import { formatSourceList } from '@/lib/content/source-titles';
import { phaseLabels, scenarioLabels, type Phase } from '@/lib/content/taxonomy';
import { PhaseTabs } from './phase-tabs';
import { RoleFilter } from './role-filter';
import { ScenarioFilter } from './scenario-filter';
import { TiltakCardFull, TiltakCardRow } from './tiltak-card';
import { WarningBanner } from './warning-banner';

export function ActionCardList({ cards, initialFilter = {}, showFilters = true }: { cards: ActionCard[]; initialFilter?: CardFilter; showFilters?: boolean }) {
  const [filter, setFilter] = useState<CardFilter>(initialFilter);
  const visibleCards = useMemo(() => sortActionCards(filterActionCards(cards, filter)), [cards, filter]);
  return (
    <section className="space-y-4">
      {showFilters ? (
        <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl text-sm font-black text-[var(--text-primary)]">
            Vis alle og filtrer
            <span aria-hidden="true">+</span>
          </summary>
          <div className="mt-3 space-y-3">
          <PhaseTabs value={filter.phase} onChange={(phase) => setFilter((current) => ({ ...current, phase }))} />
          <RoleFilter value={filter.role} onChange={(role) => setFilter((current) => ({ ...current, role }))} />
          <ScenarioFilter value={filter.scenario} onChange={(scenario) => setFilter((current) => ({ ...current, scenario }))} />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Valgte filtre: {filter.phase ? phaseLabels[filter.phase] : 'alle faser'} / {filter.scenario ? scenarioLabels[filter.scenario] : 'alle scenario'}</p>
          </div>
        </details>
      ) : null}
      {visibleCards.length === 0 ? <WarningBanner>Ingen kort matcher filteret. Prøv et annet scenario eller søk.</WarningBanner> : null}
      <div className="space-y-3">
        {visibleCards.slice(0, 8).map((card) => <TiltakCardRow key={card.slug} card={card} />)}
        {visibleCards.length > 8 ? (
          <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl text-sm font-black text-[var(--text-primary)]">
              Vis alle tiltakskort ({visibleCards.length})
              <span aria-hidden="true">+</span>
            </summary>
            <div className="mt-3 space-y-3">
              {visibleCards.slice(8).map((card) => <TiltakCardRow key={card.slug} card={card} />)}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function PhaseChecklistSummary({ checklists, sourceTitleById }: { checklists: OperationalChecklist[]; sourceTitleById?: Record<string, string> }) {
  if (checklists.length === 0) return null;
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div>
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[#38bdf8]">Sjekkliste/arbeidsflyt</p>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Fasekontroller</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">Kildebelagte sjekklister kan kjøres på lokal oppdragstavle og eksporteres manuelt uten skykobling.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {checklists.map((checklist) => (
          <article key={checklist.slug} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <h3 className="text-lg font-black text-[var(--text-primary)]">{checklist.title}</h3>
            {checklist.warning ? <p className="mt-1 text-sm font-semibold text-[var(--warning-fg)]">{checklist.warning}</p> : null}
            <ul className="mt-2 space-y-1 text-sm font-semibold text-[var(--text-secondary)]">
              {checklist.items.slice(0, 5).map((item) => <li key={item.id}>• {item.label}</li>)}
            </ul>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Kilder: {formatSourceList(checklist.sourceIds, sourceTitleById)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LatestProcedureNotice({ latestChange, sourceTitleById }: { latestChange?: ContentChangelogEntry; sourceTitleById?: Record<string, string> }) {
  if (!latestChange) return null;
  return (
    <section className="rounded-2xl border border-[#38bdf8]/30 bg-[var(--info-surface)] p-4 text-[var(--info-fg)]">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest">Sist oppdatert prosedyre</p>
      <h2 className="mt-1 text-xl font-black">{latestChange.title}</h2>
      <p className="mt-1 text-sm font-semibold">{latestChange.summary}</p>
      <p className="mt-2 text-xs font-bold">Dato: {latestChange.date} · Kilder: {formatSourceList(latestChange.sourceIds, sourceTitleById)}</p>
    </section>
  );
}

function MustReadBeforeDeployment({ notices }: { notices: MustReadNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[#fbbf24]/30 bg-[var(--warning-surface)] p-4 text-[var(--warning-fg)]">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest">Må leses før utrykning</p>
      <div className="mt-3 space-y-3">
        {notices.map((notice) => (
          <article key={notice.id} className="rounded-2xl border border-[#fbbf24]/20 bg-[var(--surface)]/60 p-3">
            <h2 className="text-lg font-black">{notice.title}</h2>
            <p className="mt-1 text-sm font-semibold">{notice.body}</p>
            <p className="mt-2 text-xs font-bold">Alvorlighet: {notice.severity} · Oppdatert: {notice.changedAt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PhasePageContent({ phase, cards, checklists = [], latestChange, mustRead = [], sourceTitleById, primaryOperationalContent }: { phase: Phase; cards: ActionCard[]; checklists?: OperationalChecklist[]; latestChange?: ContentChangelogEntry; mustRead?: MustReadNotice[]; sourceTitleById?: Record<string, string>; primaryOperationalContent?: ReactNode }) {
  const phaseChecklists = checklists.filter((checklist) => checklist.phase === phase);
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-[#082f49] p-5 text-white">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-sky-300/80">Fase</p>
        <h1 className="text-3xl font-black tracking-tight">{phaseLabels[phase]} innsats</h1>
        <p className="mt-2 text-sm font-semibold text-sky-100">Kildebelagte kort for {phaseLabels[phase].toLowerCase()} innsats.</p>
      </div>
      <LatestProcedureNotice latestChange={latestChange} sourceTitleById={sourceTitleById} />
      <MustReadBeforeDeployment notices={phase === 'for' ? mustRead : []} />
      {primaryOperationalContent}
      <PhaseChecklistSummary checklists={phaseChecklists} sourceTitleById={sourceTitleById} />
      <div className="space-y-3">
        {sortActionCards(filterActionCards(cards, { phase })).slice(0, 6).map((card) => <TiltakCardRow key={card.slug} card={card} />)}
        <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <summary className="min-h-11 cursor-pointer list-none text-sm font-black text-[var(--text-primary)]">Vis flere tiltak for fasen</summary>
          <div className="mt-3 space-y-3">
            {sortActionCards(filterActionCards(cards, { phase })).slice(6).map((card) => <TiltakCardFull key={card.slug} card={card} />)}
          </div>
        </details>
      </div>
    </div>
  );
}
