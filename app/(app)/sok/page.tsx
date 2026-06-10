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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#082F49] text-sky-100">
          <OperationalIcon name="search" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Operativt søk</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Søk i tiltak, kilder og moduler</h1>
        </div>
      </div>
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
