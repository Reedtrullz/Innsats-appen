import { SearchBox } from '@/components/search-box';
import { TiltakCardRow } from '@/components/tiltak-card';
import { getActionCards, getContentManifest, getFAQEntries, getGlossaryTerms, getSearchIndexGeneratedAt, getSourceDocuments, getTrainingPaths, getProtectionMeasures } from '@/lib/content/load-content';
import { buildSearchDocuments } from '@/lib/content/search-documents';
import { sortActionCards } from '@/lib/content/filters';

export default function HurtigkortPage() {
  const cards = getActionCards();
  const sources = getSourceDocuments();
  const searchDocuments = buildSearchDocuments({
    queryBasePath: '/hurtigkort',
    cards,
    sources,
    glossary: getGlossaryTerms(),
    training: getTrainingPaths(),
    protection: getProtectionMeasures(),
    faq: getFAQEntries(),
  });
  const manifest = getContentManifest();
  const searchIndexGeneratedAt = getSearchIndexGeneratedAt();
  const sortedCards = sortActionCards(cards);
  const criticalCards = sortedCards.filter((card) => card.priority === 'high').slice(0, 4);
  const relevantCards = sortedCards.filter((card) => card.priority !== 'high').slice(0, 6);
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-sky-950 p-5 text-white shadow-sm">
        <h1 className="text-3xl font-black">Hurtigkort</h1>
        <p className="mt-1 text-sm font-semibold text-sky-100">Søk først. Bla kompakt når du ikke vet nøyaktig hva du trenger.</p>
        <p className="mt-3 text-xs font-bold text-sky-200">Innhold: <span data-testid="content-version">{manifest.contentVersion}</span></p>
      </section>
      <SearchBox documents={searchDocuments} generatedAt={searchIndexGeneratedAt} showFreshnessIndicator />

      {criticalCards.length > 0 ? (
        <section className="space-y-3" aria-labelledby="hurtigkort-critical-heading">
          <h2 id="hurtigkort-critical-heading" className="text-xl font-black text-slate-950">Kritisk nå</h2>
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
