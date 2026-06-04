import { SearchBox } from '@/components/search-box';
import { getActionCards, getFAQEntries, getGlossaryTerms, getSearchIndexGeneratedAt, getSourceDocuments, getTrainingPaths, getProtectionMeasures } from '@/lib/content/load-content';
import { buildSearchDocuments } from '@/lib/content/search-documents';

export default function SokPage() {
  const searchDocuments = buildSearchDocuments({
    queryBasePath: '/sok',
    cards: getActionCards(),
    sources: getSourceDocuments(),
    glossary: getGlossaryTerms(),
    training: getTrainingPaths(),
    protection: getProtectionMeasures(),
    faq: getFAQEntries(),
  });
  const searchIndexGeneratedAt = getSearchIndexGeneratedAt();

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide">Operativt søk</p>
        <h1 className="text-3xl font-black">Søk i tiltak, kilder og moduler</h1>
        <p className="mt-2 text-sm text-sky-100">Filtrer lokale treff etter fase, type og kildestatus.</p>
      </section>
      <SearchBox
        documents={searchDocuments}
        generatedAt={searchIndexGeneratedAt}
        showFreshnessIndicator
        enableFilters
        suggestionBasePath="/sok"
      />
    </div>
  );
}
