'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { searchDocuments, searchIndexFreshnessLabel, suggestSearchQueries, type SearchContext, type SearchDocument, type SearchHit } from '@/lib/content/search';

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

function chipClass(active: boolean) {
  return active
    ? 'rounded-full bg-sky-900 px-3 py-2 text-sm font-bold text-white'
    : 'rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-200';
}

function termsLabel(terms: string[] | undefined) {
  return (terms ?? []).slice(0, 6).join(', ');
}

function typeMetadataLabel(type: string) {
  return type === 'kort' ? 'tiltak' : type;
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
  const results = useMemo(() => rawResults.filter((doc) => {
    if (activePhase && doc.phase !== activePhase) return false;
    if (activeType && doc.type !== activeType) return false;
    if (activeSourceStatus && doc.sourceStatus !== activeSourceStatus) return false;
    return true;
  }).slice(0, 12), [activePhase, activeSourceStatus, activeType, rawResults]);
  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q || rawResults.length > 0) return [];
    return suggestSearchQueries(q, 5);
  }, [query, rawResults.length]);
  const typeFilters = useMemo(() => uniqueSorted(documents.map((doc) => doc.type)), [documents]);
  const sourceStatusFilters = useMemo(() => uniqueSorted(documents.map((doc) => doc.sourceStatus)), [documents]);
  const hasActiveFilters = Boolean(activePhase || activeType || activeSourceStatus);
  const freshnessLabel = (showFreshnessIndicator || typeof generatedAt !== 'undefined') ? searchIndexFreshnessLabel(generatedAt, now) : null;
  const grouped = results.reduce<Record<string, SearchHit[]>>((acc, doc) => {
    const key = doc.type ?? 'resultat';
    acc[key] ??= [];
    acc[key].push(doc);
    return acc;
  }, {});
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm" aria-label="Lokalt søk">
      <label className="text-sm font-bold text-slate-700" htmlFor="stress-search">Søk lokalt i tiltak, kilder og moduler</label>
      <input
        id="stress-search"
        type="search"
        value={query}
        onChange={(event) => setManualQuery(event.target.value)}
        placeholder="Prøv jod, rens, MFE, samband, dose, tilfluktsrom, FIG10"
        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 px-4 text-base"
      />
      {freshnessLabel ? <p className="mt-2 text-xs font-semibold text-slate-600">{freshnessLabel}</p> : null}
      {!query ? <p className="mt-3 text-sm text-slate-600">Vanlige stressord: jod, rens, MFE, samband, dose, tilfluktsrom, FIG10.</p> : null}
      {enableFilters ? (
        <fieldset className="mt-4 space-y-3">
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
              className="rounded-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
              onClick={() => {
                setActivePhase(null);
                setActiveType(null);
                setActiveSourceStatus(null);
              }}
            >
              Nullstill filtre
            </button>
          ) : null}
        </fieldset>
      ) : null}
      {query && results.length === 0 ? (
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold">Ingen treff. Prøv et kjent fagord.</p>
          {suggestions.length > 0 ? (
            <div>
              <p className="text-slate-600">Mente du:</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <Link
                      className="rounded-full bg-sky-50 px-3 py-1 font-bold text-sky-900"
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
        {Object.entries(grouped).map(([type, docs]) => (
          <div key={type}>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">{type}</h2>
            <ul className="mt-2 space-y-2">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <Link className="block rounded-2xl bg-slate-50 p-3 text-slate-900" href={doc.href ?? '#'} aria-label={doc.title}>
                    <span className="block font-semibold">{doc.title}</span>
                    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-600">
                      {termsLabel(doc.terms) ? <span>Søkeord: {termsLabel(doc.terms)}</span> : null}
                      {doc.phase ? <span>Fase: {doc.phase}</span> : null}
                      {doc.type ? <span>Type: {typeMetadataLabel(doc.type)}</span> : null}
                      {doc.sourceStatus ? <span>Kilde: {doc.sourceStatus}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
