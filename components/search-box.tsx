'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { searchDocuments, searchIndexFreshnessLabel, suggestSearchQueries, type SearchContext, type SearchDocument, type SearchHit, type SearchSynonymGroup } from '@/lib/content/search';
import { OperationalIcon } from './ui/operational-icons';
import { StatusPill } from './ui/operational-primitives';

const LOCATION_CHANGE_EVENT = 'beredskapsboka:locationchange';
let historyEventsPatched = false;

function patchHistoryEvents() {
  if (typeof window === 'undefined' || historyEventsPatched) return;
  historyEventsPatched = true;
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method];
    window.history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      const dispatchLocationChange = () => window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(dispatchLocationChange);
      } else {
        window.setTimeout(dispatchLocationChange, 0);
      }
      return result;
    };
  }
}

function subscribeToLocationChanges(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  patchHistoryEvents();
  window.addEventListener('popstate', callback);
  window.addEventListener(LOCATION_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(LOCATION_CHANGE_EVENT, callback);
  };
}

function browserQuery(initialQuery: string) {
  if (initialQuery) return initialQuery;
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('q')?.slice(0, 120) ?? '';
}

function browserContextSnapshot() {
  if (typeof window === 'undefined') return '||';
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role')?.slice(0, 80) ?? '';
  const phase = params.get('phase')?.slice(0, 80) ?? '';
  const scenario = params.get('scenario')?.slice(0, 80) ?? '';
  return `${role}|${phase}|${scenario}`;
}

function parseContextSnapshot(snapshot: string): SearchContext {
  const [role, phase, scenario] = snapshot.split('|');
  return {
    role: role || undefined,
    phase: phase || undefined,
    scenario: scenario || undefined,
  };
}

const PHASE_FILTERS = [
  { value: 'for', label: 'Før' },
  { value: 'under', label: 'Under' },
  { value: 'etter', label: 'Etter' },
] as const;

function uniqueSorted(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, 'nb'));
}

function searchPath(basePath: string, query: string) {
  return `${basePath}?q=${encodeURIComponent(query)}`;
}

function resetSearchFiltersPath(basePath: string, query: string) {
  const trimmed = query.trim();
  return trimmed ? searchPath(basePath, trimmed) : basePath;
}

function chipClass(active: boolean) {
  return active
    ? 'inline-flex min-h-11 items-center rounded-full bg-[#082F49] px-4 py-2 text-sm font-black text-white'
    : 'inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]';
}

function termsLabel(terms: string[] | undefined) {
  const list = terms ?? [];
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  return extra > 0 ? `${shown.join(', ')} +${extra}` : shown.join(', ');
}

function typeMetadataLabel(type: string) {
  return type === 'kort' ? 'tiltakskort' : type;
}

