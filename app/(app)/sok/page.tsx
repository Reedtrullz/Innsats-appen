import { SearchBox } from '@/components/search-box';
import { OperationalIcon } from '@/components/ui/operational-icons';
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
      <section className="rounded-2xl bg-[#082F49] p-5 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <OperationalIcon name="search" className="h-6 w-6 text-sky-100" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-200">Operativt søk</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Søk i tiltak, kilder og moduler</h1>
            <p className="mt-2 text-sm font-semibold text-sky-100">Filtrer lokale treff etter fase, type og kildestatus.</p>
          </div>
        </div>
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
