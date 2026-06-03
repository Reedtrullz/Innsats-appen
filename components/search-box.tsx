'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import type { SearchDocument } from '@/lib/content/search';

function matches(doc: SearchDocument, query: string) {
  const haystack = [doc.title, doc.body, doc.scenario, doc.role, doc.synonyms, doc.type].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

const LOCATION_CHANGE_EVENT = 'beredskapsboka:locationchange';
let historyEventsPatched = false;

function patchHistoryEvents() {
  if (typeof window === 'undefined' || historyEventsPatched) return;
  historyEventsPatched = true;
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method];
    window.history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
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

export function SearchBox({ documents, initialQuery = '' }: { documents: SearchDocument[]; initialQuery?: string }) {
  const urlQuery = useSyncExternalStore(subscribeToLocationChanges, () => browserQuery(initialQuery), () => initialQuery);
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const query = manualQuery ?? urlQuery;
  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return documents.filter((doc) => matches(doc, q)).slice(0, 12);
  }, [documents, query]);
  const grouped = results.reduce<Record<string, SearchDocument[]>>((acc, doc) => {
    const key = doc.type ?? 'resultat';
    acc[key] ??= [];
    acc[key].push(doc);
    return acc;
  }, {});
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm" aria-label="Lokalt søk">
      <label className="text-sm font-bold text-slate-700" htmlFor="stress-search">Søk lokalt</label>
      <input
        id="stress-search"
        type="search"
        value={query}
        onChange={(event) => setManualQuery(event.target.value)}
        placeholder="Prøv jod, rens, MFE, samband, dose, tilfluktsrom, FIG10"
        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 px-4 text-base"
      />
      {!query ? <p className="mt-3 text-sm text-slate-600">Vanlige stressord: jod, rens, MFE, samband, dose, tilfluktsrom, FIG10.</p> : null}
      {query && results.length === 0 ? <p className="mt-3 text-sm font-semibold text-slate-700">Ingen treff. Prøv et kjent fagord.</p> : null}
      <div className="mt-3 space-y-3">
        {Object.entries(grouped).map(([type, docs]) => (
          <div key={type}>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">{type}</h2>
            <ul className="mt-2 space-y-2">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <Link className="block rounded-2xl bg-slate-50 p-3 font-semibold text-slate-900" href={doc.href ?? '#'}>{doc.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
