import { ActionCardList } from '@/components/action-card-list';
import { SearchBox } from '@/components/search-box';
import { getActionCards, getContentManifest, getFAQEntries, getGlossaryTerms, getSearchIndexGeneratedAt, getSourceDocuments, getTrainingPaths, getProtectionMeasures } from '@/lib/content/load-content';
import { buildSearchDocuments } from '@/lib/content/search-documents';

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
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide">Operativ støtte</p>
        <h1 className="text-3xl font-black">Hurtigkort</h1>
        <p className="mt-2 text-sm text-sky-100">Kildebelagte kort med synlige advarsler. Innholdsversjon: <span data-testid="content-version">{manifest.contentVersion}</span></p>
      </section>
      <SearchBox documents={searchDocuments} generatedAt={searchIndexGeneratedAt} showFreshnessIndicator />
      <ActionCardList cards={cards} />
    </div>
  );
}
