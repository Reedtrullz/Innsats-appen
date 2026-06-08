'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { searchDocuments, searchIndexFreshnessLabel, suggestSearchQueries, type SearchContext, type SearchDocument, type SearchHit } from '@/lib/content/search';
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
    : 'inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50';
}

function termsLabel(terms: string[] | undefined) {
  return (terms ?? []).slice(0, 6).join(', ');
}

function typeMetadataLabel(type: string) {
  return type === 'kort' ? 'tiltakskort' : type;
}

function SearchResultRow({ doc }: { doc: SearchHit }) {
  const highPriority = doc.type === 'kort' && doc.priority === 'high';
  return (
    <Link
      className={`group block rounded-2xl border p-3 text-slate-900 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49] ${highPriority ? 'border-red-200 bg-red-50/60 hover:border-red-300 hover:bg-red-50' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50'}`}
      href={doc.href ?? '#'}
      aria-label={doc.title}
    >
      <span className="flex items-start gap-3">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${highPriority ? 'bg-red-100 text-red-700' : 'bg-sky-50 text-sky-800'}`}>
          <OperationalIcon name={doc.type === 'kilde' ? 'book' : doc.type === 'kort' ? 'shield' : 'document'} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black leading-5 text-slate-950">{doc.title}</span>
          <span className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-slate-600">
            {highPriority ? <StatusPill label="Kritisk prioritet" tone="critical" compact /> : null}
            {doc.type ? <StatusPill label={`Type: ${typeMetadataLabel(doc.type)}`} tone="slate" compact /> : null}
            {doc.phase ? <StatusPill label={`Fase: ${doc.phase}`} tone="sky" compact /> : null}
            {doc.sourceStatus ? <StatusPill label={`Kilde: ${doc.sourceStatus}`} tone={doc.sourceStatus === 'verified' ? 'success' : 'warning'} compact /> : null}
          </span>
          {termsLabel(doc.terms) ? <span className="mt-2 block text-xs font-semibold text-slate-500">Søkeord: {termsLabel(doc.terms)}</span> : null}
        </span>
        <OperationalIcon name="chevron" className="mt-3 h-4 w-4 shrink-0 text-slate-400 group-hover:text-sky-800" />
      </span>
    </Link>
  );
}

export function SearchBox({
  documents,
  initialQuery = '',
  context,
  generatedAt,
  now,
  showFreshnessIndicator = false,
  suggestionBasePath = '/hurtigkort',
  enableFilters = false,
}: {
  documents: SearchDocument[];
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
    return searchDocuments(documents, q, rankingContext);
  }, [documents, query, rankingContext]);
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
    return suggestSearchQueries(q, 5);
  }, [query, rawResults.length]);
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
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Lokalt søk">
      <label className="text-sm font-black text-slate-800" htmlFor="stress-search">Søk lokalt i tiltak, kilder og moduler</label>
      <div className="mt-2 flex min-h-12 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 focus-within:border-sky-700 focus-within:ring-2 focus-within:ring-sky-100">
        <OperationalIcon name="search" className="h-5 w-5 shrink-0 text-slate-500" />
        <input
          id="stress-search"
          type="search"
          value={query}
          onChange={(event) => setManualQuery(event.target.value)}
          placeholder="Prøv jod, rens, MFE, samband, dose, tilfluktsrom, FIG10"
          className="min-h-11 w-full min-w-0 border-0 bg-transparent px-1 text-base font-semibold outline-none placeholder:text-slate-400"
        />
      </div>
      {freshnessLabel ? <p className="mt-2 text-xs font-semibold text-slate-600">{freshnessLabel}</p> : null}
      {!query ? <p className="mt-3 text-sm text-slate-600">Vanlige stressord: jod, rens, MFE, samband, dose, tilfluktsrom, FIG10.</p> : null}
      {enableFilters ? (
        <fieldset className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
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
              className="min-h-11 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              onClick={resetFilters}
            >
              Fjern aktive filtre
            </button>
          ) : null}
        </fieldset>
      ) : null}
      {query && results.length === 0 ? (
        <div className="mt-3 space-y-2 text-sm text-slate-700">
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
              <p className="text-slate-600">Mente du:</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <Link
                      className="inline-flex min-h-11 items-center rounded-full bg-sky-50 px-3 py-1 font-bold text-sky-900"
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
      ) : null}
      <div className="mt-3 space-y-3">
        {topHits.length > 0 ? (
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Topptreff</h2>
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
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">{topHits.length > 0 ? `Andre treff · ${type}` : type}</h2>
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
    </section>
  );
}
