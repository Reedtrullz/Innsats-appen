import { SearchBox } from '@/components/search-box';
import { OperationalIcon } from '@/components/ui/operational-icons';
import { getActionCards, getChecklists, getFAQEntries, getGlossaryTerms, getSearchIndexGeneratedAt, getSearchSynonyms, getSourceDocuments, getTrainingPaths, getProtectionMeasures } from '@/lib/content/load-content';
import { buildSearchDocuments } from '@/lib/content/search-documents';

export default function SokPage() {
  const synonyms = getSearchSynonyms();
  const searchDocuments = buildSearchDocuments({
    queryBasePath: '/sok',
    cards: getActionCards(),
    checklists: getChecklists(),
    sources: getSourceDocuments(),
    glossary: getGlossaryTerms(),
    training: getTrainingPaths(),
    protection: getProtectionMeasures(),
    faq: getFAQEntries(),
    searchSynonyms: synonyms,
  });
  const searchIndexGeneratedAt = getSearchIndexGeneratedAt();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#082F49] text-sky-100">
          <OperationalIcon name="search" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent-fg)]">Operativt søk</p>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Søk i tiltak, kilder og moduler</h1>
        </div>
      </div>
      <SearchBox
        documents={searchDocuments}
        generatedAt={searchIndexGeneratedAt}
        externalSynonyms={synonyms}
        showFreshnessIndicator
        enableFilters
        suggestionBasePath="/sok"
      />
    </div>
  );
}
