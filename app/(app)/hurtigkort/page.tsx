import { RecentCardsRow } from '@/components/recent-cards';
import { SearchBox } from '@/components/search-box';
import { TiltakCardRow } from '@/components/tiltak-card';
import { getActionCards, getChecklists, getContentManifest, getFAQEntries, getGlossaryTerms, getSearchIndexGeneratedAt, getSearchSynonyms, getSourceDocuments, getTrainingPaths, getProtectionMeasures } from '@/lib/content/load-content';
import { buildSearchDocuments } from '@/lib/content/search-documents';
import { sortActionCards } from '@/lib/content/filters';
import { formatNbDateTime } from '@/lib/formatting/format-date';
import { getWhatNextCards } from '@/lib/content/what-next-cards';

export default function HurtigkortPage() {
  const cards = getActionCards();
  const checklists = getChecklists();
  const glossary = getGlossaryTerms();
  const training = getTrainingPaths();
  const protection = getProtectionMeasures();
  const faq = getFAQEntries();
  const sources = getSourceDocuments();
  const synonyms = getSearchSynonyms();
  const searchDocuments = buildSearchDocuments({
    queryBasePath: '/sok',
    cards,
    checklists,
    sources,
    glossary,
    training,
    protection,
    faq,
    searchSynonyms: synonyms,
  });
  const manifest = getContentManifest();
  const searchIndexGeneratedAt = getSearchIndexGeneratedAt();
  const sortedCards = sortActionCards(cards);
  const whatNextCards = getWhatNextCards(cards, { limit: 6 });
  const criticalCards = sortedCards.filter((card) => card.priority === 'high').slice(0, 4);
  const relevantCards = sortedCards.filter((card) => card.priority !== 'high').slice(0, 6);
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-sky-950 p-5 text-white shadow-sm">
        <h1 className="text-3xl font-black">Hurtigkort</h1>
        <p className="mt-1 text-sm font-semibold text-sky-100">Hurtigkort er nå samlet i Søk. Denne adressen beholdes for gamle lenker og offline-bruk.</p>
        <a href="/sok?intent=action" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-sky-300 px-4 text-sm font-black text-sky-950">Åpne nye Søk</a>
        <p className="mt-3 text-xs font-bold text-sky-200">Innhold oppdatert: <span data-testid="content-version">{formatNbDateTime(manifest.contentVersion)}</span></p>
      </section>
      <SearchBox documents={searchDocuments} externalSynonyms={synonyms} generatedAt={searchIndexGeneratedAt} showFreshnessIndicator suggestionBasePath="/sok" initialIntent="action" />
      <RecentCardsRow cards={sortedCards} />

      {whatNextCards.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4" aria-labelledby="hurtigkort-what-next-heading">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-800">Stresskort</p>
            <h2 id="hurtigkort-what-next-heading" className="text-xl font-black text-slate-950">Hva nå?</h2>
            <p className="mt-1 text-sm font-semibold text-slate-700">Kort for de første tiltakene når situasjonen endrer seg eller neste handling er uklar.</p>
          </div>
          <div className="space-y-2">
            {whatNextCards.map((card) => <TiltakCardRow key={card.slug} card={card} />)}
          </div>
        </section>
      ) : null}

      {criticalCards.length > 0 ? (
        <section className="space-y-3" aria-labelledby="hurtigkort-critical-heading">
          <h2 id="hurtigkort-critical-heading" className="text-xl font-black text-slate-950">Kritiske tiltak</h2>
          <div className="space-y-2">
            {criticalCards.map((card) => <TiltakCardRow key={card.slug} card={card} />)}
          </div>
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="hurtigkort-relevant-heading">
        <h2 id="hurtigkort-relevant-heading" className="text-xl font-black text-slate-950">Mest relevant / høy prioritet</h2>
        <div className="space-y-2">
          {relevantCards.map((card) => <TiltakCardRow key={card.slug} card={card} />)}
        </div>
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">Vis alle og filtrer</summary>
        <div className="mt-3 space-y-2">
          {sortedCards.map((card) => <TiltakCardRow key={card.slug} card={card} />)}
        </div>
      </details>
    </div>
  );
}
