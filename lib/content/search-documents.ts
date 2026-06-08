import type { SearchDocument } from './search';
import { sourceFreshness } from './source-review';
import type { ActionCard, FAQEntry, GlossaryTerm, ProtectionMeasure, SourceDocument, TrainingPath } from './schemas';

export interface BuildSearchDocumentsInput {
  queryBasePath?: '/hurtigkort' | '/sok';
  cards: ActionCard[];
  sources: SourceDocument[];
  glossary: GlossaryTerm[];
  training: TrainingPath[];
  protection: ProtectionMeasure[];
  faq: FAQEntry[];
}

const PROBLEM_SOURCE_STATUSES = ['expired', 'draft', 'unverified', 'historical'] as const;

function joinSearchText(parts: Array<string | string[] | undefined>) {
  return parts.flatMap((part) => (Array.isArray(part) ? part : [part ?? ''])).join(' ').trim();
}

function sourceSearchStatus(source: SourceDocument): SourceDocument['status'] {
  const freshness = sourceFreshness(source);
  if (freshness.state === 'expired') return 'expired';
  if (freshness.state !== 'current') return PROBLEM_SOURCE_STATUSES.includes(source.status as typeof PROBLEM_SOURCE_STATUSES[number]) ? source.status : 'unverified';
  return source.status;
}

function sourceStatusFor(sourceIds: string[] | undefined, sourcesById: Map<string, SourceDocument>) {
  const ids = sourceIds ?? [];
  const statuses = ids
    .map((sourceId) => {
      const source = sourcesById.get(sourceId);
      return source ? sourceSearchStatus(source) : 'unverified';
    })
    .filter((status): status is SourceDocument['status'] => Boolean(status));

  return PROBLEM_SOURCE_STATUSES.find((status) => statuses.includes(status)) ?? statuses[0];
}

export function buildSearchDocuments({
  queryBasePath = '/hurtigkort',
  cards,
  sources,
  glossary,
  training,
  protection,
  faq,
}: BuildSearchDocumentsInput): SearchDocument[] {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));

  return [
    ...cards.map<SearchDocument>((card) => ({
      id: `kort:${card.slug}`,
      title: card.title,
      body: joinSearchText([card.steps, card.safety, card.reporting, card.warning, card.competenceRequired, card.equipmentRequired]),
      scenario: card.scenarios.join(' '),
      role: card.roles.join(' '),
      phase: card.phase,
      type: 'kort',
      href: `/kort/${card.slug}`,
      sourceStatus: sourceStatusFor(card.sourceIds, sourcesById),
      sourceIds: card.sourceIds,
      priority: card.priority,
    })),
    ...sources
      .filter((source) => source.pilotReviewStatus !== 'rejected-for-pilot')
      .map<SearchDocument>((source) => ({
        id: `kilde:${source.id}`,
        title: source.title,
        body: joinSearchText([
          source.publicationStatus === 'approved-public' ? source.body.slice(0, 5000) : '',
          source.warnings,
        ]),
        type: 'kilde',
        href: `/kilder/${source.id}`,
        sourceStatus: sourceSearchStatus(source),
        sourceIds: [source.id],
      })),
    ...glossary.map<SearchDocument>((term) => ({
      id: `ord:${term.term.toLowerCase()}`,
      title: term.term,
      body: term.definition,
      synonyms: [...(term.aliases ?? []), ...term.synonyms].join(' '),
      type: 'ord',
      href: `${queryBasePath}?q=${encodeURIComponent(term.term)}`,
      sourceStatus: sourceStatusFor(term.sourceIds, sourcesById),
      sourceIds: term.sourceIds,
    })),
    ...training.map<SearchDocument>((trainingPath) => ({
      id: `opplaering:${trainingPath.slug}`,
      title: trainingPath.title,
      body: `${trainingPath.courseCode} ${trainingPath.skills.join(' ')} ${trainingPath.prerequisites.join(' ')}`,
      role: trainingPath.targetRoles.join(' '),
      type: 'opplæring',
      href: '/laering',
      sourceStatus: sourceStatusFor(trainingPath.sourceIds, sourcesById),
      sourceIds: trainingPath.sourceIds,
    })),
    ...protection.map<SearchDocument>((measure) => ({
      id: `tilfluktsrom:${measure.slug}`,
      title: measure.title,
      body: `${measure.readinessChecks.join(' ')} ${measure.operationalSteps.join(' ')} ${measure.dataWarnings.join(' ')}`,
      type: 'tilfluktsrom',
      href: '/moduler/tilfluktsrom',
      sourceStatus: sourceStatusFor(measure.sourceIds, sourcesById),
      sourceIds: measure.sourceIds,
    })),
    ...faq.filter((entry) => entry.status === 'approved').map<SearchDocument>((entry) => ({
      id: `faq:${entry.id}`,
      title: entry.question,
      body: `${entry.answer} ${entry.category} ${entry.aliases.join(' ')} ${entry.competenceCodes.join(' ')} ${entry.equipmentTerms.join(' ')}`,
      scenario: entry.scenarios.join(' '),
      role: entry.roles.join(' '),
      type: 'FAQ',
      href: `/faq#${entry.id}`,
      sourceStatus: sourceStatusFor(entry.sourceIds, sourcesById),
      sourceIds: entry.sourceIds,
    })),
  ];
}
