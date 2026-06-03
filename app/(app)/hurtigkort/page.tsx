import { ActionCardList } from '@/components/action-card-list';
import { SearchBox } from '@/components/search-box';
import { getActionCards, getContentManifest, getFAQEntries, getGlossaryTerms, getSourceDocuments, getTrainingPaths, getProtectionMeasures } from '@/lib/content/load-content';
import type { SearchDocument } from '@/lib/content/search';

function getSearchDocs(): SearchDocument[] {
  const cards = getActionCards();
  const sources = getSourceDocuments();
  const glossary = getGlossaryTerms();
  const training = getTrainingPaths();
  const protection = getProtectionMeasures();
  const faq = getFAQEntries();

  return [
    ...cards.map((card) => ({
      id: `kort:${card.slug}`,
      title: card.title,
      body: [...(card.steps ?? []), ...(card.safety ?? []), ...(card.reporting ?? []), card.warning ?? '', ...(card.competenceRequired ?? []), ...(card.equipmentRequired ?? [])].join(' '),
      type: 'kort',
      href: `/kort/${card.slug}`,
    })),
    ...sources.map((source) => ({
      id: `kilde:${source.id}`,
      title: source.title,
      body: source.body.slice(0, 2000),
      type: 'kilde',
      href: `/kilder/${source.id}`,
    })),
    ...glossary.map((term) => ({
      id: `ord:${term.term}`,
      title: term.term,
      body: term.definition,
      synonyms: [...(term.aliases ?? []), ...term.synonyms].join(' '),
      type: 'ord',
      href: `/hurtigkort?q=${encodeURIComponent(term.term)}`,
    })),
    ...training.map((trainingPath) => ({
      id: `opplaering:${trainingPath.slug}`,
      title: trainingPath.title,
      body: `${trainingPath.courseCode} ${trainingPath.skills.join(' ')} ${trainingPath.prerequisites.join(' ')}`,
      type: 'opplæring',
      href: '/laering',
    })),
    ...protection.map((measure) => ({
      id: `tilfluktsrom:${measure.slug}`,
      title: measure.title,
      body: `${measure.readinessChecks.join(' ')} ${measure.operationalSteps.join(' ')} ${measure.dataWarnings.join(' ')}`,
      type: 'tilfluktsrom',
      href: '/moduler/tilfluktsrom',
    })),
    ...faq.map((entry) => ({
      id: `faq:${entry.id}`,
      title: entry.question,
      body: `${entry.answer} ${entry.category} ${entry.aliases.join(' ')} ${entry.competenceCodes.join(' ')} ${entry.equipmentTerms.join(' ')}`,
      scenario: entry.scenarios.join(' '),
      role: entry.roles.join(' '),
      type: 'FAQ',
      href: `/faq#${entry.id}`,
    })),
  ];
}

export default function HurtigkortPage() {
  const cards = getActionCards();
  const manifest = getContentManifest();
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide">Operativ støtte</p>
        <h1 className="text-3xl font-black">Hurtigkort</h1>
        <p className="mt-2 text-sm text-sky-100">Kildebelagte kort med synlige advarsler. Innholdsversjon: <span data-testid="content-version">{manifest.contentVersion}</span></p>
      </section>
      <SearchBox documents={getSearchDocs()} />
      <ActionCardList cards={cards} />
    </div>
  );
}