function SearchResultRow({ doc }: { doc: SearchHit }) {
  const highPriority = doc.type === 'kort' && doc.priority === 'high';
  return (
    <Link
      className={`group block rounded-2xl border p-3 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8] ${highPriority ? 'border-[#f87171]/30 bg-[var(--critical-surface)] hover:border-[#f87171]/50' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[#38bdf8]/40 hover:bg-[var(--info-surface)]'}`}
      href={doc.href ?? '#'}
      aria-label={doc.title}
    >
      <span className="flex items-start gap-3">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${highPriority ? 'bg-[var(--critical-surface)] text-[var(--critical-fg)]' : 'bg-[var(--info-surface)] text-[var(--info-fg)]'}`}>
          <OperationalIcon name={doc.type === 'kilde' ? 'book' : doc.type === 'kort' ? 'shield' : 'document'} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black leading-5 text-[var(--text-primary)]">{doc.title}</span>
          <span className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            {highPriority ? <StatusPill label="Kritisk prioritet" tone="critical" compact /> : null}
            {doc.reviewStatus === 'pending-fagperson' ? <StatusPill label="Til faggjennomgang" tone="warning" compact /> : null}
            {doc.type ? <StatusPill label={`Type: ${typeMetadataLabel(doc.type)}`} tone="slate" compact /> : null}
            {doc.phase ? <StatusPill label={`Fase: ${doc.phase}`} tone="sky" compact /> : null}
            {doc.sourceStatus ? <StatusPill label={`Kilde: ${doc.sourceStatus}`} tone={doc.sourceStatus === 'verified' ? 'success' : 'warning'} compact /> : null}
          </span>
          {termsLabel(doc.terms) ? <span className="mt-2 block text-xs font-semibold text-[var(--text-muted)]">Søkeord: {termsLabel(doc.terms)}</span> : null}
        </span>
        <OperationalIcon name="chevron" className="mt-3 h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-fg)]" />
      </span>
    </Link>
  );
}

export function SearchBox({
  documents,
  initialQuery = '',
  externalSynonyms,
  context,
  generatedAt,
  now,
  showFreshnessIndicator = false,
  suggestionBasePath = '/hurtigkort',
  enableFilters = false,
}: {
  documents: SearchDocument[];
  externalSynonyms?: SearchSynonymGroup[];
  initialQuery?: string;
  context?: SearchContext;
  generatedAt?: string;
  now?: Date;
  showFreshnessIndicator?: boolean;
  suggestionBasePath?: string;
  enableFilters?: boolean;
}) {
  const urlQuery = useSyncExternalStore(subscribeToLocationChanges, () => browserQuery(initialQuery), () => initialQuery);
  const contextSnapshot = useSyncExternalStore(subscribeToLocationChanges, browserContextSnapshot, () => '||');
  const urlContext = useMemo(() => parseContextSnapshot(contextSnapshot), [contextSnapshot]);
  const rankingContext = context ?? urlContext;
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeSourceStatus, setActiveSourceStatus] = useState<string | null>(null);
  const query = manualQuery ?? urlQuery;
  const rawResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return searchDocuments(documents, q, rankingContext, externalSynonyms);
  }, [documents, query, rankingContext, externalSynonyms]);
  const filteredResults = useMemo(() => rawResults.filter((doc) => {
    if (activePhase && doc.phase !== activePhase) return false;
    if (activeType && doc.type !== activeType) return false;
    if (activeSourceStatus && doc.sourceStatus !== activeSourceStatus) return false;
    return true;
  }), [activePhase, activeSourceStatus, activeType, rawResults]);
  const results = useMemo(() => filteredResults.slice(0, 12), [filteredResults]);
  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q || rawResults.length > 0) return [];
    return suggestSearchQueries(q, 5, externalSynonyms);
  }, [query, rawResults.length, externalSynonyms]);
  const typeFilters = useMemo(() => uniqueSorted(documents.map((doc) => doc.type)), [documents]);
  const sourceStatusFilters = useMemo(() => uniqueSorted(documents.map((doc) => doc.sourceStatus)), [documents]);
  const hasActiveFilters = Boolean(activePhase || activeType || activeSourceStatus);
  const filtersHideResults = Boolean(query.trim() && hasActiveFilters && rawResults.length > 0 && filteredResults.length === 0);
  const resetFiltersHref = resetSearchFiltersPath(suggestionBasePath, query);
  const freshnessLabel = (showFreshnessIndicator || typeof generatedAt !== 'undefined') ? searchIndexFreshnessLabel(generatedAt, now) : null;
  const topHits = query.trim() ? results.slice(0, Math.min(3, results.length)) : [];
  const otherHits = query.trim() ? results.slice(topHits.length) : results;
  const grouped = otherHits.reduce<Record<string, SearchHit[]>>((acc, doc) => {
    const key = doc.type ?? 'resultat';
    acc[key] ??= [];
    acc[key].push(doc);
    return acc;
  }, {});
  function resetFilters() {
    setActivePhase(null);
    setActiveType(null);
    setActiveSourceStatus(null);
  }

  function resetFiltersAndPreserveQuery(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    resetFilters();
    window.history.pushState(null, '', resetFiltersHref);
  }

  const filterControls = enableFilters ? (
    <fieldset className="mt-4 space-y-3 rounded-2xl bg-[var(--surface-muted)] p-3" aria-label="Søkefiltre">
      <legend className="sr-only">Søkefiltre</legend>
      <div className="flex flex-wrap gap-2">
        {PHASE_FILTERS.map((phase) => (
          <button
            key={phase.value}
            type="button"
            className={chipClass(activePhase === phase.value)}
            aria-pressed={activePhase === phase.value}
            onClick={() => setActivePhase((current) => (current === phase.value ? null : phase.value))}
          >
            Fase: {phase.label}
          </button>
        ))}
      </div>
      {typeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((type) => (
            <button
              key={type}
              type="button"
              className={chipClass(activeType === type)}
              aria-pressed={activeType === type}
              onClick={() => setActiveType((current) => (current === type ? null : type))}
            >
              Type: {type}
            </button>
          ))}
        </div>
      ) : null}
      {sourceStatusFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sourceStatusFilters.map((status) => (
            <button
              key={status}
              type="button"
              className={chipClass(activeSourceStatus === status)}
              aria-pressed={activeSourceStatus === status}
              onClick={() => setActiveSourceStatus((current) => (current === status ? null : status))}
            >
              Kilde: {status}
            </button>
          ))}
        </div>
      ) : null}
      {hasActiveFilters ? (
        <button
          type="button"
          className="min-h-11 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-bold text-[var(--text-secondary)]"
          onClick={resetFilters}
        >
          Fjern aktive filtre
        </button>
      ) : null}
    </fieldset>
  ) : null;

  const emptyState = query && results.length === 0 ? (
    <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
      {filtersHideResults ? (
        <>
          <p className="font-semibold">{rawResults.length} treff skjult av filtre.</p>
          <Link
            className="inline-flex min-h-11 items-center rounded-full bg-[#082F49] px-4 text-sm font-black text-white"
            href={resetFiltersHref}
            onClick={resetFiltersAndPreserveQuery}
          >
            Nullstill filtre
          </Link>
        </>
      ) : (
        <p className="font-semibold">Ingen treff. Prøv et kjent fagord.</p>
      )}
      {!filtersHideResults && suggestions.length > 0 ? (
        <div>
          <p className="text-[var(--text-muted)]">Mente du:</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <Link
                  className="inline-flex min-h-11 items-center rounded-full bg-[var(--info-surface)] px-3 py-1 font-bold text-[var(--info-fg)]"
                  href={searchPath(suggestionBasePath, suggestion)}
                  onClick={() => setManualQuery(null)}
                >
                  {suggestion}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  ) : null;

  const resultsContent = (
    <div className="mt-3 space-y-3">
      {topHits.length > 0 ? (
        <div>
          <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Topptreff</h2>
          <ul className="mt-2 space-y-2">
            {topHits.map((doc) => (
              <li key={doc.id}>
                <SearchResultRow doc={doc} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {Object.entries(grouped).map(([type, docs]) => (
        <div key={type}>
          <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{topHits.length > 0 ? `Andre treff · ${type}` : type}</h2>
          <ul className="mt-2 space-y-2">
            {docs.map((doc) => (
              <li key={doc.id}>
                <SearchResultRow doc={doc} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm" aria-label="Lokalt søk">
      <label className="text-sm font-black text-[var(--text-primary)]" htmlFor="stress-search">Søk lokalt i tiltak, kilder og moduler</label>
      <div className="mt-2 flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 focus-within:border-[#38bdf8] focus-within:ring-2 focus-within:ring-[#38bdf8]/20">
        <OperationalIcon name="search" className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
        <input
          id="stress-search"
          type="search"
          value={query}
          onChange={(event) => setManualQuery(event.target.value)}
          placeholder="Prøv jod, rens, MFE, samband, dose, tilfluktsrom, FIG10"
          className="min-h-11 w-full min-w-0 border-0 bg-transparent px-1 text-base font-semibold outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>
      {freshnessLabel ? <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">{freshnessLabel}</p> : null}
      {!query ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Vanlige stressord: jod, rens, MFE, samband, dose, tilfluktsrom, FIG10.</p> : null}
      {query.trim() ? (
        <>
          {emptyState}
          {resultsContent}
          {filterControls}
        </>
      ) : (
        <>
          {filterControls}
          {resultsContent}
        </>
      )}
    </section>
  );
}
